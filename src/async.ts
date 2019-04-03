import * as either from './either';
import { absurd } from './types';
import { Interpreter, InterpreterResult, Continuation, skip } from './index';


// Type for `Async`
export type Async<A = unknown> =
  | Pure<A>       // { _value: A }
  | Observable<A> // { _subscribe: Subscribe<A> }
  | Batch<A>      // { _steps: Async<A>[] }
  | Concat<A>     // { _steps: Async<A>[] }
  | Apply<A>      // { _args: Async<any>[], _proj(...args): A }
  | Chain<A>      // { _first: Async<any>, _then(x: unknown): Async<A> }
;

// Types for subscription handling
export type Canceller = () => void;
export type Consumer<A> = (a: A) => void;
export type Subscribe<A> = (cb: Consumer<A>, completed: () => void) => Canceller;

// Instance methods for `Async`
export class AsyncBase<A> {
  readonly _A: A;

  map<B>(this: Async<A>, proj: (a: A) => B): Async<B> {
    return new Apply([this], proj);
  }

  mapTo<B>(this: Async<A>, value: B): Async<B> {
    return this.map(() => value);
  }

  chain<B>(this: Async<A>, then: (a: A) => Async<B>): Async<B> {
    return new Chain(this, then);
  }

  chainTo<B>(this: Async<A>, then: Async<B>): Async<B> {
    return new Chain(this, () => then);
  }
}

export function of<A>(value: A): Async<A> {
  return new Pure(value);
}

export function subscribe<A>(subscribe: Subscribe<A>): Observable<A> {
  return new Observable(subscribe);
}

export function ap<A,B>(a: Async<A>, f: (a: A) => B): Async<B>;
export function ap<A,B,C>(a: Async<A>, b: Async<B>, f: (a: A, b: B) => C): Async<C>;
export function ap<A,B,C,D>(a: Async<A>, b: Async<B>, c: Async<C>, f: (a: A, b: B, c: C) => D): Async<D>;
export function ap<A,B,C,D,E>(a: Async<A>, b: Async<B>, c: Async<C>, d: Async<D>, f: (a: A, b: B, c: C, d: D) => E): Async<E>;
export function ap<A,B,C,D,E,F>(a: Async<A>, b: Async<B>, c: Async<C>, d: Async<D>, e: Async<E>, f: (a: A, b: B, c: C, d: D, e: E) => F): Async<F>;
export function ap<A,B,C,D,E,F,G>(a: Async<A>, b: Async<B>, c: Async<C>, d: Async<D>, e: Async<E>, f_: Async<F>, f: (a: A, b: B, c: C, d: D, e: E, f: F) => G): Async<G>;
export function ap(): Async<unknown> {
  const args = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
  const proj = arguments[arguments.length - 1];
  return new Apply(args, proj);
}

export function tuple<T extends any[]>(...args: { [K in keyof T]: Async<T[K]> }): Async<T> {
  return new Apply<any>(args, (...values) => values);
}

export function record<R>(fields: { [K in keyof R]: Async<R[K]> }): Async<R> {
  const keys = Object.keys(fields);
  return new Apply(keys.map(k => fields[k]), (...values) => values.reduce((acc, v, idx) => (acc[keys[idx]] = v, acc), {}));
}

// Traverse an array
export function traverse<A, B>(array: A[], f: (a: A, idx: number) => Async<B>): Async<B[]> {
  if (array.length === 0) return of([]);
  return new Apply(array.map(f), (...args) => args);
}

// Perform several `Async`s in parallel
export function batch<Args extends Async<any>[]>(...steps: Args): Batch<Args[number]['_A']>;
export function batch<Args extends Async<any>[]>(steps: Args): Batch<Args[number]['_A']>;
export function batch(): Batch<any> {
  const steps = Array.isArray(arguments[0]) ? arguments[0] : arguments;
  return new Batch(steps);
}

// Perform several `Async`s in sequence
export function concat<Args extends Async<any>[]>(...steps: Args): Concat<Args[number]['_A']>;
export function concat<Args extends Async<any>[]>(steps: Args): Concat<Args[number]['_A']>;
export function concat(): Concat<any> {
  const steps = Array.isArray(arguments[0]) ? arguments[0] : arguments;
  return new Concat(steps);
}

export function runAsync<A>(effect: any): InterpreterResult<A> {
  if (isAsync(effect)) {
    return new Continuation(cb => {
      let result: any = undefined;
      go(effect)(a => result = a, () => cb(result));
    });
  }
  return skip;
}

