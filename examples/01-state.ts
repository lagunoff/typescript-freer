import { Eff, runEff } from '../src/index';
import { runState, bindState } from '../src/state';
import '../src/burrido';

type State = typeof state;
const State = bindState<typeof state>();

const eff01 = Eff.Do(function *() {
  const current: State = yield State.get();
  yield State.set(current + 1);
  yield State.modify(x => x * x);
  return 'Done';
});

let state = 2;
const getter = () => state;
const setter = next => (state = next);
const modify = proj => (state = proj(state));

const eff02 = runState(getter, setter, modify)(eff01); // Eliminate `State` from `U` parameter
console.log(state); // => 2
const result = runEff(eff02); // Here side-effects are being executed
console.log(result); // => Done
console.log(state); // => 9
