import { Eff, Impure, Pure, Chain } from './index';
import { absurd } from './types';

export class Put<Out> {
  readonly _A: void;
  constructor(
    readonly _out: Out,
  ) {}
}

export function runWriter<O>(cb: (out: O) => void): <U, A>(eff: Eff<U, A>) => Eff<Exclude<U, Put<O>>, A> {
  return effect => {
    if (effect instanceof Pure) {
      return effect as any;
    }
    
    if (effect instanceof Impure) {
      if (effect._value instanceof Put) {
        cb(effect._value._out);
        return Eff.of(void 0);
      }
      return effect;
    }
    
    if (effect instanceof Chain) {
      const first = runWriter(cb)(effect._first);
      return first.chain(a => runWriter(cb)(effect._andThen(a)));
    }
    
    return absurd(effect);
  }
}

export function put<Out>(out: Out): Eff<Put<Out>, void> {
  return Eff.impure(new Put(out));
}

export interface Statics {
  put: typeof put;
}

export const Writer = {
  put,
} as Statics;
