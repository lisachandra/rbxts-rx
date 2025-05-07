import { is } from 'internal/polyfill/type';
import { isFunction } from './isFunction';

/**
 * Tests to see if the object is "thennable".
 * @param value the object to test
 */
export function isPromise(value: unknown): value is Promise<any> {
  return typeIs(value, 'table') && is<{ [K: string]: unknown }>(value) && isFunction(value?.then);
}
