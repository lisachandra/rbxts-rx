import { Scheduler } from '../Scheduler';
import { Action } from './Action';
import type { AsyncAction } from './AsyncAction';
import { TimerHandle } from './timerHandle';

export class AsyncScheduler extends Scheduler {
  public actions: Array<AsyncAction<any>> = [];
  /**
   * A flag to indicate whether the Scheduler is currently executing a batch of
   * queued actions.
   * @internal
   */
  public _active: boolean = false;
  /**
   * An internal ID used to track the latest asynchronous task such as those
   * coming from `setTimeout`, `setInterval`, `requestAnimationFrame`, and
   * others.
   * @internal
   */
  public _scheduled: TimerHandle | undefined;

  constructor(SchedulerAction: typeof Action, now: () => number = Scheduler['now' as never]) {
    super(SchedulerAction, now);
  }

  public flush(action: AsyncAction<any>): void {
    const { actions } = this;

    if (this._active) {
      actions.push(action);
      return;
    }

    let err: unknown;
    this._active = true;

    do {
      if ((err = action.execute(action.state, action.delay) as unknown)) {
        break;
      }
    } while ((action = actions.shift()!)); // exhaust the scheduler queue

    this._active = false;

    if (err) {
      while ((action = actions.shift()!)) {
        action.unsubscribe();
      }
      throw err;
    }
  }
}
