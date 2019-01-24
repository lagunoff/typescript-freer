import { Eff, Pure, Chain, Eff, toEffBase } from './index';
import { absurd } from './types';


export type State<S> = Get<S>|Set<S>|Modify<S>;

 
function modify<S>(proj: (x: S) => S): Eff<Modify<S>, void> {
  return new Modify(proj);
}

function patch<S>(patch: Partial<S>): Eff<Modify<S>, void> {
  return new Modify(x => ({ ...x, ...patch }));
}

export function get<I>(): Eff<Get<I>, I> {
  return new Get();
}

export function set<Out>(out: Out): Eff<Set<Out>, void> {
  return new Set(out);
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
    
    if (effect instanceof Chain) {
      const first = runState(get, set, modify)(effect._first);
      return toEffBase(first).chain(a => runState(get, set, modify)(effect._then(a)));
    }
    
    if (effect instanceof Get) {
      return Eff.of(get());
    }
    
    if (effect instanceof Set) {
      set(effect._value);
      return Eff.of(void 0);
    }
    
    if (effect instanceof Modify) {
      modify(effect._proj);
      return Eff.of(void 0);
    }    
    
    return effect;
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


export class Get<S> extends Eff<Get<S>, S> {
  readonly _A: S;
}

export class Set<S> extends Eff<Set<S>, void> {
  readonly _A: void;
  constructor(
    readonly _value: S,
  ) { super(); }
}

export class Modify<S> extends Eff<Modify<S>, void> {
  readonly _A: void;
  constructor(
    readonly _proj: (x: S) => S,
  ) { super(); }
}

