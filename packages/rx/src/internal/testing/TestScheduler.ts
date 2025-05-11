import { Observable } from '../Observable';
import { ColdObservable } from './ColdObservable';
import { HotObservable } from './HotObservable';
import { TestMessage } from './TestMessage';
import { SubscriptionLog } from './SubscriptionLog';
import { Subscription } from '../Subscription';
import { VirtualTimeScheduler, VirtualAction } from '../scheduler/VirtualTimeScheduler';
import { ObservableNotification } from '../types';
import { COMPLETE_NOTIFICATION, errorNotification, nextNotification } from '../NotificationFactories';
import { dateTimestampProvider } from '../scheduler/dateTimestampProvider';
import { performanceTimestampProvider } from '../scheduler/performanceTimestampProvider';
import { animationFrameProvider } from '../scheduler/animationFrameProvider';
import type { TimerHandle } from '../scheduler/timerHandle';
import { immediateProvider } from '../scheduler/immediateProvider';
import { intervalProvider } from '../scheduler/intervalProvider';
import { timeoutProvider } from '../scheduler/timeoutProvider';
import { Array, Error, Number, Object, String } from '@rbxts/luau-polyfill';
import { bind } from 'internal/polyfill/bind';
import RegExp from '@rbxts/regexp';
import { typeAssertIs } from 'internal/polyfill/type';
import { FrameRequestCallback } from 'internal/polyfill/animationFrame';

const defaultMaxFrame: number = 750;

export interface RunHelpers {
  cold: TestScheduler['createColdObservable'];
  hot: TestScheduler['createHotObservable'];
  flush: () => void;
  time: TestScheduler['createTime'];
  expectObservable: TestScheduler['expectObservable'];
  expectSubscriptions: TestScheduler['expectSubscriptions'];
  animate: (marbles: string) => void;
}

interface FlushableTest {
  ready: boolean;
  actual?: any[];
  expected?: any[];
}

export type observableToBeFn = (marbles: string, values?: any, errorValue?: any) => void;
export type observableToEqualFn = <T>(other: Observable<T>) => void
export type subscriptionLogsToBeFn = (marbles: string | string[]) => void;

export class TestScheduler extends VirtualTimeScheduler {
  /**
   * The number of virtual time units each character in a marble diagram represents. If
   * the test scheduler is being used in "run mode", via the `run` method, this is temporarily
   * set to `1` for the duration of the `run` block, then set back to whatever value it was.
   */
  static frameTimeFactor = 10;

  /**
   * @deprecated Internal implementation detail, do not use directly. Will be made internal in v8.
   */
  public readonly hotObservables: HotObservable<any>[] = [];

  /**
   * @deprecated Internal implementation detail, do not use directly. Will be made internal in v8.
   */
  public readonly coldObservables: ColdObservable<any>[] = [];

  /**
   * Test meta data to be processed during `flush()`
   */
  protected flushTests: FlushableTest[] = [];

  /**
   * Indicates whether the TestScheduler instance is operating in "run mode",
   * meaning it's processing a call to `run()`
   */
  private runMode = false;

  /**
   *
   * @param assertDeepEqual A function to set up your assertion for your test harness
   */
  constructor(public assertDeepEqual: (actual: any, expected: any) => boolean | void) {
    super(VirtualAction, defaultMaxFrame);
  }

  createTime: (this: void, marbles: string) => number = function (this: TestScheduler, marbles: string): number {
    const indexOf = this.runMode ? String.indexOf(String.trim(marbles), '|') : String.indexOf(marbles, '|');
    if (indexOf === -1) {
      throw new Error('marble diagram for time should have a completion marker "|"');
    }
    return indexOf * TestScheduler.frameTimeFactor;
  } as never;

