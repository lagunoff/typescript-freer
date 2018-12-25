import { Expr, absurd } from './types';


// Either
export type Either<L,R> =
  | Left<L, R>
  | Right<L, R>
  ;


// Base class for instance methods
export class EitherBase<L,R> {
  readonly _L: L;
  readonly _R: R;

  // tag(): typeof Left<L, R>|typeof Right<L, R> {
    
  // }

  map<R2>(f: (val: R) => R2): Either<L,R2> {
    const self = this as any as Either<L,R>;
    if (self instanceof Left) return self as any;
    if (self instanceof Right) return new Right(f(self.value));
    return absurd(self);
  }

  mapTo<R2>(value: R2): Either<L,R2> {
    return this.map(() => value);
  }
  
  mapLeft<L2>(f: (val: L) => L2): Either<L2,R> {
    const self = this as any as Either<L,R>;
    if (self instanceof Left) return new Left(f(self.value));
    if (self instanceof Right) return self as any;
    return absurd(self);
  }
  
  mapLeftTo<L2>(value: L2): Either<L2,R> {
    return this.mapLeft(() => value);
  }
  
  bimap<L2,R2>(f1: (val: L) => L2, f2: (x: R) => R2): Either<L2,R2> {
    const self = this as any as Either<L,R>;
    if (self instanceof Left) return new Left(f1(self.value));
    if (self instanceof Right) return new Right(f2(self.value));
    return absurd(self);
  }

  chain<R2>(f: (val: R) => Either<L,R2>): Either<L,R2>;
  chain<L2,R2>(f: (val: R) => Either<L2,R2>): Either<L|L2,R2>;
  chain<R2>(f: (val: R) => Either<L,R2>): Either<L,R2> {
    const self = this as any as Either<L,R>;
    if (self instanceof Left) return self as any;
    if (self instanceof Right) return f(self.value);
    return absurd(self);
  }
  
  chainTo<R2>(value: Either<L,R2>): Either<L,R2>;
  chainTo<L2,R2>(value: Either<L2,R2>): Either<L|L2,R2>;
  chainTo<R2>(value: Either<L,R2>): Either<L,R2> {
    return this.chain(() => value);    
  }

  fold<T>(f1: (x: L) => T, f2: (x: R) => T): T;
  fold<T1,T2>(f1: (x: L) => T1, f2: (x: R) => T2): T1|T2;
  fold<T1,T2>(f1: (x: L) => T1, f2: (x: R) => T2): T1|T2 {
    const self = this as any as Either<L,R>;
    if (self instanceof Left) return f1(self.value);
    if (self instanceof Right) return f2(self.value);
    return absurd(self);
  }

  onError(onFailure: (value: L) => Either<L,R>): Either<L,R> {
    const self = this as any as Either<L,R>;
    if (self instanceof Left) return onFailure(self.value);
    if (self instanceof Right) return self;
    return absurd(self);
  }
  
  onErrorTo(value: Either<L,R>): Either<L,R> {
    return this.onError(() => value);        
  }

  toNullable(): R|null {
    const self = this as any as Either<L,R>;
    if (self instanceof Left) return null;
    if (self instanceof Right) return self.value;
    return absurd(self);
  }

  isRight(): this is Right<R,L> { return this instanceof Right; }
  isLeft(): this is Left<L,R> { return this instanceof Left; }
}



export class Left<L,R> extends EitherBase<L,R> { 
  constructor(
    readonly value: L,
  ) { super(); }
}

export class Right<L,R> extends EitherBase<L,R>  { 
  constructor(
    readonly value: R,
  ) { super(); }
}


/** aliases */
export function failure<L extends Expr>(value: L): Either<L, never> { return new Left(value); }
export function success<R extends Expr>(value: R): Either<never, R> { return new Right(value); }
export function left<L extends Expr>(value: L): Either<L, never> { return new Left(value); }
export function right<R extends Expr>(value: R): Either<never, R> { return new Right(value); }


/** alias for `right` */
export function of<A extends Expr>(value: A): Either<never, A> {
  return new Right(value);
}



/** apply pure function with multiple arguments */
export function ap<L,A,B>(a: Either<L,A>, f: (a: A) => B): Either<L,B>;
export function ap<L,A,B,C>(a: Either<L,A>, b: Either<L,B>, f: (a: A, b: B) => C): Either<L,C>;
export function ap<L,A,B,C,D>(a: Either<L,A>, b: Either<L,B>, c: Either<L,C>, f: (a: A, b: B, c: C) => D): Either<L,D>;
export function ap<L,A,B,C,D,E>(a: Either<L,A>, b: Either<L,B>, c: Either<L,C>, d: Either<L,D>, f: (a: A, b: B, c: C, d: D) => E): Either<L,E>;
export function ap<L,A,B,C,D,E,F>(a: Either<L,A>, b: Either<L,B>, c: Either<L,C>, d: Either<L,D>, e: Either<L,E>, f: (a: A, b: B, c: C, d: D, e: E) => F): Either<L,F>;
export function ap<L,A,B,C,D,E,F,G>(a: Either<L,A>, b: Either<L,B>, c: Either<L,C>, d: Either<L,D>, e: Either<L,E>, f_: Either<L,F>, f: (a: A, b: B, c: C, d: D, e: E, f: F) => G): Either<L,G>;
export function ap(...args: Array<Either<any, any> | Function>): Either<any, any> {
  const func = args[args.length - 1] as Function;
  const results: Array<any> = [];
  for (let i = 0; i < args.length - 1; i++) {
    const ethr = args[i] as Either<any, any>;
    if (ethr instanceof Left) return ethr;
    if (ethr instanceof Right) { results.push(ethr.value); break; } 
    absurd(ethr);
  }
  return new Right(func.apply(undefined, results));
}


/** traverse an array */
export function traverse<L,A,B>(arr: Either<L, A>[]): Either<L,A[]>;
export function traverse<L,A,B>(arr: Array<A>, f: (a: A, idx: number) => Either<L,B>): Either<L,B[]>;
export function traverse<L,A,B>(arr: Array<unknown>, f?: Function): Either<L,unknown[]> {
  const output = [] as B[];
  for (let i = 0; i < arr.length; i++) {
    const ethr: Either<L, any> = f ? f(arr[i], i) : arr[i];
    if (ethr instanceof Left) return ethr;
    ensureRight(ethr);
    output.push(ethr.value);
  }
  return new Right(output);
}


export const Either = {
  Left, Right, failure, success, left, right, of, ap, traverse, 
};


function ensureRight<L, R>(x: Right<L, R>) {}
