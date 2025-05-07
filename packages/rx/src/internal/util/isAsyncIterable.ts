import { is } from 'internal/polyfill/type';
import { isFunction } from './isFunction';
import Symbol from 'internal/polyfill/symbol';

export function isAsyncIterable<T>(obj: unknown): obj is AsyncIterable<T> {
  return typeIs(obj, 'table') && is<{ [K: symbol]: unknown }>(obj) && isFunction(obj?.[Symbol.asyncIterator]);
}
