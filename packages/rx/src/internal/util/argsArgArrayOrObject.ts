import { Array, Object } from '@rbxts/luau-polyfill';

const { isArray } = Array;
const { /* getPrototypeOf, prototype: objectProto, */ keys: getKeys } = Object;

/**
 * Used in functions where either a list of arguments, a single array of arguments, or a
 * dictionary of arguments can be returned. Returns an object with an `args` property with
 * the arguments in an array, if it is a dictionary, it will also return the `keys` in another
 * property.
 */
export function argsArgArrayOrObject<T, O extends Record<string, T>>(args: T[] | [O] | [T[]]): { args: T[]; keys: string[] | undefined } {
  if (args.size() === 1) {
    const first = args[0];
    if (isArray(first)) {
      return { args: first, keys: undefined };
    }
    if (isPOJO(first)) {
      const keys = getKeys(first);
      return {
        args: (keys as defined[]).map((key) => first[key as string]),
        keys: keys as never,
      };
    }
  }

  return { args: args as T[], keys: undefined };
}

function isPOJO(obj: unknown): obj is object {
  return typeIs(obj, 'table'); // && getPrototypeOf(obj) === objectProto;
}
