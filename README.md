Extensible Effects from
[Freer Monads, More Extensible Effects](http://okmij.org/ftp/Haskell/extensible/more.pdf)
in typescript. 

## Explanation
Extensible Effects are a means to describe side effects in pure code
in a composable manner. `Eff<U, A>` describes an effectful computation
with the result type `A` and possible side-effects listed in a union
type `U`.

```ts
export type Eff<U, A> = 
  | Pure<U, A>
  | Impure<U, A>
  | Chain<U, A>
;
```

For example, `const eff: Eff<Console|State<number>, string>;` is a
computation that produces the result of type `string`, but also can
make console interactions and manipulate global state along the
way. `U` is a type-level list of effect labels to which the
computation has access to. This effects accumulate in typescript union
type from lists of other effects when they compose using do-notation
or through `chain` method.

```ts
const eff = Eff.Do(function *() {
  const nextState = yield Console.question('Enter value for new state: '); // Eff<Console, string>
  yield State.set<string>(nextState); // Eff<State<string>, string>
  return 'Done'; // Eff<never, string>
}); // Eff<Console|State<string>, string>
```
Same thing with `chain`
```ts
const eff = Console.question('Enter value for new state: ').chain(
  answer => State.set<string>(answer).mapTo('Done')
); // Eff<Console|State<string>, string>
```

Effects from listings above don't perform side effects during
construction and can be used in a pure code. In order to actually
execute them and to get the result of the computation, each kind of
effect should provide function-evaluator or a «handler» for this
particular effect. By convention these functions are named with common
prefix `run*` (`runState`, `runReader`, `runWriter`, etc)

```ts
function runReader<I>(read: () => I): <U, A>(eff: Eff<U, A>) => Eff<Exclude<U, Ask<I>>, A>;
```

This is the type of evaluator for label `Ask<I>`. If a caller provides
a way do access global context `I`, then `runReader` returns a
function that receives effect of type Eff<U, A> and produces another
effect without `Ask<I>` in `U`. All evaluators should eliminate
corresponding effect labels from `U` possibly by introducing effects
of different kind. For example `runConsole` from
[examples/console.ts](examples/console.ts) replaces `Console` label by
`Async` that stands for effects for asynchronous code:

```ts
function runConsole<U, A>(effect: Eff<U, A>) => Eff<Exclude<U, Console>|Async, A>;
```

Eventually, after calling corresponding evaluators for all effects,
when there are no effects will be left in `U`, you can execute actual
side-effects and access the result by calling `runEff: <A>(eff:
Eff<never, A>) => A`.

```ts
declare const eff01: Eff<State, string>; 

const eff02 = runState(getter, setter, modifier)(eff01); // eff02: Eff<never, string>
const result = runEff(eff02); // result: string
```

Some evaluators instead of `Eff` may return some other type e.g. `runAsync`
```ts
function runAsync<A>(effect: Eff<Async, A>): Subscribe<A>;
type Subscribe<A> = (next: (x: A) => void, completed: () => void) => Canceller;
type Canceller = () => void;
```
Such evaluators just like `runEff` should be run after all others.

This library is an experiment to check the possibility to write
frontend applications in typescript, where most code is pure, and side
effects are described declarativly by a data structure and an
evaluator.


## Examples

Imitating global state [ [01-state.ts](./examples/01-state.ts) ]
```ts
const eff01 = Eff.Do(function *() {
  const current: State = yield State.get();
  yield State.set(current + 1);
  yield State.modify(x => x * x);
  return 'Done';
});

const eff02 = runState(getter, setter, modify)(eff01); // Eliminate `State` from `U` parameter
console.log(state); // => 2
const result = runEff(eff02); // Here side-effects are being executed
console.log(result); // => Done
console.log(state); // => 9
```

Error handling [ [02-failure.ts](./examples/02-failure.ts) ]
```ts
const div = (num: number, denom: number) => Eff.Do(function *() {
  if (denom === 0) yield Failure.create<Err>('Division by zero');
  return num / denom;
});

const eff01 = runFailure(div(10, 5)); // Eliminate `Failure` from `U` parameter
const result01 = runEff(eff01); // Here side-effects are being executed
console.log(result01); // => Right { value: 2 }

const eff02 = runFailure(div(10, 0)); // Eliminate `Failure` from `U` parameter
const result02 = runEff(eff02); // Here side-effects are being executed
console.log(result02); // => Left { value: "Division by zero" }
```

Asynchronous computations [ [03-async.ts](./examples/03-async.ts) ]
```ts
const eff01 = Eff.Do(function *() {
  const first: number[] = yield randomOrgInts(1, 0, 10);
  const second: number[] = yield randomOrgInts(1, 0, 10);
  const third: number[] = yield randomOrgInts(1, 0, 10);
  return [...first, ...second, ...third];
});

const eff02 = runFailure(eff01); // Eliminate `Failure` from `U` parameter
const subscribe = runAsync(eff02); // Eliminate `Async` from `U` parameter
subscribe(console.log, () => console.log('completed'));
```

Console interactions [ [04-console.ts](./examples/04-console.ts) ]
```ts
const interaction = Eff.Do(function *() {
  const first: number = yield ask(num)('Enter the first number: ');
  const infix = yield ask(op)('Choose binary operation ("+", "-", "*", "/"): ')
  const second: number = yield ask(num)('Enter the second number: ')
  const expr = `${first} ${infix} ${second}`;
  yield Console.putStrLn(`${expr} = ${eval('(' + expr + ')')}`);
  const yesNo = yield ask(yn)('Try again? Y/N/y/n: ')
  if (yesNo === 'Y') yield eval('interaction') as Eff<never, void>; // Should be just `interaction`
});

const eff02 = Console.runConsole(interaction);
const subscribe = runAsync(eff02);
subscribe(() => {}, () => (console.log('bye...'), process && process.exit && process.exit()));
```
