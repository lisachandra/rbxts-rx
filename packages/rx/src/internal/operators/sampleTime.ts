import { asyncScheduler } from '../scheduler/async';
import { MonoTypeOperatorFunction, SchedulerLike } from '../types';
import { sample } from './sample';
import { interval } from '../observable/interval';

/**
 * Emits the most recently emitted value from the source Observable within
 * periodic time intervals.
 *
 * <span class="informal">Samples the source Observable at periodic time
 * intervals, emitting what it samples.</span>
 *
 * ![](sampleTime.png)
 *
 * `sampleTime` periodically looks at the source Observable and emits whichever
 * value it has most recently emitted since the previous sampling, unless the
 * source has not emitted anything since the previous sampling. The sampling
 * happens periodically in time every `period` milliseconds (or the time unit
 * defined by the optional `scheduler` argument). The sampling starts as soon as
 * the output Observable is subscribed.
 *
 * ## Example
 *
 * Every second, emit the most recent click at most once
 *
 * ```ts
 * import { fromEvent, sampleTime } from '@rbxts/rx';
 *
 * const clicks = fromEvent(document, 'click');
 * const result = clicks.pipe(sampleTime(1000));
 *
 * result.subscribe(x => console.log(x));
 * ```
 *
 * @see {@link auditTime}
 * @see {@link debounceTime}
 * @see {@link delay}
 * @see {@link sample}
 * @see {@link throttleTime}
 *
 * @param period The sampling period expressed in milliseconds or the time unit
 * determined internally by the optional `scheduler`.
 * @param scheduler The {@link SchedulerLike} to use for managing the timers
 * that handle the sampling.
 * @return A function that returns an Observable that emits the results of
 * sampling the values emitted by the source Observable at the specified time
 * interval.
 */
export function sampleTime<T>(period: number, scheduler: SchedulerLike = asyncScheduler): MonoTypeOperatorFunction<T> {
  return sample(interval(period, scheduler));
}
