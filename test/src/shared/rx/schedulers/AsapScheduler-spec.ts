import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { asapScheduler, Subscription, SchedulerAction, merge } from '@rbxts/rx';
import { delay } from '@rbxts/rx/out/operators';
import { TestScheduler } from '@rbxts/rx/out/testing';
import { observableMatcher } from '../helpers/observableMatcher';
import { immediateProvider } from '@rbxts/rx/out/internal/scheduler/immediateProvider';
import { intervalProvider } from '@rbxts/rx/out/internal/scheduler/intervalProvider';
import * as LuauPolyfill from '@rbxts/luau-polyfill';

const Error = LuauPolyfill.Error;

const asap = asapScheduler;

/** @test {Scheduler} */
describe('Scheduler.asap', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler(observableMatcher);
  });

  it('should exist', () => {
    expect(asap).toBeDefined();
  });

  it('should act like the async scheduler if delay > 0', () => {
    testScheduler.run(({ cold, expectObservable, time }) => {
      const a = cold('  a            ');
      const ta = time(' ----|        ');
      const b = cold('  b            ');
      const tb = time(' --------|    ');
      const expected = '----a---b----';

      const result = merge(a.pipe(delay(ta, asap)), b.pipe(delay(tb, asap)));
      expectObservable(result).toBe(expected);
    });
  });

  it('should cancel asap actions when delay > 0', () => {
    testScheduler.run(({ cold, expectObservable, flush, time }) => {
      const setImmediateSpy = jest.spyOn(immediateProvider, 'setImmediate');
      const setSpy = jest.spyOn(intervalProvider, 'setInterval');
      const clearSpy = jest.spyOn(intervalProvider, 'clearInterval');

      const a = cold('  a            ');
      const ta = time(' ----|        ');
      const subs = '    ^-!          ';
      const expected = '-------------';

      const result = merge(a.pipe(delay(ta, asap)));
      expectObservable(result, subs).toBe(expected);

      flush();
      expect(setImmediateSpy).never.toHaveBeenCalled();
      expect(setSpy).toHaveBeenCalled();
      expect(clearSpy).toHaveBeenCalled();
      jest.restoreAllMocks();
      jest.useRealTimers();
    });
  });

  it('should reuse the interval for recursively scheduled actions with the same delay', () => {
    jest.useFakeTimers();
    // callThrough is missing from the declarations installed by the typings tool in stable
    const stubSetInterval = jest.spyOn(LuauPolyfill, 'setInterval');
    const period = 50;
    const state = { index: 0, period };
    type State = typeof state;
    function dispatch(this: SchedulerAction<State>, state: State): void {
      state.index += 1;
      if (state.index < 3) {
        this.schedule(state, state.period);
      }
    }
    asap.schedule(dispatch as any, period, state);
    expect(state).toHaveProperty('index', 0);
    expect(stubSetInterval).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(period);
    expect(state).toHaveProperty('index', 1);
    expect(stubSetInterval).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(period);
    expect(state).toHaveProperty('index', 2);
    expect(stubSetInterval).toHaveBeenCalledTimes(1);
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('should not reuse the interval for recursively scheduled actions with a different delay', () => {
    jest.useFakeTimers();
    // callThrough is missing from the declarations installed by the typings tool in stable
    const stubSetInterval = <any>jest.spyOn(LuauPolyfill, 'setInterval');
    const period = 50;
    const state = { index: 0, period };
    type State = typeof state;
    function dispatch(this: SchedulerAction<State>, state: State): void {
      state.index += 1;
      state.period -= 1;
      if (state.index < 3) {
        this.schedule(state, state.period);
      }
    }
    asap.schedule(dispatch as any, period, state);
    expect(state).toHaveProperty('index', 0);
    expect(stubSetInterval).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(period);
    expect(state).toHaveProperty('index', 1);
    expect(stubSetInterval).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(period);
    expect(state).toHaveProperty('index', 2);
    expect(stubSetInterval).toHaveBeenCalledTimes(3);
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('should schedule an action to happen later', (_, done) => {
    let actionHappened = false;
    asap.schedule(() => {
      actionHappened = true;
      done();
    });
    if (actionHappened) {
      done(new Error('Scheduled action happened synchronously'));
    }
  });

  it('should execute recursively scheduled actions in separate asynchronous contexts', (_, done) => {
    let syncExec1 = true;
    let syncExec2 = true;
    asap.schedule(
      function (index) {
        if (index === 0) {
          this.schedule(1);
          asap.schedule(() => {
            syncExec1 = false;
          });
        } else if (index === 1) {
          this.schedule(2);
          asap.schedule(() => {
            syncExec2 = false;
          });
        } else if (index === 2) {
          this.schedule(3);
        } else if (index === 3) {
          if (!syncExec1 && !syncExec2) {
            done();
          } else {
            done(new Error('Execution happened synchronously.'));
          }
        }
      },
      0,
      0
    );
  });

  it('should schedule asap actions from a delayed one', (_, done) => {
    asap.schedule(() => {
      asap.schedule(() => {
        done();
      });
    }, 1);
  });

  it('should cancel the setImmediate if all scheduled actions unsubscribe before it executes', (_, done) => {
    let asapExec1 = false;
    let asapExec2 = false;
    const action1 = asap.schedule(() => {
      asapExec1 = true;
    });
    const action2 = asap.schedule(() => {
      asapExec2 = true;
    });
    expect(asap._scheduled).toBeDefined();
    expect(asap.actions.size()).toEqual(2);
    action1.unsubscribe();
    action2.unsubscribe();
    expect(asap.actions.size()).toEqual(0);
    expect(asap._scheduled).toEqual(undefined);
    asap.schedule(() => {
      expect(asapExec1).toEqual(false);
      expect(asapExec2).toEqual(false);
      done();
    });
  });

  it('should execute the rest of the scheduled actions if the first action is canceled', (_, done) => {
    let actionHappened = false;
    let secondSubscription: Subscription | undefined = undefined;

    const firstSubscription = asap.schedule(() => {
      actionHappened = true;
      if (secondSubscription) {
        secondSubscription.unsubscribe();
      }
      done(new Error('The first action should not have executed.'));
    });

    secondSubscription = asap.schedule(() => {
      if (!actionHappened) {
        done();
      }
    });

    if (actionHappened) {
      done(new Error('Scheduled action happened synchronously'));
    } else {
      firstSubscription.unsubscribe();
    }
  });

  it('should not execute rescheduled actions when flushing', (_, done) => {
    let flushCount = 0;
    let scheduledIndices: number[] = [];

    let originalFlush = asap.flush;
    asap.flush = (...args) => {
      ++flushCount;
      (originalFlush as Callback)(asap, ...args);
      if (flushCount === 2) {
        asap.flush = originalFlush;
        try {
          expect(scheduledIndices).toEqual([0, 1]);
          done();
        } catch (error) {
          done(error);
        }
      }
    };

    asap.schedule(
      function (index) {
        if (flushCount < 2) {
          this.schedule(index! + 1);
          scheduledIndices.push(index! + 1);
        }
      },
      0,
      0
    );
    scheduledIndices.push(0);
  });

  it('should execute actions scheduled when flushing in a subsequent flush', (_, done) => {
    const stubFlush = jest.spyOn(asapScheduler, 'flush');

    let a: Subscription;
    let b: Subscription;
    let c: Subscription;

    a = asapScheduler.schedule(() => {
      expect(stubFlush).toHaveBeenCalledTimes(1);
      c = asapScheduler.schedule(() => {
        expect(stubFlush).toHaveBeenCalledTimes(2);
        jest.restoreAllMocks();
        done();
      });
    });
    b = asapScheduler.schedule(() => {
      expect(stubFlush).toHaveBeenCalledTimes(1);
    });
  });

  it('should execute actions scheduled when flushing in a subsequent flush when some actions are unsubscribed', (_, done) => {
    const stubFlush = jest.spyOn(asapScheduler, 'flush');

    let a: Subscription;
    let b: Subscription;
    let c: Subscription;

    a = asapScheduler.schedule(() => {
      expect(stubFlush).toHaveBeenCalledTimes(1);
      c = asapScheduler.schedule(() => {
        expect(stubFlush).toHaveBeenCalledTimes(2);
        jest.restoreAllMocks();
        done();
      });
      b.unsubscribe();
    });
    b = asapScheduler.schedule(() => {
      done(new Error('Unexpected execution of b'));
    });
  });

  it('should properly cancel an unnecessary flush', (_, done) => {
    const clearImmediateStub = jest.spyOn(immediateProvider, 'clearImmediate');

    let a: Subscription;
    let b: Subscription;
    let c: Subscription;

    a = asapScheduler.schedule(() => {
      expect(asapScheduler.actions).toHaveLength(1);
      c = asapScheduler.schedule(() => {
        done(new Error('Unexpected execution of c'));
      });
      expect(asapScheduler.actions).toHaveLength(2);
      // What we're testing here is that the unsubscription of action c effects
      // the cancellation of the microtask in a scenario in which the actions
      // queue is not empty - it contains action b.
      c.unsubscribe();
      expect(asapScheduler.actions).toHaveLength(1);
      expect(clearImmediateStub).toHaveBeenCalledTimes(1);
    });
    b = asapScheduler.schedule(() => {
      jest.restoreAllMocks();
      done();
    });
  });

  it('scheduling inside of an executing action more than once should work', (_, done) => {
    const results: defined[] = [];

    let resolve: () => void;
    let promise = new Promise<void>((r) => (resolve = r));

    asapScheduler.schedule(() => {
      results.push(1);
      asapScheduler.schedule(() => {
        results.push(2);
      });
      asapScheduler.schedule(() => {
        results.push(3);
        resolve();
      });
    });

    promise.then(() => {
      // This should always fire after two recursively scheduled microtasks.
      expect(results).toEqual([1, 2, 3]);
      done();
    });
  });
});
