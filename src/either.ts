import { Chain, InterpreterResult, skip } from './index';

export type EitherImpl = {
  injL<A>(value: A): any;
  injR<A>(value: A): any;
  fold<L, R, A>(ethr: any, projL: (value: L) => A, projR: (value: R) => A): A,
};

export class HandleEither<A> {
  static handleEither = handleEither;
  static runEither = runEither;
  readonly _A: A;
  
  constructor(
    readonly _value: A,
    readonly _eitherImpl: EitherImpl,
  ) {}
}

export function runEither<A>(effect: any): InterpreterResult<A> {
  if (effect instanceof HandleEither) {
    return new Chain(effect._value, ethr => {
      // TODO;
    });
  }
  return skip;
}

function handleEither<E>(either: EitherImpl, effect: E): HandleEither<E> {
  return new HandleEither(effect, either);
}
