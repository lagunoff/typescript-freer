import { Eff, Impure, Pure, Chain } from './index';
import { absurd } from './types';


export class IO<A = any> {
  static runIO = runIO;
  static create = create;
  
  readonly _A: A;
  
  constructor(
    readonly _io: () => A,
  ) {}
}

function create<A>(io: () => A): Eff<IO, A> {
  return Eff.impure(new IO(io));
}

export function runIO<A>(eff: Eff<IO, A>): A {
  if (eff instanceof Pure) {
    return eff._value;
  }
 
  if (eff instanceof Impure) {
    return eff._value._io();
  }
  
  if (eff instanceof Chain) {
    return runIO(eff.andThen(runIO(eff.first)));
  }
  
  return absurd(eff);
}

