import { go, Async, runAsync, Pure } from '../src/async';
import { IO, runIO } from '../src/io';
import { State, runState } from '../src/state';
import { runEffects, compose } from '../src';


const async01 = Async.subscribe<number>((next, complete) => (setTimeout(() => (next(Math.floor(Math.random() * 100)), complete()), 1000), noopFunc));

export function* process(): IterableIterator<Async|IO|State<number>> {
  yield log('Process started');
  let value = yield async01;
  yield log('value', value);
  yield State.set(value);
  yield* State.modify<number>(value => value * value);
  value = yield State.get<any>();
  yield log('value', value);
  value = yield async01.map(String);
  yield log('value', value);
  return value;
}

const log = (...args) => IO.create(console.log, ...args)


let counter = 0;
runEffects(process(), compose(runIO, runState(() => counter, next => counter = next), runAsync), result => {
  console.log('result arrived', result);
});


function noopFunc() {}
