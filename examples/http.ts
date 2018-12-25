import { Async, ToAsync, Observable, Canceller, AsyncEffect } from '../src/async';
import { Either } from '../src/either';
import { Failure } from '../src/failure';
import { Impure, Eff } from '../src/index';


// HTTP method
export type Method = 'GET'|'POST'|'PUT'|'DELETE'|'PATCH';


// Request
export interface Request {
  url: string;
  method: Method;
  body?: any;
  headers?: Record<string, string|number|undefined|null>;
  withCredentials?: boolean;
  timeout?: number;
}


// Raw error
export type HttpError =
  | { tag: 'BadUrl', desc: string }
  | { tag: 'Timeout' }
  | { tag: 'NetworkError' }


// Responce
export interface Response {
  url: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}


// Query params
export type ParamsPrimitive = number|string|undefined|null;
export type Params = Record<string, ParamsPrimitive|ParamsPrimitive[]>;

export type HttpEffect<A> = Eff<Async|Failure<HttpError>, A>;


/** General effect construtor */
export function sendE(req: Request): AsyncEffect<Either<HttpError, Response>>  {
  return new Impure(new HttpToAsync(req));
}


/** General effect construtor */
export function send(req: Request): HttpEffect<Response>  {
  return sendE(req).handleError();
}


/** Shortcut for GET requests */
export function get(url: string, request?: Omit<Request, 'url'|'method'>): HttpEffect<Response> {
  return send({ ...request, method: 'GET', url });
}

export function getE(url: string, request?: Omit<Request, 'url'|'method'>): AsyncEffect<Either<HttpError, Response>> {
  return sendE({ ...request, method: 'GET', url });
}


/** Shortcut for POST requests */
export function post(url: string, body: Request['body'], request?: Omit<Request, 'url'|'method'|'body'>): HttpEffect<Response> {
  return send({ ...request, method: 'POST', url, body });
}

export function postE(url: string, body: Request['body'], request?: Omit<Request, 'url'|'method'|'body'>): AsyncEffect<Either<HttpError, Response>> {
  return sendE({ ...request, method: 'POST', url, body });
}


/**
 * Do actual request
 */
export function doXHR(req: Request, onNext: (x: Either<HttpError, Response>) => void, onComplete: () => void): Canceller {
  const onSuccess = (x: Response) => (onNext(Either.right(x)), onComplete());
  const onFailure = (x: HttpError) => (onNext(Either.left(x)), onComplete());
  
  const xhr = new XMLHttpRequest();
  xhr.addEventListener('error', () => onFailure({ tag: 'NetworkError' }));
  xhr.addEventListener('timeout', () => onFailure({ tag: 'Timeout' }));
  xhr.addEventListener('load', () => onSuccess({
    url: xhr.responseURL,
    status: xhr.status,
    statusText: xhr.statusText,
    headers: parseHeaders(xhr.getAllResponseHeaders()),
    body: xhr.response || xhr.responseText,
  }));
  try {
    xhr.open(req.method, req.url, true);
  } catch (e) {
    onFailure({ tag: 'BadUrl', desc: req.url });
  }

  // if ('progress' in req && req.progress) {
  //   xhr.addEventListener('progress', e => onProgress(e.lengthComputable ? { tag: 'Computable', loaded: e.loaded, total: e.total } : { tag: 'Uncomputable' }));
  // }
  if (req.timeout) xhr.timeout = req.timeout;
  if (typeof (req.withCredentials) !== 'undefined') xhr.withCredentials = req.withCredentials;
  if (typeof (req.headers) !== 'undefined') {
    for (let key in req.headers) {
      if (!req.headers.hasOwnProperty(key)) continue;
      const value = req.headers[key];
      if (typeof(value) !== 'undefined' && value !== null)
        xhr.setRequestHeader(key, String(value));
    }
  }
  const body = Object.prototype.toString.apply(req.body) === '[object Object]' ? JSON.stringify(req.body) : req.body;
  xhr.send(body);
  return () => xhr.abort();
}


// Parse headers from string to a `Record<string, string>`
function parseHeaders(rawHeaders: string): Record<string, string> {
  const output = {};
  const lines = rawHeaders.split('\r\n');
  for (let i in lines) {
    const index = lines[i].indexOf(': ');
    if (index < 0) continue;
    const key = lines[i].substring(0, index);
    const value = lines[i].substring(index + 2);
    output[key] = value;
  }
  return output;
}


/**
 * Build an url. Redundant slashes will be trimmed from both ends
 * ```ts
 * const hostname = 'http://example.com/';
 * const url = http.join(hostname, '/shop', '/items.json', { offset: 0, limit: 20, sort: 'date' });
 * console.log(url); // => http://example.com/shop/items.json?offset=0&limit=20&sort=date
 * ```
 */
export function join(...args: Array<string|Params>): string {
  let path = '';
  let params = {} as Record<string, string>;
  let query = '';

  for (let i in args) {
    const arg = args[i];
    if (typeof (arg) === 'string') path = joinTwo(path, arg);
    else Object.assign(params, arg);
  }

  for (let key in params) {
    if (!params.hasOwnProperty(key) || typeof(params[key]) === 'undefined' || params[key] === null) continue;
    if (Array.isArray(params[key])) {
      for (const v of params[key]) {
        if (typeof(params[key]) === 'undefined' || params[key] === null) continue;
        query += (query ? '&' : '') + `${encodeURIComponent(key)}=${encodeURIComponent(v)}`;
      }
    } else {
      query += (query ? '&' : '') + `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`;
    }
  }

  return query ? (path + '?' + query) : path;
  
  // Join segments of url
  function joinTwo(a: string, b: string): string {
    if (a === '') return b;
    if (b === '') return a;
    const trailing = a.length && a[a.length - 1] === '/';
    const leading = b.length && b[0] === '/';
    if (trailing && leading) return a.substring(0, a.length - 1) + b;
    if (!trailing && !leading) return a + '/' + b;
    return a + b;
  }
}


// Distinct effect instead of constructing `Observable` right away, so
// we can inspect `request` later on
export class HttpToAsync extends ToAsync<Either<HttpError, Response>> {
  constructor(
    readonly request: Request,
  ) { super(); };

  toAsync() {
    return new Observable<Either<HttpError, Response>>((onNext, onComplete) => doXHR(this.request, onNext, onComplete));
  }
}


// Helper
export type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;


// @ts-ignore nodejs support
if (typeof XMLHttpRequest === 'undefined') global.XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
