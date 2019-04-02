import { skip, Interpreter } from './index';

export class Put<A> {
  readonly _A: A;
  constructor(
    readonly _output: A,
  ) {}
}

export function runWriter<A>(cb: (output: A) => void): Interpreter<void> {
  return effect => {
    if (effect instanceof Put) {
      cb(effect._output);
      return;
    }
    return skip;
  }
}

export function put<A>(output: A): Put<A> {
  return new Put(output);
}

export interface Statics {
  put: typeof put;
}

export const Writer = {
  put,
} as Statics;
