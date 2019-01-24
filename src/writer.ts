import { Eff, Pure, Chain, Eff, toEffBase } from './index';
import { absurd } from './types';

export class Put<Out> extends Eff<Put<Out>, void> {
  readonly _A: void;
  constructor(
    readonly _out: Out,
  ) { super(); }
}

export function runWriter<O>(cb: (out: O) => void): <U, A>(eff: Eff<U, A>) => Eff<Exclude<U, Put<O>>, A> {
  return effect => {
    if (effect instanceof Pure) {
      return effect as any;
    }
    
    if (effect instanceof Chain) {
      const first = runWriter(cb)(effect._first);
      return toEffBase(first).chain(a => runWriter(cb)(effect._then(a)));
    }
    
    if (effect instanceof Put) {
      cb(effect._out);
      return Eff.of(void 0);
    }
    
    return effect;
  }
}

export function put<Out>(out: Out): Eff<Put<Out>, void> {
  return new Put(out);
}

export interface Statics {
  put: typeof put;
}

export const Writer = {
  put,
} as Statics;