  /**
   * @param marbles A diagram in the marble DSL. Letters map to keys in `values` if provided.
   * @param values Values to use for the letters in `marbles`. If omitted, the letters themselves are used.
   * @param err The error to use for the `#` marble (if present).
   */
  createColdObservable: <T = string>(this: void, marbles: string, values?: { [marble: string]: T }, err?: any) => ColdObservable<T> =
    function <T = string>(this: TestScheduler, marbles: string, values?: { [marble: string]: T }, err?: any): ColdObservable<T> {
      if (String.indexOf(marbles, '^') !== -1) {
        throw new Error('cold observable cannot have subscription offset "^"');
      }
      if (String.indexOf(marbles, '!') !== -1) {
        throw new Error('cold observable cannot have unsubscription marker "!"');
      }
      const messages = TestScheduler.parseMarbles(marbles, values, err, undefined, this.runMode);
      const cold = new ColdObservable<T>(messages, this);
      this.coldObservables.push(cold);
      return cold;
    } as never;

  /**
   * @param marbles A diagram in the marble DSL. Letters map to keys in `values` if provided.
   * @param values Values to use for the letters in `marbles`. If omitted, the letters themselves are used.
   * @param err The error to use for the `#` marble (if present).
   */
  createHotObservable: <T = string>(this: void, marbles: string, values?: { [marble: string]: T }, err?: any) => HotObservable<T> =
    function <T = string>(this: TestScheduler, marbles: string, values?: { [marble: string]: T }, err?: any): HotObservable<T> {
      if (String.indexOf(marbles, '!') !== -1) {
        throw new Error('hot observable cannot have unsubscription marker "!"');
      }
      const messages = TestScheduler.parseMarbles(marbles, values, err, undefined, this.runMode);
      const subject = new HotObservable<T>(messages, this);
      this.hotObservables.push(subject);
      return subject;
    } as never;

  private materializeInnerObservable(observable: Observable<any>, outerFrame: number): TestMessage[] {
    const messages: TestMessage[] = [];
    observable.subscribe({
      next: (value) => {
        messages.push({ frame: this.frame - outerFrame, notification: nextNotification(value) });
      },
      error: (err) => {
        messages.push({ frame: this.frame - outerFrame, notification: errorNotification(err) });
      },
      complete: () => {
        messages.push({ frame: this.frame - outerFrame, notification: COMPLETE_NOTIFICATION });
      },
    });
    return messages;
  }

  expectObservable: <T>(this: void, observable: Observable<T>, subscriptionMarbles?: string) => { toBe: observableToBeFn, toEqual: observableToEqualFn } = function <T>(
    this: TestScheduler,
    observable: Observable<T>,
    subscriptionMarbles: string | undefined = undefined
  ) {
    const actual: TestMessage[] = [];
    const flushTest: FlushableTest = { actual, ready: false };
    const subscriptionParsed = TestScheduler.parseMarblesAsSubscriptions(subscriptionMarbles, this.runMode);
    const subscriptionFrame = subscriptionParsed.subscribedFrame === math.huge ? 0 : subscriptionParsed.subscribedFrame;
    const unsubscriptionFrame = subscriptionParsed.unsubscribedFrame;
    let subscription: Subscription;

    this.schedule(() => {
      subscription = observable.subscribe({
        next: (x) => {
          // Support Observable-of-Observables
          const value = x instanceof Observable ? this.materializeInnerObservable(x, this.frame) : x;
          actual.push({ frame: this.frame, notification: nextNotification(value) });
        },
        error: (err) => {
          actual.push({ frame: this.frame, notification: errorNotification(err) });
        },
        complete: () => {
          actual.push({ frame: this.frame, notification: COMPLETE_NOTIFICATION });
        },
      });
    }, subscriptionFrame);

    if (unsubscriptionFrame !== math.huge) {
      this.schedule(() => subscription.unsubscribe(), unsubscriptionFrame);
    }

    this.flushTests.push(flushTest);
    const { runMode } = this;

    return {
      toBe: (marbles: string, values?: any, errorValue?: any) => {
        flushTest.ready = true;
        flushTest.expected = TestScheduler.parseMarbles(marbles, values, errorValue, true, runMode);
      },
      toEqual: (other: Observable<T>) => {
        flushTest.ready = true;
        flushTest.expected = [];
        this.schedule(() => {
          subscription = other.subscribe({
            next: (x) => {
              // Support Observable-of-Observables
              const value = x instanceof Observable ? this.materializeInnerObservable(x, this.frame) : x;
              (flushTest.expected as Array<defined>).push({ frame: this.frame, notification: nextNotification(value) });
            },
            error: (err) => {
              (flushTest.expected as Array<defined>).push({ frame: this.frame, notification: errorNotification(err) });
            },
            complete: () => {
              (flushTest.expected as Array<defined>).push({ frame: this.frame, notification: COMPLETE_NOTIFICATION });
            },
          });
        }, subscriptionFrame);
      },
    };
  } as never;

