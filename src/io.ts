import { InterpreterResult, skip } from './index';


export class IO<A> {
  static runIO = runIO;
  static create = create;
  readonly _A: A;
  
  constructor(
    readonly _io: () => A,
  ) {}
}

function create<A>(io: () => A): IO<A> {
  return new IO(io);
}

export function runIO<A>(effect: any): InterpreterResult<A> {
  if (effect instanceof IO) {
    return effect._io();
  }
  return skip;
}

