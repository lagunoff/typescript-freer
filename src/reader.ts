import { Eff, Impure, Pure, Chain } from './index';
import { absurd } from './types';

export class Ask<I> {
  readonly _A: I;
  readonly __tag__ask__: void;
}

export function runReader<I>(read: () => I): <U, A>(eff: Eff<U, A>) => Eff<Exclude<U, Ask<I>>, A> {
  return eff => {
    if (eff instanceof Pure) {
      return eff as any;
    }
    
    if (eff instanceof Impure) {
      if (eff._value instanceof Ask) {
        return Eff.of(read());
      }
      return eff;
    }
    
    if (eff instanceof Chain) {
      const first = runReader(read)(eff.first);
      return first.chain(a => runReader(read)(eff.andThen(a)));
    }
    
    return absurd(eff);
  }
}

function ask<I>(): Eff<Ask<I>, I> {
  return new Impure(new Ask());
}

export interface Statics {
  ask: typeof ask;
  runReader: typeof runReader;
}

export const Reader = {
  ask, runReader,
} as Statics;
