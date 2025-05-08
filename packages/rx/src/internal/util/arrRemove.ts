import { Array } from '@rbxts/luau-polyfill';
import { typeAssertIs } from 'internal/polyfill/type';

/**
 * Removes an item from an array, mutating it.
 * @param arr The array to remove the item from
 * @param item The item to remove
 */
export function arrRemove<T>(arr: T[] | undefined | null, item: T) {
  if (arr) {
    typeAssertIs<defined[]>(arr);
    const index = arr.indexOf(item);
    0 <= index && Array.splice(arr, index, 1);
  }
}
