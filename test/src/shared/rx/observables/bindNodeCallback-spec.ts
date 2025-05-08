import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { bindNodeCallback } from '@rbxts/rx';
import { TestScheduler } from '@rbxts/rx/out/testing';
import { observableMatcher } from '../helpers/observableMatcher';
import { Error, setTimeout, clearTimeout } from '@rbxts/luau-polyfill';

/** @test {bindNodeCallback} */
describe('bindNodeCallback', () => {
  let rxTestScheduler: TestScheduler;

  beforeEach(() => {
    rxTestScheduler = new TestScheduler(observableMatcher);
  });

  describe('when not scheduled', () => {
    it('should emit undefined when callback is called without success arguments', () => {
      function callback(cb: Callback) {
        cb(undefined);
      }

      const boundCallback = bindNodeCallback(callback);
      const results: Array<number | string> = [];

      boundCallback().subscribe({
        next: (x: any) => {
          results.push(type(x));
        },
        complete: () => {
          results.push('done');
        },
      });

      expect(results).toEqual(['undefined', 'done']);
    });

    it('should a resultSelector', () => {
      function callback(cb: (err: any, n: number) => any) {
        cb(undefined, 42);
      }

      const boundCallback = bindNodeCallback(callback, (x: number) => x + 1);
      const results: Array<number | string> = [];

      boundCallback().subscribe({
        next: (x) => {
          results.push(x);
        },
        complete: () => {
          results.push('done');
        },
      });

      expect(results).toEqual([43, 'done']);
    });

    it('should emit one value from a callback', () => {
      function callback(datum: number, cb: (err: any, n: number) => void) {
        cb(undefined, datum);
      }
      const boundCallback = bindNodeCallback(callback);
      const results: Array<number | string> = [];

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

    it('should set context of callback to context of boundCallback', () => {
      function callback(this: { datum: number }, cb: (err: any, n: number) => void) {
        cb(undefined, this.datum);
      }
      const boundCallback = bindNodeCallback(callback);
      const results: Array<number | string> = [];

      boundCallback({ datum: 42 }).subscribe({ next: (x: number) => results.push(x), complete: () => results.push('done') });

      expect(results).toEqual([42, 'done']);
    });

    it('should raise error from callback', () => {
      const error = new Error();

      function callback(cb: Callback) {
        cb(error);
      }

      const boundCallback = bindNodeCallback(callback);
      const results: Array<number | string> = [];

      boundCallback().subscribe({
        next: () => {
          throw new Error('should not next');
        },
        error: (err: any) => {
          results.push(err);
        },
        complete: () => {
          throw new Error('should not complete');
        },
      });

      expect(results).toEqual([error]);
    });

    it('should not emit, throw or complete if immediately unsubscribed', (_, done) => {
      const nextSpy = jest.fn();
      const throwSpy = jest.fn();
      const completeSpy = jest.fn();
      let timeout: ReturnType<typeof setTimeout>;
      function callback(datum: number, cb: (err: any, n: number) => void) {
        // Need to cb async in order for the unsub to trigger
        timeout = setTimeout(() => {
          cb(undefined, datum);
        }, 0);
      }
      const subscription = bindNodeCallback(callback)(42).subscribe({ next: nextSpy, error: throwSpy, complete: completeSpy });
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
      function callback(datum: number, cb: (err: any, n: number) => void) {
        cb(undefined, datum);
      }
      const boundCallback = bindNodeCallback(callback);
      const results: Array<number | string> = [];

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
    it('should emit undefined when callback is called without success arguments', () => {
      function callback(cb: Callback) {
        cb(undefined);
      }

      const boundCallback = bindNodeCallback(callback, rxTestScheduler);
      const results: Array<number | string> = [];

      boundCallback().subscribe({
        next: (x: any) => {
          results.push(type(x));
        },
        complete: () => {
          results.push('done');
        },
      });

      rxTestScheduler.flush();

      expect(results).toEqual(['undefined', 'done']);
    });

    it('should emit one value from a callback', () => {
      function callback(datum: number, cb: (err: any, n: number) => void) {
        cb(undefined, datum);
      }
      const boundCallback = bindNodeCallback(callback, rxTestScheduler);
      const results: Array<number | string> = [];

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

    it('should set context of callback to context of boundCallback', () => {
      function callback(this: { datum: number }, cb: (err: any, n: number) => void) {
        cb(undefined, this.datum);
      }
      const boundCallback = bindNodeCallback(callback, rxTestScheduler);
      const results: Array<number | string> = [];

      boundCallback({ datum: 42 }).subscribe({ next: (x: number) => results.push(x), complete: () => results.push('done') });

      rxTestScheduler.flush();

      expect(results).toEqual([42, 'done']);
    });

    it('should error if callback throws', () => {
      const expected = new Error('haha no callback for you');
      function callback(datum: number, cb: (err: any, n: number) => void) {
        throw expected;
      }
      const boundCallback = bindNodeCallback(callback, rxTestScheduler);

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

    it('should raise error from callback', () => {
      const error = new Error();

      function callback(cb: Callback) {
        cb(error);
      }

      const boundCallback = bindNodeCallback(callback, rxTestScheduler);
      const results: Array<number | string> = [];

      boundCallback().subscribe({
        next: () => {
          throw new Error('should not next');
        },
        error: (err: any) => {
          results.push(err);
        },
        complete: () => {
          throw new Error('should not complete');
        },
      });

      rxTestScheduler.flush();

      expect(results).toEqual([error]);
    });
  });

  it('should pass multiple inner arguments as an array', () => {
    function callback(datum: number, cb: (err: any, a: number, b: number, c: number, d: number) => void) {
      cb(undefined, datum, 1, 2, 3);
    }
    const boundCallback = bindNodeCallback(callback, rxTestScheduler);
    const results: Array<number[] | string> = [];

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
    function callback(datum: number, cb: (err: any, n: number) => void) {
      calls++;
      cb(undefined, datum);
    }
    const boundCallback = bindNodeCallback(callback, rxTestScheduler);
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

  it('should emit post callback errors', () => {
    function badFunction(callback: (error: Error, answer: number) => void): void {
      callback(undefined as any, 42);
      throw 'kaboom';
    }
    let receivedError: any;
    bindNodeCallback(badFunction)().subscribe({
      error: (err) => (receivedError = err),
    });

    expect(receivedError).toEqual('kaboom');
  });

  it('should not call the function if subscribed twice in a row before it resolves', () => {
    let executeCallback: any;
    let calls = 0;
    function myFunc(callback: (error: any, result: any) => void) {
      calls++;
      if (calls > 1) {
        throw new Error('too many calls to myFunc');
      }
      executeCallback = callback;
    }

    const source$ = bindNodeCallback(myFunc)();

    let result1: any;
    let result2: any;
    source$.subscribe((value) => (result1 = value));
    source$.subscribe((value) => (result2 = value));

    expect(calls).toEqual(1);
    executeCallback(undefined, 'test');
    expect(result1).toEqual('test');
    expect(result2).toEqual('test');
    expect(calls).toEqual(1);
  });

  it('should not even call the callbackFn if scheduled and immediately unsubscribed', () => {
    let calls = 0;
    function callback(datum: number, cb: Callback) {
      calls++;
      cb(undefined, datum);
    }
    const boundCallback = bindNodeCallback(callback, rxTestScheduler);
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
