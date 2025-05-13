import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { Error, Array, Object, setTimeout, setInterval, clearTimeout, clearInterval } from '@rbxts/luau-polyfill';
import { TestScheduler } from '@rbxts/rx/out/testing';
import { SUSPENSE } from '@rbxts/react-rx';
import { switchMapSuspended } from '@rbxts/react-rx/out/utils';
import { of } from '@rbxts/rx';

const scheduler = () =>
  new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected);
  });

describe('operators/switchMapSuspended', () => {
  it('acts like a switchMap, but emitting a SUSPENSE when activating the inner stream', () => {
    scheduler().run(({ expectObservable, cold }) => {
      const source = cold('-x---');
      const inner = cold('  ----a');
      const expected = '   -s---a';

      const result0 = source.pipe(switchMapSuspended(() => inner));

      expectObservable(result0).toBe(expected, {
        s: SUSPENSE,
        a: 'a',
      });
    });
  });

  it('emits another SUSPENSE when another inner stream activates', () => {
    scheduler().run(({ expectObservable, cold }) => {
      const source = cold('-x--x');
      const inner = cold('     ----a');
      const expected = '   -s--s---a';

      const result0 = source.pipe(switchMapSuspended(() => inner));

      expectObservable(result0).toBe(expected, {
        s: SUSPENSE,
        a: 'a',
      });
    });
  });

  it('does not emits another SUSPENSE when the next inner stream is sync', () => {
    scheduler().run(({ expectObservable, cold }) => {
      const source = cold('-x--x');
      const inner = of('a');
      const expected = '   -a--a';

      const result0 = source.pipe(switchMapSuspended(() => inner));

      expectObservable(result0).toBe(expected, {
        s: SUSPENSE,
        a: 'a',
      });
    });
  });
});
