import { is } from 'internal/polyfill/type';
import { Observable } from '../Observable';
import { isFunction } from './isFunction';

/**
 * Tests to see if the object is an RxJS {@link Observable}
 * @param obj the object to test
 */
export function isObservable(obj: unknown): obj is Observable<unknown> {
  // The !! is to ensure that this publicly exposed function returns
  // `false` if something like `undefined` or `0` is passed.
  return !!obj && (obj instanceof Observable || (is<{ [K: string]: unknown }>(obj) && isFunction(obj.lift) && isFunction(obj.subscribe)));
}
