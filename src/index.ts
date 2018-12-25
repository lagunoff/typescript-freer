import { Expr, absurd } from './types';


export type Eff<U, A> = 
  | Pure<U, A>
  | Impure<U, A>
  | Chain<U, A>
;
export type EffAny = Eff<any, any>;

export abstract class EffBase<U, A> {
  readonly _U: U;
  readonly _A: A;
  
  map<B>(proj: (x: A) => B): Eff<U, B> {
    //    return new Apply([this as any as FreerAny], proj);
    return this.chain(x => of(proj(x)));
  }

  mapTo<B>(value: B): Eff<U, B> {
    return this.chainTo(of(value));
  }

  chain<B>(f: (x: A) => Eff<U, B>): Eff<U, B>;
  chain<B, U2>(f: (x: A) => Eff<U2, B>): Eff<U|U2, B>;
  chain<B>(f: (x: A) => Eff<U, B>): Eff<U, B> {
    return new Chain(this as any, f);
  }  

  chainTo<B>(value: Eff<U, B>): Eff<U, B>;
  chainTo<B, U2>(value: Eff<U2, B>): Eff<U|U2, B>;
  chainTo<B>(value: Eff<U, B>): Eff<U, B> {
    return new Chain(this as any, () => value);
  }
}



export function of<A extends Expr>(value: A): Pure<never, A>;
export function of<A>(value: A): Pure<never, A>;
export function of<A>(value: A): Pure<never, A> {
  return new Pure(value);
}


// @ts-ignore
export function impure<M>(value: M): Impure<M, M['_A']> {
  return new Impure(value);
}


export function runEff<A>(effect: Eff<never, A>): A {
  if (effect instanceof Pure) {
    return effect._value;
  }
  
  if (effect instanceof Impure) {
    return absurd(effect._value);
  }
  
  if (effect instanceof Chain) {
    return runEff(effect.andThen(runEff(effect.first)));
  }
  
  return absurd(effect);  
}

export class Pure<U, A> extends EffBase<U, A> {
  readonly __tag__pure__: void;
  
  constructor(
    readonly _value: A,
  ) { super() }

  castU<U2>(): Pure<U2, A> {
    return this as any;
  }
}

export class Impure<U, A> extends EffBase<U, A> {  
  readonly __tag__impure__: void;
  
  constructor(
    readonly _value: U,
  ) { super() }  
}

export class Chain<U, A, X=any> extends EffBase<U, A> {  
  readonly __tag__chain__: void;
  
  constructor(
    readonly first: Eff<U, X>,
    readonly andThen: (x: X) => Eff<U, A>,
  ) { super() }    
}

export interface Statics {
  of: typeof of;
  impure: typeof impure;
  Pure: typeof Pure;
}

export const Eff = {
  of, Pure, impure,
} as Statics;
