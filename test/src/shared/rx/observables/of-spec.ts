import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { of } from '@rbxts/rx';
import { TestScheduler } from '@rbxts/rx/out/testing';
import { concatMap, delay, concatAll } from '@rbxts/rx/out/operators';
import { observableMatcher } from '../helpers/observableMatcher';
import { Error } from '@rbxts/luau-polyfill';

/** @test {of} */
describe('of', () => {
  let rxTestScheduler: TestScheduler;

  beforeEach(() => {
    rxTestScheduler = new TestScheduler(observableMatcher);
  });

  it('should create a cold observable that emits 1, 2, 3', () => {
    rxTestScheduler.run(({ expectObservable, time }) => {
      const delayValue = time('--|');

      const e1 = of(1, 2, 3).pipe(
        // for the purpose of making a nice diagram, spread out the synchronous emissions
        concatMap((x, i) => of(x).pipe(delay(i === 0 ? 0 : delayValue)))
      );
      const expected = 'x-y-(z|)';
      expectObservable(e1).toBe(expected, { x: 1, y: 2, z: 3 });
    });
  });

  it('should create an observable from the provided values', (_, done) => {
    const x = { foo: 'bar' };
    const expected = [1, 'a', x];
    let i = 0;

    of(1, 'a', x).subscribe({
      next: (y: any) => {
        expect(y).toEqual(expected[i++]);
      },
      error: (x) => {
        done(new Error('should not be called'));
      },
      complete: () => {
        done();
      },
    });
  });

  it('should emit one value', (_, done) => {
    let calls = 0;

    of(42).subscribe({
      next: (x: number) => {
        expect(++calls).toEqual(1);
        expect(x).toEqual(42);
      },
      error: (err: any) => {
        done(new Error('should not be called'));
      },
      complete: () => {
        done();
      },
    });
  });

  it('should handle an Observable as the only value', () => {
    rxTestScheduler.run(({ expectObservable }) => {
      const source = of(of('a', 'b', 'c'));
      const result = source.pipe(concatAll());
      expectObservable(result).toBe('(abc|)');
    });
  });

  it('should handle many Observable as the given values', () => {
    rxTestScheduler.run(({ expectObservable }) => {
      const source = of(of('a', 'b', 'c'), of('d', 'e', 'f'));

      const result = source.pipe(concatAll());
      expectObservable(result).toBe('(abcdef|)');
    });
  });
});
