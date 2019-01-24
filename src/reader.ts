import { Eff, Pure, Chain, Eff, toEffBase } from './index';
import { absurd } from './types';

export class Ask<I> extends Eff<Ask<I>, I> {
  readonly _A: I;
  readonly __tag__ask__: void;
}

export function runReader<I>(read: () => I): <U, A>(eff: Eff<U, A>) => Eff<Exclude<U, Ask<I>>, A> {
  return eff => {
    if (eff instanceof Pure) {
      return eff as any;
    }
    
    if (eff instanceof Chain) {
      const first = runReader(read)(eff._first);
      return toEffBase(first).chain(a => runReader(read)(eff._then(a)));
    }
    
    if (eff instanceof Ask) {
      return Eff.of(read());
    }
    return eff;
  }
}

function ask<I>(): Eff<Ask<I>, I> {
  return new Ask();
}

export interface Statics {
  ask: typeof ask;
  runReader: typeof runReader;
}

export const Reader = {
  ask, runReader,
} as Statics;