  expectSubscriptions: (this: void, actualSubscriptionLogs: SubscriptionLog[]) => { toBe: subscriptionLogsToBeFn } = function (
    this: TestScheduler,
    actualSubscriptionLogs: SubscriptionLog[]
  ): { toBe: subscriptionLogsToBeFn } {
    const flushTest: FlushableTest = { actual: actualSubscriptionLogs, ready: false };
    this.flushTests.push(flushTest);
    const { runMode } = this;
    return {
      toBe: (marblesOrMarblesArray: string | string[]) => {
        const marblesArray: string[] = typeIs(marblesOrMarblesArray, 'string') ? [marblesOrMarblesArray] : marblesOrMarblesArray;
        flushTest.ready = true;
        flushTest.expected = marblesArray
          .map((marbles) => TestScheduler.parseMarblesAsSubscriptions(marbles, runMode))
          .filter((marbles) => marbles.subscribedFrame !== math.huge);
      },
    };
  } as never;

  flush() {
    const hotObservables = this.hotObservables;
    while (hotObservables.size() > 0) {
      hotObservables.shift()!.setup();
    }

    super.flush();

    this.flushTests = this.flushTests.filter((test) => {
      if (test.ready) {
        this.assertDeepEqual(test.actual, test.expected);
        return false;
      }
      return true;
    });
  }

  static parseMarblesAsSubscriptions(marbles: string | undefined, runMode = false): SubscriptionLog {
    if (!typeIs(marbles, 'string')) {
      return new SubscriptionLog(math.huge);
    }
    // Spreading the marbles into an array leverages ES2015's support for emoji
    // characters when iterating strings.
    const characters = [...marbles];
    const len = characters.size();
    let groupStart = -1;
    let subscriptionFrame = math.huge;
    let unsubscriptionFrame = math.huge;
    let frame = 0;

    for (let i = 0; i < len; i++) {
      let nextFrame = frame;
      const advanceFrameBy = (count: number) => {
        nextFrame += count * this.frameTimeFactor;
      };
      const c = characters[i];
      switch (c) {
        case ' ':
          // Whitespace no longer advances time
          if (!runMode) {
            advanceFrameBy(1);
          }
          break;
        case '-':
          advanceFrameBy(1);
          break;
        case '(':
          groupStart = frame;
          advanceFrameBy(1);
          break;
        case ')':
          groupStart = -1;
          advanceFrameBy(1);
          break;
        case '^':
          if (subscriptionFrame !== math.huge) {
            throw new Error("found a second subscription point '^' in a " + 'subscription marble diagram. There can only be one.');
          }
          subscriptionFrame = groupStart > -1 ? groupStart : frame;
          advanceFrameBy(1);
          break;
        case '!':
          if (unsubscriptionFrame !== math.huge) {
            throw new Error("found a second unsubscription point '!' in a " + 'subscription marble diagram. There can only be one.');
          }
          unsubscriptionFrame = groupStart > -1 ? groupStart : frame;
          break;
        default:
          if (runMode && RegExp('^[0-9]$').exec(c)?.size()) {
            // Time progression must be preceded by at least one space
            // if it's not at the beginning of the diagram
            if (i === 0 || characters[i - 1] === ' ') {
              const buffer = Array.slice(characters, i).join('');
              const match = RegExp('^([0-9]+(?:\\.[0-9]+)?)(ms|s|m) ').exec(buffer);
              if (match?.size()) {
                i += match[0].size() - 1;
                const duration = tonumber(match[1])!;
                const unit = match[2];
                let durationInMs: number;

                switch (unit) {
                  case 'ms':
                    durationInMs = duration;
                    break;
                  case 's':
                    durationInMs = duration * 1000;
                    break;
                  case 'm':
                    durationInMs = duration * 1000 * 60;
                    break;
                  default:
                    break;
                }

                advanceFrameBy(durationInMs! / this.frameTimeFactor);
                break;
              }
            }
          }

          throw new Error("there can only be '^' and '!' markers in a " + "subscription marble diagram. Found instead '" + c + "'.");
      }

      frame = nextFrame;
    }

    if (unsubscriptionFrame < 0) {
      return new SubscriptionLog(subscriptionFrame);
    } else {
      return new SubscriptionLog(subscriptionFrame, unsubscriptionFrame);
    }
  }

