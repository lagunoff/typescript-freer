import { Eff, Pure, Chain, Eff } from './index';
import { absurd } from './types';


export class IO<A = any> extends Eff<IO, A> {
  static runIO = runIO;
  static create = create;
  
  readonly _A: A;
  
  constructor(
    readonly _io: () => A,
  ) { super(); }
}

function create<A>(io: () => A): Eff<IO, A> {
  return new IO(io);
}

export function runIO<A>(eff: Eff<IO, A>): A {   
  if (eff instanceof Pure) {
    return eff._value;
  }
 
  if (eff instanceof Chain) {
    return runIO(eff._then(runIO(eff._first)));
  }
  
  if (eff instanceof IO) {
    return eff._io();
  }
  
  return absurd(eff);
}

const runIO2: <A>(eff: Eff<IO, A>) => A = eff =>
  eff instanceof Pure ? eff._value
  : eff instanceof Chain ? runIO(eff._then(runIO(eff._first)))
  : eff instanceof IO ? eff._io()
  : absurd(eff);
