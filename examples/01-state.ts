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
const eff02 = runState(() => state, next => (state = next), proj => (state = proj(state)))(eff01); // Eliminating `State` from list of effects
console.log(state); // => 2
const result = runEff(eff02); // Here side-effects are being executed
console.log(result); // => Done
console.log(state); // => 9