  static parseMarbles(
    marbles: string,
    values?: any,
    errorValue?: any,
    materializeInnerObservables: boolean = false,
    runMode = false
  ): TestMessage[] {
    if (String.indexOf(marbles, '!') !== -1) {
      throw new Error('conventional marble diagrams cannot have the ' + 'unsubscription marker "!"');
    }
    // Spreading the marbles into an array leverages ES2015's support for emoji
    // characters when iterating strings.
    const characters = [...marbles];
    const len = characters.size();
    const testMessages: TestMessage[] = [];
    const subIndex = runMode ? String.indexOf(marbles.gsub('^[ ]+', '')[0], '^') : String.indexOf(marbles, '^');
    let frame = subIndex === -1 ? 0 : subIndex * -this.frameTimeFactor;
    const getValue = !typeIs(values, 'table')
      ? (x: any) => x
      : (x: string) => {
          // Support Observable-of-Observables
          if (materializeInnerObservables && (values as { [K in any]: unknown })[x] instanceof ColdObservable) {
            return (values as { [K in any]: ColdObservable<unknown> })[x].messages;
          }
          return (values as { [K in any]: unknown })[x];
        };
    let groupStart = -1;

    for (let i = 0; i < len; i++) {
      let nextFrame = frame;
      const advanceFrameBy = (count: number) => {
        nextFrame += count * this.frameTimeFactor;
      };

      let notification: ObservableNotification<any> | undefined;
      const c = characters[i];
      switch (c) {
        case ' ':
          // Whitespace no longer advances time
          if (!runMode) {
            advanceFrameBy(1);
          }
          break;
        case '-':
          advanceFrameBy(1);
          break;
        case '(':
          groupStart = frame;
          advanceFrameBy(1);
          break;
        case ')':
          groupStart = -1;
          advanceFrameBy(1);
          break;
        case '|':
          notification = COMPLETE_NOTIFICATION;
          advanceFrameBy(1);
          break;
        case '^':
          advanceFrameBy(1);
          break;
        case '#':
          notification = errorNotification((errorValue as unknown) || 'error');
          advanceFrameBy(1);
          break;
        default:
          // Might be time progression syntax, or a value literal
          if (runMode && RegExp('^[0-9]$').exec(c)?.size()) {
            // Time progression must be preceded by at least one space
            // if it's not at the beginning of the diagram
            if (i === 0 || characters[i - 1] === ' ') {
              const buffer = Array.slice(characters, i).join('');
              const match = RegExp('^([0-9]+(?:\\.[0-9]+)?)(ms|s|m) ').exec(buffer);
              if (match?.size()) {
                i += match[0].size() - 1;
                const duration = tonumber(match[1])!;
                const unit = match[2];
                let durationInMs: number;

                switch (unit) {
                  case 'ms':
                    durationInMs = duration;
                    break;
                  case 's':
                    durationInMs = duration * 1000;
                    break;
                  case 'm':
                    durationInMs = duration * 1000 * 60;
                    break;
                  default:
                    break;
                }

                advanceFrameBy(durationInMs! / this.frameTimeFactor);
                break;
              }
            }
          }

          notification = nextNotification(getValue(c));
          advanceFrameBy(1);
          break;
      }

      if (notification) {
        testMessages.push({ frame: groupStart > -1 ? groupStart : frame, notification });
      }

      frame = nextFrame;
    }
    return testMessages;
  }

