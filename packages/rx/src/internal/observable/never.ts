import { Observable } from '../Observable';
import { noop } from '../util/noop';

/**
 * An Observable that emits no items to the Observer and never completes.
 *
 * ![](never.png)
 *
 * A simple Observable that emits neither values nor errors nor the completion
 * notification. It can be used for testing purposes or for composing with other
 * Observables. Please note that by never emitting a complete notification, this
 * Observable keeps the subscription from being disposed automatically.
 * Subscriptions need to be manually disposed.
 *
 * ##  Example
 *
 * Emit the number 7, then never emit anything else (not even complete)
 *
 * ```ts
 * import { NEVER, startWith } from '@rbxts/rx';
 *
 * const info = () => console.log('Will not be called');
 *
 * const result = NEVER.pipe(startWith(7));
 * result.subscribe({
 *   next: x => console.log(x),
 *   error: info,
 *   complete: info
 * });
 * ```
 *
 * @see {@link Observable}
 * @see {@link EMPTY}
 * @see {@link of}
 * @see {@link throwError}
 */
export const NEVER = new Observable<never>(noop);

/**
 * @deprecated Replaced with the {@link NEVER} constant. Will be removed in v8.
 */
export function never() {
  return NEVER;
}
