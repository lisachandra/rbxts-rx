import { SchedulerLike } from '../types';
import { Observable } from '../Observable';
import { executeSchedule } from '../util/executeSchedule';
import { Error } from '@rbxts/luau-polyfill';
import { getAsyncIterator } from 'internal/polyfill/iterable';

export function scheduleAsyncIterable<T>(input: AsyncIterable<T>, scheduler: SchedulerLike) {
  if (!input) {
    throw new Error('Iterable cannot be undefined');
  }
  return new Observable<T>(function (subscriber) {
    executeSchedule(subscriber, scheduler, () => {
      const iterator = getAsyncIterator(input);
      executeSchedule(
        subscriber,
        scheduler,
        () => {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          iterator.next().then((result) => {
            if (result.done) {
              // This will remove the subscriptions from
              // the parent subscription.
              subscriber.complete();
            } else {
              subscriber.next(result.value);
            }
          });
        },
        0,
        true
      );
    });
  });
}
