import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { Error, Array, Object, setTimeout, setInterval, clearTimeout, clearInterval } from '@rbxts/luau-polyfill';
import { TestScheduler } from '@rbxts/rx/out/testing';
import { SUSPENSE } from '@rbxts/react-rx';
import { of } from '@rbxts/rx';
import { suspended } from '@rbxts/react-rx/out/utils';

const scheduler = () =>
  new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected);
  });

describe('operators/suspended', () => {
  it('prepends the stream with SUSPENSE', () => {
    scheduler().run(({ expectObservable, cold }) => {
      const source = cold('----a');
      const expected = '   s---a';

      const result0 = source.pipe(suspended());

      expectObservable(result0).toBe(expected, {
        s: SUSPENSE,
        a: 'a',
      });
    });
  });

  it('does not prepend the source stream with SUSPENSE when the source is sync', () => {
    scheduler().run(({ expectObservable }) => {
      const source = of('a');
      const expected = '(a|)';

      const result0 = source.pipe(suspended());

      expectObservable(result0).toBe(expected, {
        s: SUSPENSE,
        a: 'a',
      });
    });
  });
});
