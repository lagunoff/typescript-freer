import { Eff, EffBase, Impure, Pure, Chain } from './index';
import { Either } from './either';
import { absurd } from './types';


export class Failure<Err> {
  static create = create;
  static runError = runFailure;
  
  readonly _A: never;
  
  constructor(
    readonly _error: Err,
  ) {}
}


export function runFailure<E, A, U>(eff: Eff<Failure<E>|U, A>): Eff<Exclude<U, Failure<any>>, Either<E, A>> {
  if (eff instanceof Pure) {
    return Eff.of(Either.of(eff._value));
  }
  
  if (eff instanceof Impure) {
    if (eff._value instanceof Failure) {
      return Eff.of(Either.failure(eff._value._error));
    }
    return eff.map(Either.of) as any;
  }
  
  if (eff instanceof Chain) {
    const first = runFailure(eff.first);
    // @ts-ignore
    return new Chain(first, ethr => ethr.fold(() => Eff.of(ethr), val => runFailure(eff.andThen(val))));
  }
  
  return absurd(eff);
}

function create<E>(error: E): Eff<Failure<E>, never> {
  return Eff.impure(new Failure(error));
}


declare module "./" {
  interface EffBase<U, A> {
    handleError<L, R>(this: Eff<U, Either<L, R>>): Eff<Failure<L>|U, R>;
  }
}

EffBase.prototype.handleError = function() {
  return this.chain(ethr => ethr.fold<any>(Failure.create, Eff.of))
};
