import { Eff, runEff } from '../src/index';
import { Failure, runFailure } from '../src/failure';
import '../src/burrido';

type Err = string;

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
