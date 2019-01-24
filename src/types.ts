/** Better type inference */
export type Expr = boolean|null|undefined|number|string|{}|[];


/** Don't coerce string literals to `string` type */
export function literal<A extends string>(x: A): A {
  return x;
}


/** Helper for totality checking */
export function absurd(x: never): any;
export function absurd<A>(x: never): A;
export function absurd(x: never): any {
  throw new Error('absurd: unreachable code');
}


/** Helper for totality checking */
export function ensure<T>(x: T): void {
}