  private createAnimator() {
    if (!this.runMode) {
      throw new Error('animate() must only be used in run mode');
    }

    // The TestScheduler assigns a delegate to the provider that's used for
    // requestAnimationFrame (rAF). The delegate works in conjunction with the
    // animate run helper to coordinate the invocation of any rAF callbacks,
    // that are effected within tests, with the animation frames specified by
    // the test's author - in the marbles that are passed to the animate run
    // helper. This allows the test's author to write deterministic tests and
    // gives the author full control over when - or if - animation frames are
    // 'painted'.

    let lastHandle = 0;
    let map: Map<number, FrameRequestCallback> | undefined;

    const delegate = {
      requestAnimationFrame(callback: FrameRequestCallback) {
        if (!map) {
          throw new Error('animate() was not called within run()');
        }
        const handle = ++lastHandle;
        map.set(handle, callback);
        return handle;
      },
      cancelAnimationFrame(handle: number) {
        if (!map) {
          throw new Error('animate() was not called within run()');
        }
        map.delete(handle);
      },
    };

    const animate = (marbles: string) => {
      if (map) {
        throw new Error('animate() must not be called more than once within run()');
      }
      if (RegExp('[|#]').test(marbles)) {
        throw new Error('animate() must not complete or error');
      }
      map = new Map<number, FrameRequestCallback>();
      const messages = TestScheduler.parseMarbles(marbles, undefined, undefined, undefined, true);
      for (const message of messages) {
        this.schedule(() => {
          const now = this.now();
          // Capture the callbacks within the queue and clear the queue
          // before enumerating the callbacks, as callbacks might
          // reschedule themselves. (And, yeah, we're using a Map to represent
          // the queue, but the values are guaranteed to be returned in
          // insertion order, so it's all good. Trust me, I've read the docs.)
          const callbacks = table.clone(Object.values(map!));
          map!.clear();
          for (const callback of callbacks) {
            callback(now);
          }
        }, message.frame);
      }
    };

    return { animate, delegate };
  }

  private createDelegates() {
    // When in run mode, the TestScheduler provides alternate implementations
    // of set/clearImmediate and set/clearInterval. These implementations are
    // consumed by the scheduler implementations via the providers. This is
    // done to effect deterministic asap and async scheduler behavior so that
    // all of the schedulers are testable in 'run mode'. Prior to v7,
    // delegation occurred at the scheduler level. That is, the asap and
    // animation frame schedulers were identical in behavior to the async
    // scheduler. Now, when in run mode, asap actions are prioritized over
    // async actions and animation frame actions are coordinated using the
    // animate run helper.

    let lastHandle = 0;
    const scheduleLookup = new Map<
      TimerHandle,
      {
        due: number;
        duration: number;
        handle: TimerHandle;
        handler: () => void;
        subscription: Subscription;
        type: 'immediate' | 'interval' | 'timeout';
      }
    >();

    const run = () => {
      // Whenever a scheduled run is executed, it must run a single immediate
      // or interval action - with immediate actions being prioritized over
      // interval and timeout actions.
      const now = this.now();
      const scheduledRecords = table.clone(Object.values(scheduleLookup));
      const scheduledRecordsDue = scheduledRecords.filter(({ due }: { due: number }) => due <= now);
      const dueImmediates = scheduledRecordsDue.filter(({ type: kind }: { type: unknown }) => kind === 'immediate');
      if (dueImmediates.size() > 0) {
        const { handle, handler } = dueImmediates[0];
        scheduleLookup.delete(handle);
        handler();
        return;
      }
      const dueIntervals = scheduledRecordsDue.filter(({ type: kind }: { type: unknown }) => kind === 'interval');
      if (dueIntervals.size() > 0) {
        const firstDueInterval = dueIntervals[0];
        const { duration, handler } = firstDueInterval;
        firstDueInterval.due = now + duration;
        // The interval delegate must behave like setInterval, so run needs to
        // be rescheduled. This will continue until the clearInterval delegate
        // unsubscribes and deletes the handle from the map.
        firstDueInterval.subscription = this.schedule(run, duration);
        handler();
        return;
      }
      const dueTimeouts = scheduledRecordsDue.filter(({ type: kind }: { type: unknown }) => kind === 'timeout');
      if (dueTimeouts.size() > 0) {
        const { handle, handler } = dueTimeouts[0];
        scheduleLookup.delete(handle);
        handler();
        return;
      }
      throw new Error('Expected a due immediate or interval');
    };

    // The following objects are the delegates that replace conventional
    // runtime implementations with TestScheduler implementations.
    //
    // The immediate delegate is depended upon by the asapScheduler.
    //
    // The interval delegate is depended upon by the asyncScheduler.
    //
    // The timeout delegate is not depended upon by any scheduler, but it's
    // included here because the onUnhandledError and onStoppedNotification
    // configuration points use setTimeout to avoid producer interference. It's
    // inclusion allows for the testing of these configuration points.

    const immediate = {
      setImmediate: (handler: () => void) => {
        const handle = ++lastHandle;
        scheduleLookup.set(handle, {
          due: this.now(),
          duration: 0,
          handle,
          handler,
          subscription: this.schedule(run, 0),
          type: 'immediate',
        });
        return handle;
      },
      clearImmediate: (handle: TimerHandle) => {
        const value = scheduleLookup.get(handle);
        if (value) {
          value.subscription.unsubscribe();
          scheduleLookup.delete(handle);
        }
      },
    };

    const interval = {
      setInterval: (handler: () => void, duration = 0) => {
        const handle = ++lastHandle;
        scheduleLookup.set(handle, {
          due: this.now() + duration,
          duration,
          handle,
          handler,
          subscription: this.schedule(run, duration),
          type: 'interval',
        });
        return handle;
      },
      clearInterval: (handle: TimerHandle) => {
        const value = scheduleLookup.get(handle);
        if (value) {
          value.subscription.unsubscribe();
          scheduleLookup.delete(handle);
        }
      },
    };

    const timeout = {
      setTimeout: (handler: () => void, duration = 0) => {
        const handle = ++lastHandle;
        scheduleLookup.set(handle, {
          due: this.now() + duration,
          duration,
          handle,
          handler,
          subscription: this.schedule(run, duration),
          type: 'timeout',
        });
        return handle;
      },
      clearTimeout: (handle: TimerHandle) => {
        const value = scheduleLookup.get(handle);
        if (value) {
          value.subscription.unsubscribe();
          scheduleLookup.delete(handle);
        }
      },
    };

    return { immediate, interval, timeout };
  }

