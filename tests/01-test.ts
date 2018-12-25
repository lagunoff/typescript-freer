import { Eff, EffAny } from '../src/index';
import { Async, runAsync } from '../src/async';
import { Either, EitherBase } from '../src/either';
import { Failure, runFailure } from '../src/failure';
import { IO } from '../src/io';
import { State, runState } from '../src/state';
import { Reader, runReader } from '../src/reader';
import { Writer, runWriter } from '../src/writer';
import * as jsc from 'jsverify';
import { arb } from './jsverify-extras';
import { left, right } from 'jsverify/lib/either';
import * as chai from 'chai';
const expect = chai.expect;


type InferArbitrary<A> = A extends jsc.Arbitrary<infer T> ? T : never;
type Prim = InferArbitrary<typeof primitiveArb>
const primitiveArb = jsc.oneof([jsc.bool, jsc.nat, jsc.asciistring, jsc.integer]);


export type EffectRep =
  | { tag: 'Pure', value: Prim }
  | { tag: 'Get' }
  | { tag: 'Set', value: Prim }
  | { tag: 'Ask' }
  | { tag: 'Put', value: Prim }
  | { tag: 'Modify', func: (x: any) => Prim }
  | { tag: 'Async', value: Prim, eager: boolean }
  | { tag: 'IO', value: Prim }
  | { tag: 'Failure', value: Either<Prim, Prim> }
;

const effectArb = jsc.oneof([
  jsc.record({ tag: arb.of('Pure'), value: primitiveArb }),
  arb.of<EffectRep>({ tag: 'Get' }),
  jsc.record({ tag: arb.of('Set'), value: primitiveArb }),
  jsc.record({ tag: arb.of('Modify'), func: jsc.fn(primitiveArb) }),
  jsc.record({ tag: arb.of('Async'), value: primitiveArb, eager: jsc.bool }),
  jsc.record({ tag: arb.of('IO'), value: primitiveArb }),
  jsc.record({
    tag: arb.of('Failure'),
    value: jsc.either(primitiveArb, primitiveArb).smap(
      e => e.either<any>(Either.failure, Either.of),
      e => e.fold(left, right)
    )
  }),
]);

const effectsArb = jsc.bless({
  generator: jsc.nearray(effectArb).generator,
  show: pprintEffects,
});


export function reifyEffect(rep: EffectRep): EffAny {
  switch (rep.tag) {
    case 'Pure': return Eff.of(rep.value);
    case 'Get': return State.get();
    case 'Set': return State.set(rep.value);
    case 'Ask': return Reader.ask();
    case 'Put': return Writer.put(rep.value);
    case 'Modify': return State.modify(rep.func);
    case 'IO': return IO.create(() => rep.value);
    case 'Failure': return rep.value.fold(Failure.create, Eff.of);
    case 'Async': {
      if (rep.eager) return Async.create((next, complete) => (next(rep.value), complete(), noopFunc));
      return Async.create((next, complete) => (setTimeout(() => (next(rep.value), complete())), noopFunc));
    }
  }
}

export function combineEffects(effects: EffAny[]): EffAny {
  if (effects.length === 1) return effects[0];
  // @ts-ignore
  return effects.reduce<EffAny>((acc, x) => acc.chainTo(x));
}

export function pprintEffect(rep: EffectRep): string {
  switch (rep.tag) {
    case 'Pure': return `Eff.of(${JSON.stringify(rep.value)})`;
    case 'Get': return `State.get()`;
    case 'Set': return `State.set(${JSON.stringify(rep.value)})`;
    case 'Ask': return `Reader.ask()`;
    case 'Put': return `Writer.put(${JSON.stringify(rep.value)})`;
    case 'Modify': return `State.modify(<unknown lambda>)`;
    case 'Async': return `Async.delay(0, Eff.of(${JSON.stringify(rep.value)}))`;
    case 'IO': return `IO.create(() => (${JSON.stringify(rep.value)}))`;
    case 'Failure': return rep.value.fold(l => `Failure.of(${JSON.stringify(l)})`, r => `Eff.of(${JSON.stringify(r)} /* from failure*/)`);
  }
}

export function pprintEffects(reps: EffectRep[]): string {
  return 'Eff.Do(function *() {\n' + reps.map(r => '  yield ' + pprintEffect(r) + ';').join('\n') + '\n})\n';
}

const options: any = { tests: 100, quiet: false };

if (typeof(location) !== 'undefined' && location.search) {
  const search = location.search.startsWith('?') ? location.search.slice(1) : location.search;
  const params = (search || '').split('&').filter(x => x !== '').reduce<Record<string, string>>((acc, pair) => { 
    const [key, value] = pair.split('=').map(decodeURIComponent);
    acc[key] = value || '';
    return acc;
  }, {});
  if (params['rng-state']) options.rngState = params['rng-state'];
  if (params['verbose']) options.verbose = Boolean(params['verbose']);
}

if (typeof(process) !== 'undefined') {
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === '--verbose') {
      options.verbose = Boolean(process.argv[++i]);
    }
  }
}


type Calculated = { result: Either<Prim, Prim>, output: Prim[] };
function calculateResult(ctx: Prim, initialState: Prim, effects: EffectRep[]): Calculated {
  const output: Prim[] = [];
  let state = initialState;
  let lastValue: any = void 0;
  for (const e of effects) {
    switch (e.tag) {
      case 'Pure': lastValue = e.value; break;
      case 'Get': lastValue = state; break;
      case 'Set': state = e.value; lastValue = void 0; break;
      case 'Ask': lastValue = ctx; break;
      case 'Put': output.push(e.value); lastValue = void 0; break;
      case 'Modify': state = e.func(state); lastValue = void 0; break;
      case 'Async': lastValue = e.value; break;
      case 'IO': lastValue = e.value; break;
      case 'Failure': {
        if (e.value instanceof Either.Left) return { result: e.value, output };
        lastValue = e.value.value; break;
      }
    }    
  }
  return { result: Either.right(lastValue), output };
}

describe('Eff', () => {
  it('satisfies properties', () => {
    jsc.assert(jsc.forall(effectsArb, xs => {
      const ctx = 'en-US';
      const initialState = 0;
      const output: Prim[] = [];
      let state = initialState;
      const get = () => state;
      const set = next => (state = next);
      const modify = proj => (state = proj(state));
      if (options.verbose) console.log('checking properties for: ' + pprintEffects(xs));

      const eff01 = combineEffects(xs.map(reifyEffect));
      const eff02 = runFailure(eff01);
      const eff03 = runReader(() => ctx)(eff02);
      const eff04 = runWriter(x => output.push(x as any))(eff03);
      const eff05 = runState(get, set, modify)(eff04);
      const eff06 = runAsync(eff05);

      return new Promise((resolve) => eff06(
        ethr => {
          // Result should be an instance of `EitherBase`, because we did `runFailure`
          expect(ethr).instanceof(EitherBase);
          // Compare with the calculated value
          const calculated = calculateResult(ctx, initialState, xs);
          expect(ethr).to.deep.equal(calculated.result);
          expect(output).to.deep.equal(calculated.output);
        },
        () => resolve(true)
      ));

    }), options);
  });
});

function noopFunc() {}


declare var process: {
  argv: string[];
};
