import { innerFrom } from '../observable/innerFrom';
import { observeOn } from '../operators/observeOn';
import { subscribeOn } from '../operators/subscribeOn';
import { SchedulerLike } from '../types';

export function schedulePromise<T>(input: Promise<T>, scheduler: SchedulerLike) {
  return innerFrom(input).pipe(subscribeOn(scheduler), observeOn(scheduler));
}
