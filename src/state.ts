import { Eff, Impure, Pure, Chain } from './index';
import { absurd } from './types';


export type State<S> = Get<S>|Set<S>|Modify<S>;

 
function modify<S>(proj: (x: S) => S): Eff<Modify<S>, void> {
  return Eff.impure(new Modify(proj));
}

function patch<S>(patch: Partial<S>): Eff<Modify<S>, void> {
  // @ts-ignore
  return Eff.impure(new Modify(x => ({ ...x, ...patch })));
}

export function get<I>(): Eff<Get<I>, I> {
  return Eff.impure(new Get());
}

export function set<Out>(out: Out): Eff<Set<Out>, void> {
  return Eff.impure(new Set(out));
}

export function bindState<S>() {
  return { get, set, modify, patch } as {
    get(): Eff<Get<S>, S>;
    set(next: S): Eff<Set<S>, void>;
    modify(proj: (x: S) => S): Eff<Modify<S>, void>;
    patch(p: Partial<S>): Eff<Modify<S>, void>;
  };
}

export function runState<S>(get: () => S, set: (x: S) => void, modify: (proj: (x: S) => S) => void): <U, A>(eff: Eff<U, A>) => Eff<Exclude<U, State<any>>, A> {
  return effect => {
    if (effect instanceof Pure) {
      return effect as any;
    }
    
    if (effect instanceof Impure) {
      if (effect._value instanceof Get) {
        return Eff.of(get());
      }
      if (effect._value instanceof Set) {
        set(effect._value._value);
        return Eff.of(void 0);
      }
      if (effect._value instanceof Modify) {
        modify(effect._value._proj);
        return Eff.of(void 0);
      }
      return effect;
    }
    
    if (effect instanceof Chain) {
      const first = runState(get, set, modify)(effect.first);
      return first.chain(a => runState(get, set, modify)(effect.andThen(a)));
    }
    
    return absurd(effect);
  }
}

export interface Statics {
  get: typeof get;
  set: typeof set;
  modify: typeof modify;
  patch: typeof patch;
  bindState: typeof bindState;
}

export const State = {
  get, set, modify, patch, bindState
} as Statics;


export class Get<S> {
  readonly _A: S;
}

export class Set<S> {
  readonly _A: void;
  constructor(
    readonly _value: S,
  ) {}
}

export class Modify<S> {
  readonly _A: void;
  constructor(
    readonly _proj: (x: S) => S,
  ) {}
}

