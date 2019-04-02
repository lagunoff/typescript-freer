import { skip, Interpreter } from './index';
import { absurd } from './types';


export type State<S> = Get<S>|Set<S>;

 
function* modify<S>(proj: (x: S) => S): IterableIterator<State<S>> {
  const prev = yield get<S>();
  yield set(proj(prev));
}

function* patch<S>(patch: Partial<S>): IterableIterator<State<S>> {
  const prev = yield get<S>();
  yield set({ ...prev, ...patch });
}

export function get<S>() {
  return new Get<S>();
}

export function set<S>(value: S): Set<S> {
  return new Set(value);
}

export function runState<S>(ask: () => S, put: (x: S) => void): Interpreter<any> {
  return effect => {
    if (effect instanceof Get) return ask();
    if (effect instanceof Set) return put(effect._value);
    return skip;
  }
}

export interface Statics {
  get: typeof get;
  set: typeof set;
  modify: typeof modify;
  patch: typeof patch;
}

export const State = {
  get, set, modify, patch
} as Statics;


export class Get<S> {
  readonly _S: S;
}

export class Set<S> {
  readonly _S: void;
  constructor(
    readonly _value: S,
  ) {}
}
