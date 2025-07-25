import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { Error, Array, Object, setTimeout, setInterval, clearTimeout, clearInterval } from '@rbxts/luau-polyfill';
import { TestScheduler } from '@rbxts/rx/out/testing';
import { from, merge, defer, Observable, noop } from '@rbxts/rx';
import { shareLatest } from '@rbxts/react-rx';
import { withLatestFrom, startWith, map, take } from '@rbxts/rx/out/operators';

const scheduler = () =>
  new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected);
  });

describe('shareLatest', () => {
  describe('public shareLatest', () => {
    // prettier-ignore
    it("should restart due to unsubscriptions", () => {
    scheduler().run(({ expectObservable, expectSubscriptions, cold }) => {
      const sourceSubs = []
      const source = cold("a-b-c-d-e-f-g-h-i-j")
      sourceSubs.push("   ^------!----------------------")
      sourceSubs.push("   -----------^------------------")
      const sub1 = "      ^------!"
      const expected1 = " a-b-c-d-"
      const sub2 = "      -----------^------------------"
      const expected2 = " -----------a-b-c-d-e-f-g-h-i-j"

      const shared = shareLatest()(source)

      expectObservable(shared, sub1).toBe(expected1)
      expectObservable(shared, sub2).toBe(expected2)
      expectSubscriptions(source.subscriptions).toBe(sourceSubs)
    })
  })

    // prettier-ignore
    it("should restart due to unsubscriptions when the source has completed", () => {
    scheduler().run(({ expectObservable, expectSubscriptions, cold }) => {
      const sourceSubs = []
      const source = cold('a-(b|)          ');
      sourceSubs.push(    '-^-!            ');
      sourceSubs.push(    '-----------^-!');
      const sub1 =        '-^--!          ';
      const expected1 =   '-a-(b|)         ';
      const sub2 =        '-----------^--!';
      const expected2 =   '-----------a-(b|)';

      const shared = shareLatest()(source)

      expectObservable(shared, sub1).toBe(expected1);
      expectObservable(shared, sub2).toBe(expected2);
      expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    })
    })

    // prettier-ignore
    it("should be able to handle recursively synchronous subscriptions", () => {
    scheduler().run(({ expectObservable, hot }) => {
      const values0 = hot('----b-c-d---')
      const latest0 = hot('----------x-')
      const expected = '   a---b-c-d-d-'
      const input0 = merge(
        values0,
        latest0.pipe(
          withLatestFrom(defer(() => result0)),
          map(([, latest]) => latest)
        )
      )

      const result0: any = input0.pipe(
        startWith('a'),
        shareLatest()
      )

      expectObservable(result0, '^').toBe(expected)
    })
    })

    // prettier-ignore
    it("should not skip values on a sync source", () => {
      scheduler().run(({ expectObservable }) => {
        const source = from(['a', 'b', 'c', 'd']) // cold("(abcd|)")
        const sub1 =         '^';
        const expected1 = "  (abcd|)"

        const shared = shareLatest()(source);

        expectObservable(shared, sub1).toBe(expected1);
      })
    })

    it('should stop listening to a synchronous observable when unsubscribed', () => {
      let sideEffects = 0;
      const synchronousObservable = new Observable<number>((subscriber) => {
        // This will check to see if the subscriber was closed on each loop
        // when the unsubscribe hits (from the `take`), it should be closed
        for (let i = 0; !subscriber.closed && i < 10; i++) {
          sideEffects++;
          subscriber.next(i);
        }
      });
      synchronousObservable.pipe(shareLatest(), take(3)).subscribe(noop);
      expect(sideEffects).toBe(3);
    });
  });
});
