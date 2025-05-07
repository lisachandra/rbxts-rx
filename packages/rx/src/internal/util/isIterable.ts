import { is } from 'internal/polyfill/type';
import { isFunction } from './isFunction';
import Symbol from 'internal/polyfill/symbol';

/** Identifies an input as being an Iterable */
export function isIterable(input: unknown): input is Iterable<any> {
  return typeIs(input, 'table') && is<{ [K: symbol]: unknown }>(input) && isFunction(input?.[Symbol.iterator]);
}
