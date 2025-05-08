import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { NEVER, interval, asapScheduler, animationFrameScheduler, queueScheduler } from '@rbxts/rx';
import { TestScheduler } from '@rbxts/rx/out/testing';
import { take, concat } from '@rbxts/rx/out/operators';

import { observableMatcher } from '../helpers/observableMatcher';
import { Error } from '@rbxts/luau-polyfill';

/** @test {interval} */
describe('interval', () => {
  let rxTestScheduler: TestScheduler;

  beforeEach(() => {
    rxTestScheduler = new TestScheduler(observableMatcher);
  });

  it('should set up an interval', () => {
    rxTestScheduler.run(({ expectObservable, time }) => {
      const period = time('----------|                                                                 ');
      //                             ----------|
      //                                       ----------|
      //                                                 ----------|
      //                                                           ----------|
      //                                                                     ----------|
      //                                                                               ----------|
      const unsubs = '     ---------------------------------------------------------------------------!';
      const expected = '   ----------0---------1---------2---------3---------4---------5---------6-----';
      expectObservable(interval(period), unsubs).toBe(expected, [0, 1, 2, 3, 4, 5, 6]);
    });
  });

  it('should emit when relative interval set to zero', () => {
    rxTestScheduler.run(({ expectObservable, time }) => {
      const period = time('|         ');
      const expected = '   (0123456|)';

      const e1 = interval(period).pipe(take(7));
      expectObservable(e1).toBe(expected, [0, 1, 2, 3, 4, 5, 6]);
    });
  });

  it('should consider negative interval as zero', () => {
    rxTestScheduler.run(({ expectObservable }) => {
      const expected = '(0123456|)';
      const e1 = interval(-1).pipe(take(7));
      expectObservable(e1).toBe(expected, [0, 1, 2, 3, 4, 5, 6]);
    });
  });

  it('should emit values until unsubscribed', (_, done) => {
    const values: number[] = [];
    const expected = [0, 1, 2, 3, 4, 5, 6];
    const e1 = interval(5);
    const subscription = e1.subscribe({
      next: (x: number) => {
        values.push(x);
        if (x === 6) {
          subscription.unsubscribe();
          expect(values).toEqual(expected);
          done();
        }
      },
      error: (err: any) => {
        done(new Error('should not be called'));
      },
      complete: () => {
        done(new Error('should not be called'));
      },
    });
  });

  it('should create an observable emitting periodically with the AsapScheduler', (_, done) => {
    jest.useFakeTimers();
    const period = 10;
    const events = [0, 1, 2, 3, 4, 5];
    const source = interval(period, asapScheduler).pipe(take(6));
    source.subscribe({
      next(x) {
        expect(x).toEqual(events.shift());
      },
      error(e) {
        jest.useRealTimers();
        done(e);
      },
      complete() {
        expect(asapScheduler.actions.size()).toEqual(0);
        expect(asapScheduler._scheduled).toEqual(undefined);
        jest.useRealTimers();
        done();
      },
    });
    let i = -1,
      n = events.size();
    while (++i < n) {
      jest.advanceTimersByTime(period);
    }
  });

  it('should create an observable emitting periodically with the QueueScheduler', (_, done) => {
    jest.useFakeTimers();
    const period = 10;
    const events = [0, 1, 2, 3, 4, 5];
    const source = interval(period, queueScheduler).pipe(take(6));
    source.subscribe({
      next(x) {
        expect(x).toEqual(events.shift());
      },
      error(e) {
        jest.useRealTimers();
        done(e);
      },
      complete() {
        expect(queueScheduler.actions.size()).toEqual(0);
        expect(queueScheduler._scheduled).toEqual(undefined);
        jest.useRealTimers();
        done();
      },
    });
    let i = -1,
      n = events.size();
    while (++i < n) {
      jest.advanceTimersByTime(period);
    }
  });

  it('should create an observable emitting periodically with the AnimationFrameScheduler', (_, done) => {
    jest.useFakeTimers();
    const period = 10;
    const events = [0, 1, 2, 3, 4, 5];
    const source = interval(period, animationFrameScheduler).pipe(take(6));
    source.subscribe({
      next(x) {
        expect(x).toEqual(events.shift());
      },
      error(e) {
        jest.useRealTimers();
        done(e);
      },
      complete() {
        expect(animationFrameScheduler.actions.size()).toEqual(0);
        expect(animationFrameScheduler._scheduled).toEqual(undefined);
        jest.useRealTimers();
        done();
      },
    });
    let i = -1,
      n = events.size();
    while (++i < n) {
      jest.advanceTimersByTime(period);
    }
  });
});
