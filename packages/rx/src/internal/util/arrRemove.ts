import { Array } from '@rbxts/luau-polyfill';

/**
 * Removes an item from an array, mutating it.
 * @param arr The array to remove the item from
 * @param item The item to remove
 */
export function arrRemove<T extends defined>(arr: T[] | undefined | null, item: T) {
  if (arr) {
    const index = arr.indexOf(item);
    0 <= index && Array.splice(arr, index, 1);
  }
}
