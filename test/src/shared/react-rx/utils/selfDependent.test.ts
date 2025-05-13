import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { Error, Array, Object, setTimeout, setInterval, clearTimeout, clearInterval } from '@rbxts/luau-polyfill';
import { map, withLatestFrom, pluck, share, takeWhile, switchMapTo, delay, startWith } from '@rbxts/rx/out/operators';
import { TestScheduler } from '@rbxts/rx/out/testing';
import { selfDependent } from '@rbxts/react-rx/out/utils';
import { merge, Observable, defer, of } from '@rbxts/rx';
import { SubscriptionLog } from '@rbxts/rx/out/internal/testing/SubscriptionLog';

const scheduler = () =>
  new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected);
  });

const inc = (x: number) => x + 1;
describe('selfDependent', () => {
  it('emits the key of the stream that emitted the value', () => {
    scheduler().run(({ expectObservable, expectSubscriptions, cold }) => {
      let source: Observable<any>;

      const clicks0 = defer(() => source);
      const [_resetableCounter0, connect] = selfDependent<number>();
      const inc0 = clicks0.pipe(withLatestFrom(_resetableCounter0), pluck('1'), map(inc), share());

      const delayedZero0 = of(0).pipe(delay(2));
      const reset0 = inc0.pipe(switchMapTo(delayedZero0));

      const resetableCounter0 = merge(inc0, reset0, of(0)).pipe(
        connect(),
        takeWhile((x) => x < 4, true)
      );

      source = cold('    -***---**---*****--');
      const sourceSub = '^--------------!   ';
      const expected = ' abcd-a-bc-a-bcd(e|)';

      expectObservable(resetableCounter0).toBe(expected, {
        a: 0,
        b: 1,
        c: 2,
        d: 3,
        e: 4,
      });
      expectSubscriptions((source as any as { subscriptions: SubscriptionLog[] }).subscriptions).toBe(sourceSub);
    });
  });

  it('works after unsubscription and re-subscription', () => {
    scheduler().run(({ expectObservable, cold }) => {
      const source = cold('abcde');
      const sourceSub1 = ' ^--!';
      const expected1 = '  abc';
      const sourceSub2 = ' -----^---!';
      const expected2 = '  -----abcd';

      const [lastValue0, connect] = selfDependent<string>();
      const result0 = source.pipe(
        withLatestFrom(lastValue0.pipe(startWith(''))),
        map(([v]) => v),
        connect()
      );

      expectObservable(result0, sourceSub1).toBe(expected1);
      expectObservable(result0, sourceSub2).toBe(expected2);
    });
  });

  it('works after complete and re-subscription', () => {
    scheduler().run(({ expectObservable, cold }) => {
      const source = cold('abc|');
      const sourceSub1 = ' ^---!';
      const expected1 = '  abc|';
      const sourceSub2 = ' -----^---!';
      const expected2 = '  -----abc|';

      const [lastValue0, connect] = selfDependent<string>();
      const result0 = source.pipe(
        withLatestFrom(lastValue0.pipe(startWith(''))),
        map(([v]) => v),
        connect()
      );

      expectObservable(result0, sourceSub1).toBe(expected1);
      expectObservable(result0, sourceSub2).toBe(expected2);
    });
  });

  it('works after error and re-subscription', () => {
    scheduler().run(({ expectObservable, cold }) => {
      const source = cold('abc#');
      const sourceSub1 = ' ^---!';
      const expected1 = '  abc#';
      const sourceSub2 = ' -----^---!';
      const expected2 = '  -----abc#';

      const [lastValue0, connect] = selfDependent<string>();
      const result0 = source.pipe(
        withLatestFrom(lastValue0.pipe(startWith(''))),
        map(([v]) => v),
        connect()
      );

      expectObservable(result0, sourceSub1).toBe(expected1);
      expectObservable(result0, sourceSub2).toBe(expected2);
    });
  });
});
