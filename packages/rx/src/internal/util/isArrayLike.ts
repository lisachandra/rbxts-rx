export const isArrayLike = <T>(x: any): x is ArrayLike<T> => x && typeIs(x.size(), 'number') && !typeIs(x, 'function');
