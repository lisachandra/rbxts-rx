import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';

import { fromEventPattern, noop, NEVER, timer } from '@rbxts/rx';
import { mapTo, take, concat } from '@rbxts/rx/out/operators';
import { TestScheduler } from '@rbxts/rx/out/testing';
import { observableMatcher } from '../helpers/observableMatcher';
import { Error } from '@rbxts/luau-polyfill';

/** @test {fromEventPattern} */
describe('fromEventPattern', () => {
  let rxTestScheduler: TestScheduler;

  beforeEach(() => {
    rxTestScheduler = new TestScheduler(observableMatcher);
  });

  it('should create an observable from the handler API', () => {
    rxTestScheduler.run(({ time, expectObservable }) => {
      const time1 = time('-----|     ');
      const time2 = time('     --|   ');
      const expected = '  -----x-x---';

      function addHandler(h: any) {
        timer(time1, time2, rxTestScheduler).pipe(mapTo('ev'), take(2), concat(NEVER)).subscribe(h);
      }
      const e1 = fromEventPattern(addHandler);

      expectObservable(e1).toBe(expected, { x: 'ev' });
    });
  });

  it('should call addHandler on subscription', () => {
    const addHandler = jest.fn();
    fromEventPattern(addHandler, noop).subscribe(noop);

    const call = addHandler.mock.calls;
    expect(addHandler).toHaveBeenCalledTimes(1);
    expect(type(call[0][0])).toBe('function');
  });

  it('should call removeHandler on unsubscription', () => {
    const removeHandler = jest.fn();

    fromEventPattern(noop, removeHandler).subscribe(noop).unsubscribe();

    const call = removeHandler.mock.calls;
    expect(removeHandler).toHaveBeenCalledTimes(1);
    expect(type(call[0][0])).toBe('function');
  });

  it('should work without optional removeHandler', () => {
    const addHandler: (h: Callback) => any = jest.fn();
    fromEventPattern(addHandler).subscribe(noop);

    expect(addHandler).toHaveBeenCalledTimes(1);
  });

  it('should deliver return value of addHandler to removeHandler as signal', () => {
    const expected = { signal: true };
    const addHandler = () => expected;
    const removeHandler = jest.fn();
    fromEventPattern(addHandler, removeHandler).subscribe(noop).unsubscribe();

    expect(removeHandler).toHaveBeenCalledWith(expect.anything(), expected);
  });

  it('should send errors in addHandler down the error path', (_, done) => {
    fromEventPattern((h: any) => {
      throw 'bad';
    }, noop).subscribe({
      next: () => done(new Error('should not be called')),
      error: (err: any) => {
        expect(err).toEqual('bad');
        done();
      },
      complete: () => done(new Error('should not be called')),
    });
  });

  it('should accept a selector that maps outgoing values', (_, done) => {
    let target: any;
    const trigger = function (...args: any[]) {
      if (target) {
        (target as Callback)(args);
      }
    };

    const addHandler = (handler: any) => {
      target = handler;
    };
    const removeHandler = (handler: any) => {
      target = undefined;
    };
    const selector = (a: any, b: any) => {
      return a + b + '!';
    };

    fromEventPattern(addHandler, removeHandler, selector)
      .pipe(take(1))
      .subscribe({
        next: (x: any) => {
          expect(x).toEqual('testme!');
        },
        error: (err: any) => {
          done(new Error('should not be called'));
        },
        complete: () => {
          done();
        },
      });

    trigger('test', 'me');
  });

  it('should send errors in the selector down the error path', (_, done) => {
    let target: any;
    const trigger = (value: any) => {
      if (target) {
        target(value);
      }
    };

    const addHandler = (handler: any) => {
      target = handler;
    };
    const removeHandler = (handler: any) => {
      target = undefined;
    };
    const selector = (x: any) => {
      throw 'bad';
    };

    fromEventPattern(addHandler, removeHandler, selector).subscribe({
      next: (x: any) => {
        done(new Error('should not be called'));
      },
      error: (err: any) => {
        expect(err).toEqual('bad');
        done();
      },
      complete: () => {
        done(new Error('should not be called'));
      },
    });

    trigger('test');
  });
});