export function isAsync(effect: any): effect is Async<any> {
  return effect instanceof Pure || effect instanceof Observable || effect instanceof Batch || effect instanceof Concat || effect instanceof Apply || effect instanceof Chain;
}

// Perform side effects
export function go<A>(asyn: Async<A>): Subscribe<A> {
  return (onNext, onComplete) => {
    if (asyn instanceof Pure) {
      onNext(asyn._value);
      onComplete();
      return noopFunc;
    }

    if (asyn instanceof Observable) {
      return asyn._subscribe(onNext, onComplete);
    }

    if (asyn instanceof Batch) {
      if (asyn._steps.length === 0) { onComplete(); return noopFunc; }
      let cancellers: Array<Function|undefined>;
      const loop = idx => () => {
        cancellers[idx] = undefined;
        for (const canceller of cancellers) if (canceller) return;
        onComplete(); // If control flow reaches here, that means all nested processes are completed
      };
      cancellers = Array.prototype.map.call(asyn._steps, (eff, idx) => go(eff)(onNext, loop(idx)));
      
      return () => cancellers.forEach(canceller => canceller && canceller());
    }

    if (asyn instanceof Concat) {
      let canceller: Function|undefined = undefined;
      const loop = idx => () => {
        // If condition holds, then all nested effects are completed, therefore we're done
        if (idx >= asyn._steps.length) { onComplete(); return; }
        canceller = go(asyn._steps[idx])(onNext, loop(idx + 1));
      };
      loop(0);
      return () => canceller && canceller();
    }
    
    if (asyn instanceof Chain) {
      const cancellers: Array<Function|undefined> = [];
      cancellers.push(go(asyn._first)(result => {
        const idx = cancellers.length;
        cancellers.push(go(asyn._then(result))(onNext, () => {
          cancellers[idx] = undefined;
          for (const canceller of cancellers) if (canceller) return;
          onComplete();          
        }));
      }, () => {
        cancellers[0] = undefined;
        for (const canceller of cancellers) if (canceller) return;
        onComplete();
      }));
      
      return () => cancellers.forEach(canceller => canceller && canceller());
    }
    
    if (asyn instanceof Apply) {
      let allInitialized = false;
      let cancellers: Array<Function|undefined>;
      const initializedFlags: Array<true|undefined> = new Array(asyn._args.length);
      const recentValues: unknown[] = new Array(asyn._args.length);
      const next = idx => result => {
        recentValues[idx] = result;
        check_initialized: {
          if (allInitialized) break check_initialized;
          initializedFlags[idx] = true;
          for (const flag of initializedFlags) if (flag !== true) return;
          allInitialized = true;
        }
        onNext(asyn._proj.apply(void 0, recentValues));
      };
      const complete = idx => () => {
        cancellers[idx] = undefined;
        for (const canceller of cancellers) if (canceller) return;
        onComplete();
      };      
      cancellers = asyn._args.map((eff, idx) => go(eff)(next(idx), complete(idx)));
      return () => cancellers.forEach(canceller => canceller && canceller());
    }         

    return absurd(asyn);
  }
}

export class Pure<A> extends AsyncBase<A> {
  constructor(
    readonly _value: A,
  ) { super(); }
}

export class Observable<A> extends AsyncBase<A> {
  constructor(
    readonly _subscribe: Subscribe<A>,
  ) { super(); }
}

export class Batch<A> extends AsyncBase<A> {
  constructor(
    readonly _steps: ArrayLike<Async<A>>,
  ) { super(); }
}

export class Concat<A> extends AsyncBase<A> {
  constructor(
    readonly _steps: ArrayLike<Async<A>>,
  ) { super(); }
}

export class Apply<A> extends AsyncBase<A> {
  constructor(
    readonly _args: Async<unknown>[],
    readonly _proj: (...args) => A
  ) { super(); }
}

export class Chain<A> extends AsyncBase<A> {
  constructor(
    readonly _first: Async<unknown>,
    readonly _then: (x: unknown) => Async<A>
  ) { super(); }
}

// Complete immediately after start, don't produce any output
export const noop: Async<never> = new Batch([]);

// Statics
export interface Statics {
  of: typeof of;
  ap: typeof ap;
  record: typeof record;
  batch: typeof batch;
  concat: typeof concat;
  go: typeof go;
  subscribe: typeof subscribe;
  noop: typeof noop;
}

// Statics
export const Async: Statics = {
  of,
  ap,
  record,
  batch,
  concat,
  go,
  noop,
  subscribe,
};

// Functional helpers
const noopFunc = () => {};
