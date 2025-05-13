import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { Error, Array, Object, setTimeout, setInterval, clearTimeout, clearInterval } from '@rbxts/luau-polyfill';
import { map } from '@rbxts/rx/out/operators';
import { TestScheduler } from '@rbxts/rx/out/testing';
import { mergeWithKey } from '@rbxts/react-rx/out/utils';

const scheduler = () =>
  new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected);
  });

describe('mergeWithKey', () => {
  it('emits the key of the stream that emitted the value', () => {
    scheduler().run(({ expectObservable, cold }) => {
      const sourceA = cold('a---b---|');
      const sourceB = cold('-1--2----3|');
      const expected = '    mn--(op)-q|';

      const result = mergeWithKey({
        strings: sourceA,
        numbers: sourceB,
      }).pipe(map(({ type: kind, payload }) => `${kind}:${payload}`));

      expectObservable(result).toBe(expected, {
        m: 'strings:a',
        n: 'numbers:1',
        o: 'strings:b',
        p: 'numbers:2',
        q: 'numbers:3',
      });
    });
  });
});
