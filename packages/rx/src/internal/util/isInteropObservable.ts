import Symbol from 'internal/polyfill/symbol';
import { InteropObservable } from '../types';
import { isFunction } from './isFunction';
import { is } from 'internal/polyfill/type';

/** Identifies an input as being Observable (but not necessary an Rx Observable) */
export function isInteropObservable(input: unknown): input is InteropObservable<any> {
  return typeIs(input, 'table') && is<{ [K: symbol]: unknown }>(input) && isFunction(input[Symbol.observable]);
}
