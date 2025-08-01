import { OperatorFunction, ObservableInput, ObservedValueOf } from '../types';
import { switchMap } from './switchMap';
import { identity } from '../util/identity';

/**
 * Converts a higher-order Observable into a first-order Observable
 * producing values only from the most recent observable sequence
 *
 * <span class="informal">Flattens an Observable-of-Observables.</span>
 *
 * ![](switchAll.png)
 *
 * `switchAll` subscribes to a source that is an observable of observables, also known as a
 * "higher-order observable" (or `Observable<Observable<T>>`). It subscribes to the most recently
 * provided "inner observable" emitted by the source, unsubscribing from any previously subscribed
 * to inner observable, such that only the most recent inner observable may be subscribed to at
 * any point in time. The resulting observable returned by `switchAll` will only complete if the
 * source observable completes, *and* any currently subscribed to inner observable also has completed,
 * if there are any.
 *
 * ## Examples
 *
 * Spawn a new interval observable for each click event, but for every new
 * click, cancel the previous interval and subscribe to the new one
 *
 * ```ts
 * import { fromEvent, tap, map, interval, switchAll } from '@rbxts/rx';
 *
 * const clicks = fromEvent(document, 'click').pipe(tap(() => console.log('click')));
 * const source = clicks.pipe(map(() => interval(1000)));
 *
 * source
 *   .pipe(switchAll())
 *   .subscribe(x => console.log(x));
 *
 * // Output
 * // click
 * // 0
 * // 1
 * // 2
 * // 3
 * // ...
 * // click
 * // 0
 * // 1
 * // 2
 * // ...
 * // click
 * // ...
 * ```
 *
 * @see {@link combineLatestAll}
 * @see {@link concatAll}
 * @see {@link exhaustAll}
 * @see {@link switchMap}
 * @see {@link switchMapTo}
 * @see {@link mergeAll}
 *
 * @return A function that returns an Observable that converts a higher-order
 * Observable into a first-order Observable producing values only from the most
 * recent Observable sequence.
 */
export function switchAll<O extends ObservableInput<any>>(): OperatorFunction<O, ObservedValueOf<O>> {
  return switchMap(identity);
}
