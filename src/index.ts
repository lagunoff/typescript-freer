export type InterpreterResult<A> =
  | A
  | Skip
  | Done<A>
  | Continuation<A>
  | Chain<A>
;

// 
export class Continuation<A> {
  constructor(
    readonly wait: (cb: (a: A) => void) => void,
  ) {}
}

export class Done<A> {
  constructor(
    readonly _result: A,
  ) {}
}

export class Chain<A> {
  constructor(
    readonly _value: any,
    readonly _then: (x: any) => InterpreterResult<A>,
  ) {}
}

export class Skip {}

export const skip = new Skip();

export function compose<Args extends Interpreter<any>[]>(...interpreters: Args): Interpreter<any> {
  return effect => {
    for (let idx = interpreters.length - 1; idx >= 0; idx--) {
      const interp = interpreters[idx];
      const result = interp(effect);
      if (!(result instanceof Skip)) return result;
    }
    return skip;
  };
}


export type Interpreter<A> = (effect: any) => A|Continuation<A>|Skip;


// 
export function runEffects<A>(iter: IterableIterator<A>, interp: Interpreter<A>, cb: (a: A) => void) {
  const loop = (cb: (a: A) => void) => (result: InterpreterResult<A>) => {
    if (result instanceof Skip) {
      throw new Error('Unknown effect');
    }
    if (result instanceof Continuation) {
      result.wait(a => {
        const nextEffect = iter.next(a);
        if (nextEffect.done) {
          cb(a);
          return;
        }
        loop(cb)(interp(nextEffect.value));
      });
      return;
    }
    if (result instanceof Done) {
      cb(result._result);
      return;
    }
    if (result instanceof Chain) {
      loop(a => loop(cb)(result._then(a)))(interp(result._value));
      return;
    }
    const nextEffect = iter.next(result);
    if (nextEffect.done) {
      cb(result);
      return;
    }
    loop(cb)(interp(nextEffect.value));
  }
  loop(cb)(undefined as any);
};

