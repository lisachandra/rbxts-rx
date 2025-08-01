import type { Action } from './scheduler/Action';
import { Subscription } from './Subscription';
import { SchedulerLike, SchedulerAction } from './types';
import { dateTimestampProvider } from './scheduler/dateTimestampProvider';

/**
 * An execution context and a data structure to order tasks and schedule their
 * execution. Provides a notion of (potentially virtual) time, through the
 * `now()` getter method.
 *
 * Each unit of work in a Scheduler is called an `Action`.
 *
 * ```ts
 * class Scheduler {
 *   now(): number;
 *   schedule(work, delay?, state?): Subscription;
 * }
 * ```
 *
 * @deprecated Scheduler is an internal implementation detail of RxJS, and
 * should not be used directly. Rather, create your own class and implement
 * {@link SchedulerLike}. Will be made internal in v8.
 */
export class Scheduler implements SchedulerLike {
  public static now: (this: any) => number = dateTimestampProvider['now' as never];

  constructor(
    private schedulerActionCtor: typeof Action,
    now: () => number = Scheduler['now' as never]
  ) {
    this.now = now;
  }

  /**
   * A getter method that returns a number representing the current time
   * (at the time this function was called) according to the scheduler's own
   * internal clock.
   * @return A number that represents the current time. May or may not
   * have a relation to wall-clock time. May or may not refer to a time unit
   * (e.g. milliseconds).
   */
  public now: (this: any) => number;

  /**
   * Schedules a function, `work`, for execution. May happen at some point in
   * the future, according to the `delay` parameter, if specified. May be passed
   * some context object, `state`, which will be passed to the `work` function.
   *
   * The given arguments will be processed an stored as an Action object in a
   * queue of actions.
   *
   * @param work A function representing a task, or some unit of work to be
   * executed by the Scheduler.
   * @param delay Time to wait before executing the work, where the time unit is
   * implicit and defined by the Scheduler itself.
   * @param state Some contextual data that the `work` function uses when called
   * by the Scheduler.
   * @return A subscription in order to be able to unsubscribe the scheduled work.
   */
  public schedule<T>(work: (this: SchedulerAction<T>, state?: T) => void, delay: number = 0, state?: T): Subscription {
    return new this.schedulerActionCtor<T>(this, work).schedule(state, delay);
  }
}
