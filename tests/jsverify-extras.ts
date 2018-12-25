import * as jsc from 'jsverify';
import { Expr } from '../src/types';


declare module "jsverify" {
  export function recursive<T>(arbZ: jsc.Arbitrary<T>, arbS: (x: jsc.Arbitrary<T>) => jsc.Arbitrary<T>): jsc.Arbitrary<T>;
}


export namespace arb {
  export function of<T extends Expr>(value: T): jsc.Arbitrary<T> {
    return jsc.constant(value);
  }
}

export namespace gen {
  export function of<T extends Expr>(value: T): jsc.Generator<T> {
    return jsc.generator.constant(value);
  }
}
