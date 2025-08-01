import { Error } from '@rbxts/luau-polyfill';
import { Observable } from '../Observable';
import { Subscriber } from '../Subscriber';
import { OperatorFunction } from '../types';
import { isFunction } from './isFunction';

/**
 * Used to determine if an object is an Observable with a lift function.
 */
export function hasLift(source: object): source is { lift: InstanceType<typeof Observable>['lift'] } {
  return isFunction((source as { [K: string]: unknown })?.lift);
}

/**
 * Creates an `OperatorFunction`. Used to define operators throughout the library in a concise way.
 * @param init The logic to connect the liftedSource to the subscriber at the moment of subscription.
 */
export function operate<T, R>(
  init: (liftedSource: Observable<T>, subscriber: Subscriber<R>) => (() => void) | void
): OperatorFunction<T, R> {
  return (source: Observable<T>) => {
    if (hasLift(source)) {
      return source.lift(function (subber: Subscriber<R>, liftedSource: Observable<T>) {
        try {
          return init(liftedSource, subber);
        } catch (err) {
          subber.error(err);
        }
      });
    }
    throw new Error('Unable to lift unknown Observable type');
  };
}
