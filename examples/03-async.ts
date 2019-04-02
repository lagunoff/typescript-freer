import { Eff } from '../src/index';
import * as http from './http';
import '../src/burrido';
import { runFailure } from '../src/either';
import { runAsync } from '../src/async';

// https://api.random.org/json-rpc/1/basic
function randomOrgInts(n: number, min: number, max: number): http.HttpEffect<number[]> {
  return http.send({
    url: 'https://api.random.org/json-rpc/1/invoke',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { 'jsonrpc': '2.0', 'method': 'generateIntegers', 'params': { n, min, max, 'apiKey': '8e5b7dd6-fe16-41f1-842d-57481c2777b0' }, 'id': 42 }
  }).map(response => {
    const json = JSON.parse(response.body);
    return json.result.random.data;
  });
}

const eff01 = Eff.Do(function *() {
  const first: number[] = yield randomOrgInts(1, 0, 10);
  const second: number[] = yield randomOrgInts(1, 0, 10);
  const third: number[] = yield randomOrgInts(1, 0, 10);
  return [...first, ...second, ...third];
});

const eff02 = runFailure(eff01); // Eliminate `Failure` from `U` parameter
const subscribe = runAsync(eff02); // Eliminate `Async` from `U` parameter
subscribe(console.log, () => console.log('completed'));
