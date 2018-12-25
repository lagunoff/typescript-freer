Extensible Effects from
[Freer Monads, More Extensible Effects](http://okmij.org/ftp/Haskell/extensible/more.pdf)
in typescript. In short, Extensible Effects are a means to describe
side effects in pure code in a composable manner.

## Explanation
`Eff<U, A>` describes an effectful computation with the result type
`A` and possible side-effects enumerated in a union type `U`.
```ts
export type Eff<U, A> = 
  | Pure<U, A>
  | Impure<U, A>
  | Chain<U, A>
;
```

For example, `const eff: Eff<Console|State<number>, string>;` is a
computation that produces the result of type `string`, also can make
console interactions and manipulate global state along the way. `U` is
a union of type-level effect labels constructed from labels of
underlying effects combined using do-notation or directly through
`chain` method.

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
execute them and get the result of the computation, each kind of
effects should provide function-evaluator or a handler for this
particular effect. By convention these functions called with common
prefix `run*` (`runState`, `runReader`, `runWriter`, etc)
```ts
function runReader<I>(read: () => I): <U, A>(eff: Eff<U, A>) => Eff<Exclude<U, Ask<I>>, A>;
```

This is the type of evaluator for label `Ask<I>`. If a caller provides
a way do access global context `I`, then `runReader` return a function
that receives effect of type Eff<U, A> and produces another effect
without `Ask<I>` in `U`. All evaluators should eliminate corresponding
effect labels from `U` maybe by adding another labels like does
`runConsole` from [examples/console.ts](examples/console.ts):

```ts
function runConsole<U, A>(effect: Eff<U, A>) => Eff<Exclude<U, Console>|Async, A>;
```
Here effects with label `Console` replaced by label `Async` that stands
for effects for asynchronous code. 


## Examples

Imitating global state [ [01-state.ts](./examples/01-state.ts) ]
```ts
const eff01 = Eff.Do(function *() {
  const current: State = yield State.get();
  yield State.set(current + 1);
  yield State.modify(x => x * x);
  return 'Done';
});

let state = 2;
const eff02 = runState(() => state, next => (state = next), proj => (state = proj(state)))(eff01);
console.log(state); // => 2
const result = runEff(eff02); // Here side-effects are being executed
console.log(result); // => Done
console.log(state); // => 9
```

Error handling [ [02-failure.ts](./examples/02-failure.ts) ]
```ts
const div = (num: number, denom: number) => Eff.Do(function *() { if
(denom === 0) yield Failure.create<Err>('Division by zero'); return
num / denom; });

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
