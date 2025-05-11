import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { bindCallback, Observable } from '@rbxts/rx';
import { TestScheduler } from '@rbxts/rx/out/testing';
import { observableMatcher } from '../helpers/observableMatcher';
import { Error, setTimeout, clearTimeout } from '@rbxts/luau-polyfill';

/** @test {bindCallback} */
describe('bindCallback', () => {
  describe('when not scheduled', () => {
    it('should emit undefined from a callback without arguments', () => {
      function callback(cb: Callback) {
        cb();
      }
      const boundCallback = bindCallback(callback);
      const results: Array<string | number> = [];

      boundCallback().subscribe({
        next: (x: any) => {
          results.push(type(x));
        },
        complete: () => {
          results.push('done');
        },
      });

      expect(results).toEqual(['nil', 'done']);
    });

    it('should support a resultSelector', () => {
      function callback(datum: number, cb: Callback) {
        cb(datum);
      }

      const boundCallback = bindCallback(callback, (datum: number) => datum + 1);

      const results: Array<string | number> = [];

      boundCallback(42).subscribe({
        next: (value) => {
          results.push(value);
        },
        complete: () => {
          results.push('done');
        },
      });

      expect(results).toEqual([43, 'done']);
    });

    it('should support a resultSelector if its void', () => {
      function callback(datum: number, cb: Callback) {
        cb(datum);
      }

      const boundCallback = bindCallback(callback, undefined);

      const results: Array<string | number> = [];

      boundCallback(42).subscribe({
        next: (value: any) => {
          results.push(value);
        },
        complete: () => {
          results.push('done');
        },
      });

      expect(results).toEqual([42, 'done']);
    });

    it('should emit one value from a callback', () => {
      function callback(datum: number, cb: (result: number) => void) {
        cb(datum);
      }
      const boundCallback = bindCallback(callback);
      const results: Array<string | number> = [];

      boundCallback(42).subscribe({
        next: (x) => {
          results.push(x);
        },
        complete: () => {
          results.push('done');
        },
      });

      expect(results).toEqual([42, 'done']);
    });

    it('should set callback function context to context of returned function', () => {
      function callback(itself: { datum: number }, cb: (arg: number) => void) {
        cb(itself.datum);
      }

      const boundCallback = bindCallback(callback);
      const results: Array<string | number> = [];

      boundCallback({ datum: 5 }).subscribe({
        next: (x: number) => results.push(x),
        complete: () => results.push('done'),
      });

      expect(results).toEqual([5, 'done']);
    });

    it('should not emit, throw or complete if immediately unsubscribed', (_, done) => {
      const nextSpy = jest.fn();
      const throwSpy = jest.fn();
      const completeSpy = jest.fn();
      let timeout: ReturnType<typeof setTimeout>;
      function callback(datum: number, cb: Callback) {
        // Need to cb async in order for the unsub to trigger
        timeout = setTimeout(() => {
          cb(datum);
        }, 0);
      }
      const subscription = bindCallback(callback)(42).subscribe({ next: nextSpy, error: throwSpy, complete: completeSpy });
      subscription.unsubscribe();

      setTimeout(() => {
        expect(nextSpy).never.toHaveBeenCalled();
        expect(throwSpy).never.toHaveBeenCalled();
        expect(completeSpy).never.toHaveBeenCalled();

        clearTimeout(timeout);
        done();
      });
    });

    it('should create a separate internal subject for each call', () => {
      function callback(datum: number, cb: (result: number) => void) {
        cb(datum);
      }
      const boundCallback = bindCallback(callback);
      const results: Array<string | number> = [];

      boundCallback(42).subscribe({
        next: (x) => {
          results.push(x);
        },
        complete: () => {
          results.push('done');
        },
      });
      boundCallback(54).subscribe({
        next: (x) => {
          results.push(x);
        },
        complete: () => {
          results.push('done');
        },
      });

      expect(results).toEqual([42, 'done', 54, 'done']);
    });
  });

  describe('when scheduled', () => {
    let rxTestScheduler: TestScheduler;

    beforeEach(() => {
      rxTestScheduler = new TestScheduler(observableMatcher);
    });

    it('should emit undefined from a callback without arguments', () => {
      function callback(cb: Callback) {
        cb();
      }
      const boundCallback = bindCallback(callback, rxTestScheduler);
      const results: Array<string | number> = [];

      boundCallback().subscribe({
        next: (x) => {
          results.push(type(x));
        },
        complete: () => {
          results.push('done');
        },
      });

      rxTestScheduler.flush();

      expect(results).toEqual(['nil', 'done']);
    });

    it('should emit one value from a callback', () => {
      function callback(datum: number, cb: (result: number) => void) {
        cb(datum);
      }
      const boundCallback = bindCallback(callback, rxTestScheduler);
      const results: Array<string | number> = [];

      boundCallback(42).subscribe({
        next: (x) => {
          results.push(x);
        },
        complete: () => {
          results.push('done');
        },
      });

      rxTestScheduler.flush();

      expect(results).toEqual([42, 'done']);
    });

    it('should set callback function context to context of returned function', () => {
      function callback(itself: { datum: number }, cb: (num: number) => void) {
        cb(itself.datum);
      }

      const boundCallback = bindCallback(callback, rxTestScheduler);
      const results: Array<string | number> = [];

      boundCallback({ datum: 5 }).subscribe({
        next: (x: number) => results.push(x),
        complete: () => results.push('done'),
      });

      rxTestScheduler.flush();

      expect(results).toEqual([5, 'done']);
    });

    it('should error if callback throws', () => {
      const expected = new Error('haha no callback for you');
      function callback(datum: number, cb: Callback): never {
        throw expected;
      }
      const boundCallback = bindCallback(callback, rxTestScheduler);

      boundCallback(42).subscribe({
        next: (x) => {
          throw new Error('should not next');
        },
        error: (err: any) => {
          expect(err).toEqual(expected);
        },
        complete: () => {
          throw new Error('should not complete');
        },
      });

      rxTestScheduler.flush();
    });

    it('should pass multiple inner arguments as an array', () => {
      function callback(datum: number, cb: (a: number, b: number, c: number, d: number) => void) {
        cb(datum, 1, 2, 3);
      }
      const boundCallback = bindCallback(callback, rxTestScheduler);
      const results: Array<string | number[]> = [];

      boundCallback(42).subscribe({
        next: (x) => {
          results.push(x);
        },
        complete: () => {
          results.push('done');
        },
      });

      rxTestScheduler.flush();

      expect(results).toEqual([[42, 1, 2, 3], 'done']);
    });

    it('should cache value for next subscription and not call callbackFunc again', () => {
      let calls = 0;
      function callback(datum: number, cb: (x: number) => void) {
        calls++;
        cb(datum);
      }
      const boundCallback = bindCallback(callback, rxTestScheduler);
      const results1: Array<number | string> = [];
      const results2: Array<number | string> = [];

      const source = boundCallback(42);

      source.subscribe({
        next: (x) => {
          results1.push(x);
        },
        complete: () => {
          results1.push('done');
        },
      });

      source.subscribe({
        next: (x) => {
          results2.push(x);
        },
        complete: () => {
          results2.push('done');
        },
      });

      rxTestScheduler.flush();

      expect(calls).toEqual(1);
      expect(results1).toEqual([42, 'done']);
      expect(results2).toEqual([42, 'done']);
    });

    it('should not even call the callbackFn if scheduled and immediately unsubscribed', () => {
      let calls = 0;
      function callback(datum: number, cb: Callback) {
        calls++;
        cb(datum);
      }
      const boundCallback = bindCallback(callback, rxTestScheduler);
      const results1: Array<number | string> = [];

      const source = boundCallback(42);

      const subscription = source.subscribe({
        next: (x: any) => {
          results1.push(x);
        },
        complete: () => {
          results1.push('done');
        },
      });

      subscription.unsubscribe();

      rxTestScheduler.flush();

      expect(calls).toEqual(0);
    });
  });

  it('should emit post-callback errors', () => {
    function badFunction(callback: (answer: number) => void): void {
      callback(42);
      throw 'kaboom';
    }
    let receivedError: unknown;

    bindCallback(badFunction)().subscribe({
      error: (err: unknown) => (receivedError = err),
    });

    expect(receivedError).toEqual('kaboom');
  });
});