  /**
   * The `run` method performs the test in 'run mode' - in which schedulers
   * used within the test automatically delegate to the `TestScheduler`. That
   * is, in 'run mode' there is no need to explicitly pass a `TestScheduler`
   * instance to observable creators or operators.
   *
   * @see {@link /guide/testing/marble-testing}
   */
  run<T>(callback: (helpers: RunHelpers) => T): T {
    const prevFrameTimeFactor = TestScheduler.frameTimeFactor;
    const prevMaxFrames = this.maxFrames;

    TestScheduler.frameTimeFactor = 1;
    this.maxFrames = math.huge;
    this.runMode = true;

    const animator = this.createAnimator();
    const delegates = this.createDelegates();

    animationFrameProvider.delegate = animator.delegate;
    dateTimestampProvider.delegate = this;
    immediateProvider.delegate = delegates.immediate;
    intervalProvider.delegate = delegates.interval;
    timeoutProvider.delegate = delegates.timeout;
    performanceTimestampProvider.delegate = this;

    const helpers: RunHelpers = {
      cold: bind(false, this['createColdObservable' as never], this),
      hot: bind(false, this['createHotObservable' as never], this),
      flush: bind(false, this['flush' as never], this),
      time: bind(false, this['createTime' as never], this),
      expectObservable: bind(false, this['expectObservable' as never], this),
      expectSubscriptions: bind(false, this['expectSubscriptions' as never], this),
      animate: animator.animate,
    };
    try {
      const ret = callback(helpers);
      this.flush();
      return ret;
    } finally {
      TestScheduler.frameTimeFactor = prevFrameTimeFactor;
      this.maxFrames = prevMaxFrames;
      this.runMode = false;
      animationFrameProvider.delegate = undefined;
      dateTimestampProvider.delegate = undefined;
      immediateProvider.delegate = undefined;
      intervalProvider.delegate = undefined;
      timeoutProvider.delegate = undefined;
      performanceTimestampProvider.delegate = undefined;
    }
  }
}
