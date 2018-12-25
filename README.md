Extensible Effects from
[Freer Monads, More Extensible Effects](http://okmij.org/ftp/Haskell/extensible/more.pdf)
in typescript. In short, Extensible Effects are a means to describe
side effects in pure code in a composable manner.

#### Example [01-state.ts](./examples/01-state.ts): Imitating global state 
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

#### Example [02-failure.ts](./examples/02-failure.ts): Error handling
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

#### Example [03-async.ts](./examples/03-async.ts): Asynchronous computations
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
#### Example [04-console.ts](./examples/04-console.ts): Console interactions
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
