import { Interpreter, skip } from './index';

export class Ask<A> {
  readonly _A: A;
}

export function runReader<A>(ask: () => A): Interpreter<A> {
  return eff => {
    if (eff instanceof Ask) return ask();
    return skip;
  }
}
