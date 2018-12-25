import { Eff } from '../src/index';
import '../src/burrido';
import { Console } from './console';
import { runAsync } from '../src/async';

const ask = <A>(sanitize: (x: string) => A|null) => (question: string) => Console.question(question)
  .chain<A>(line => {
    const nullOrA = sanitize(line);
    return nullOrA === null ? eval('ask')(sanitize)(question) : Eff.of(nullOrA);
  });

const num = (x: string) => { const n = Number(x); return isNaN(n) ? null : n; };
const op = (x: string) => x === '+' || x === '-' || x === '*' || x === '/' ? x : null;
const yn = (x: string) => (x = x.toUpperCase(), x === 'Y' || x === 'N' ? x : null);

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
// @ts-ignore
subscribe(() => {}, () => (console.log('bye...'), process && process.exit && process.exit()));
