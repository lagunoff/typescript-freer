import { Eff, Pure, Chain, EffAny, Eff } from './index';
import { IO } from './io';
import { Failure } from './failure';
import { Either } from './either';
import { absurd, Expr } from './types';


export type Async<A = any> =
  | Observable<A>
  | ToAsync<A>
;


export type Canceller = () => void;
export type Consumer<A> = (x: A) => void;
export type Subscribe<A> = (next: Consumer<A>, completed: () => void) => Canceller;


export function runAsync<A>(effect: Eff<Async|IO, A>): Subscribe<A> {
  return (onNext, onComplete) => {
    if (effect instanceof Pure) {
      onNext(effect._value);
      onComplete();
      return noopFunc;
    }
    
    if (effect instanceof Chain) {
      const cancellers = new Map<EffAny, Canceller|null>();
      
      const handleEffect = (e: EffAny) => {
        cancellers.set(e, null);
        const _onNext = result => {
          if (e === effect._first) handleEffect(effect._then(result));
          else onNext(result);
        };
        const _onComplete = () => {
          cancellers.delete(e);
          if (cancellers.size === 0) onComplete();          
        };
        
        const canceller = runAsync(e)(_onNext, _onComplete);
        if (cancellers.has(e)) cancellers.set(e, canceller);
      };

      handleEffect(effect._first);
      if (cancellers.size === 0) return noopFunc;
      
      return () => cancellers.forEach(canceller => canceller && canceller());
    }
    
    if (effect instanceof Observable) {
      return effect._subscribe(onNext, onComplete);
    }
    
    if (effect instanceof ToAsync) {
      return runAsync(effect.toAsync())(onNext, onComplete);
    }
    
    if (effect instanceof IO) {
      onNext(effect._io());
      onComplete();
      return noopFunc;
    }
    
    return absurd(effect);
  };
}

function create<A>(subscribe: Subscribe<A>): Eff<Async, A> {
  return new Observable(subscribe);
}

function createE<L, R>(subscribe: Subscribe<Either<L, R>>): Eff<Failure<L>|Async, R> {
  return create(subscribe).handleError();
}

export namespace Subscribe {
  export function of<A extends Expr>(value: A): Subscribe<A> {
    return (next, complete) => (next(value), complete(), noopFunc);
  }

  export function lazy<F extends (...args) => any>(func: F, ...args: Parameters<F>): Subscribe<ReturnType<F>> {
    return (next, complete) => (next(func.apply(void 0, args)), complete(), noopFunc);
  }
}

export class Observable<A = any> extends Eff<Async, A> {
  readonly _A: A;
  
  constructor(
    readonly _subscribe: Subscribe<A>,
  ) { super(); }
}

export abstract class ToAsync<A = any> extends Eff<Async, A> {
  readonly _A: A;
  abstract toAsync(): Async<A>;
}
export interface Statics {
  createE: typeof createE;
  create: typeof create;
}

export const Async = {
  create, createE
} as Statics;


function noopFunc() {}
