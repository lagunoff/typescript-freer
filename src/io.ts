import { InterpreterResult, skip } from './index';


export class IO<A = unknown> {
  static runIO = runIO;
  static create = create;
  readonly _A: A;
  
  constructor(
    readonly _io: (...args) => A,
    readonly _args: any[],
  ) {}
}

function create<Args extends any[], Result>(io: (...args: Args) => Result, ...args: Args): IO<Result> {
  return new IO(io, args);
}

export function runIO<A>(effect: any): InterpreterResult<A> {
  if (effect instanceof IO) {
    return effect._io.apply(void 0, effect._args);
  }
  return skip;
}

