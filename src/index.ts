import { Expr, absurd } from './types';


interface URI2HKT<U, L, A> {
}

type TC1<A = any> = URI2HKT<any, any, A>[keyof URI2HKT<any, any, A>];
type TC2<L = any, A = any> = URI2HKT<any, L, A>[keyof URI2HKT<any, L, A>];
type TC3<U = any, L = any, A = any> = URI2HKT<U, L, A>[keyof URI2HKT<U, L, A>];

type URI = keyof URI2HKT<any, any, any>;

type T1<U extends URI, A> = URI2HKT<any, any, A>[U];
type T2<U extends URI, L, A> = URI2HKT<any, L, A>[U];
type T3<U extends URI, Z, L, A> = URI2HKT<Z, L, A>[U];


type TA<T, A>
  // @ts-ignore
  = T extends { _URI: infer U; _L: infer L; } ? URI2HKT<any, L, A>[U]
  // @ts-ignore
  : T extends { _URI: infer U; } ? URI2HKT<any, any, A>[U]
  : never
;

type T01 = TA<Get<number, Date>, string>;
type T02 = TA<Pure<0>, string>;
type T03 = TA<T01|Chain<78>, string>;


// export type Eff<U extends URIS|URIS2|URIS3|URIS4, A> =
//   | Type<U, A>
// ;


export abstract class Eff<A> {
  readonly _A: A;
  // readonly _L: any;
  // readonly _U: never;
  
  map<B, T>(this: T, proj: (x: A) => B): TA<T, B>|Chain<B> {
    // @ts-ignore
    return this.chain(x => of(proj(x)));
  }

  mapTo<B, T extends TC1>(this: T, value: B) {
    return this.chainTo(of(value));
  }

  chain<T, TB extends TC1>(this: T, then: (x: A) => TB): TA<T, TB['_A']>|TB|Chain<TB['_A']> {
    return new Chain(this as any, then);
  }
  
  chainTo<T, TB extends TC1>(this: T, value: TB): TA<T, TB['_A']>|TB|Chain<TB['_A']> {
    return new Chain(this as any, () => value);
  }
}


export function of<A extends Expr>(value: A): Pure<A>;
export function of<A>(value: A): Pure<A>;
export function of<A>(value: A): Pure<A> {
  return new Pure(value);
}


export class Pure<A> extends Eff<A> {
  readonly _URI: 'Pure';
  
  constructor(
    readonly _value: A,
  ) { super() }
}

export class Get<S, A> extends Eff<A> {
  readonly _URI: 'Get';
  readonly _L: S;
}

export class Set<S, A> extends Eff<A> {
  readonly _URI: 'Get';
  readonly _L: S;
  
  constructor(
    readonly _value: S,
  ) { super() }
}

export class Chain<A> extends Eff<A> {  
  readonly _URI: 'Chain';
  
  constructor(
    readonly _first: TC1<unknown>,
    readonly _then: (x: unknown) => TC1<A>,
  ) { super() }    
}


interface URI2HKT<U, L, A> {
  Pure: Pure<A>;
  Chain: Chain<A>;
  Get: Get<L, A>;
  Set: Set<L, A>;
}

export interface Statics {
  of: typeof of;
  Pure: typeof Pure;
}


const x00 = new Pure(1);
const x01 = new Pure(10).map(String);
const x02 = x01
  .chain(x => new Pure(true))
  .chain(x => new Get<number, Date>())
  .chain(x => new Set<Date, string>(new Date()))
