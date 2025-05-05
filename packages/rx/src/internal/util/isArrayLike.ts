export const isArrayLike = <T>(x: any): x is ArrayLike<T> => x && typeof x.size() === 'number' && typeof x !== 'function';
