import { Eff } from './index';
import Monad from 'burrido';


// Do notation
export const { Do } = Monad({
  pure: Eff.of,
  bind: (m, proj) => m.chain(proj),
});
Eff.Do = Do;


export type InferResult<T> = T extends Eff<any, any> ? never : T;
export type InferEffects<T> = T extends Eff<infer U, any> ? U : never;

declare module "./index" {
  interface Statics {
    Do<M>(iter: () => IterableIterator<M>): Eff<InferEffects<M>, InferResult<M>>;
  }
}


