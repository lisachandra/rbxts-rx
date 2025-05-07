export const isArrayLike = <T>(x: unknown): x is ArrayLike<T> =>
  typeIs(x, 'table') && typeIs((x as defined[]).size(), 'number') && !typeIs(x, 'function');
