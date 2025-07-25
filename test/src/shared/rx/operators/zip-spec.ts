import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { zip } from '@rbxts/rx/out/operators';
import { TestScheduler } from '@rbxts/rx/out/testing';
import { observableMatcher } from '../helpers/observableMatcher';
import { Error } from '@rbxts/luau-polyfill';

/** @test {zip} */
describe('zip', () => {
  let rxTestScheduler: TestScheduler;

  beforeEach(() => {
    rxTestScheduler = new TestScheduler(observableMatcher);
  });

  it('should work with non-empty observable and non-empty iterable selector that throws', () => {
    rxTestScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      const a = hot('---^--1--2--3--|');
      const asubs = '   ^-----!';
      const expected = '---x--#';
      const b = [4, 5, 6];

      const selector = function (x: string, y: number) {
        if (y === 5) {
          throw new Error('too bad');
        } else {
          return x + y;
        }
      };
      expectObservable(a.pipe(zip(b, selector))).toBe(expected, { x: '14' }, new Error('too bad'));
      expectSubscriptions(a.subscriptions).toBe(asubs);
    });
  });
});
