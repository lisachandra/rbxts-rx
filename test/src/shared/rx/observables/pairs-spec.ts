import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { TestScheduler } from '@rbxts/rx/out/testing';
import { pairs as rxPairs } from '@rbxts/rx';
import { observableMatcher } from '../helpers/observableMatcher';
import { Error } from '@rbxts/luau-polyfill';

describe('pairs', () => {
  let rxTestScheduler: TestScheduler;

  beforeEach(() => {
    rxTestScheduler = new TestScheduler(observableMatcher);
  });

  it('should create an observable emits key-value pair', () => {
    rxTestScheduler.run(({ expectObservable }) => {
      const e1 = rxPairs({ a: 1, b: 2 });
      const expected = '(ab|)';
      const values = {
        a: ['a', 1],
        b: ['b', 2],
      };

      expectObservable(e1).toBe(expected, values);
    });
  });

  it('should create an observable without scheduler', (_, done) => {
    const expected = [
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ];

    rxPairs({ a: 1, b: 2, c: 3 }).subscribe({
      next: (x) => {
        expect(x).toEqual(expected.shift());
      },
      error: (x) => {
        done(new Error('should not be called'));
      },
      complete: () => {
        expect(expected).toHaveLength(0);
        done();
      },
    });
  });

  it('should work with empty object', () => {
    rxTestScheduler.run(({ expectObservable }) => {
      const e1 = rxPairs({});
      const expected = '|';

      expectObservable(e1).toBe(expected);
    });
  });
});
