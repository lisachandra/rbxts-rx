import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { repeat as repeat0, mergeMap, map, multicast, refCount, take } from '@rbxts/rx/out/operators';
import { TestScheduler } from '@rbxts/rx/out/testing';
import { of, Subject, Observable, timer } from '@rbxts/rx';
import { observableMatcher } from '../helpers/observableMatcher';
import { Error } from '@rbxts/luau-polyfill';

/** @test {repeat} */
describe('repeat operator', () => {
  let rxTest: TestScheduler;

  beforeEach(() => {
    rxTest = new TestScheduler(observableMatcher);
  });

  it('should resubscribe count number of times', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold(' --a--b--|                ');
      const subs = [
        '               ^-------!                ', //
        '               --------^-------!        ',
        '               ----------------^-------!',
      ];
      const expected = '--a--b----a--b----a--b--|';

      expectObservable(e1.pipe(repeat0(3))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should resubscribe multiple times', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold(' --a--b--|                        ');
      const subs = [
        '               ^-------!                        ',
        '               --------^-------!                ',
        '               ----------------^-------!        ',
        '               ------------------------^-------!',
      ];
      const expected = '--a--b----a--b----a--b----a--b--|';

      expectObservable(e1.pipe(repeat0(2), repeat0(2))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should complete without emit when count is zero', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold('--a--b--|');
      const subs: string[] = [];
      const expected = '|';

      expectObservable(e1.pipe(repeat0(0))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should emit source once when count is one', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold(' --a--b--|');
      const subs = '    ^-------!';
      const expected = '--a--b--|';

      expectObservable(e1.pipe(repeat0(1))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should repeat until gets unsubscribed', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold(' --a--b--|      ');
      const subs = [
        '               ^-------!      ', //
        '               --------^------!',
      ];
      const unsub = '   ---------------!';
      const expected = '--a--b----a--b-';

      expectObservable(e1.pipe(repeat0(10)), unsub).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should be able to repeat indefinitely until unsubscribed', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold(' --a--b--|                                    ');
      const subs = [
        '               ^-------!                                    ',
        '               --------^-------!                            ',
        '               ----------------^-------!                    ',
        '               ------------------------^-------!            ',
        '               --------------------------------^-------!    ',
        '               ----------------------------------------^---!',
      ];
      const unsub = '   --------------------------------------------!';
      const expected = '--a--b----a--b----a--b----a--b----a--b----a--';

      expectObservable(e1.pipe(repeat0()), unsub).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should not break unsubscription chain when unsubscribed explicitly', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold(' --a--b--|                                    ');
      const subs = [
        '               ^-------!                                    ',
        '               --------^-------!                            ',
        '               ----------------^-------!                    ',
        '               ------------------------^-------!            ',
        '               --------------------------------^-------!    ',
        '               ----------------------------------------^---!',
      ];
      const unsub = '   --------------------------------------------!';
      const expected = '--a--b----a--b----a--b----a--b----a--b----a--';

      const result = e1.pipe(
        mergeMap((x: string) => of(x)),
        repeat0(),
        mergeMap((x: string) => of(x))
      );

      expectObservable(result, unsub).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should consider negative count as no repeat, and return EMPTY', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold('--a--b--|                                    ');
      const expected = '|';

      expectObservable(e1.pipe(repeat0(-1))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe([]);
    });
  });

  it('should always finalization before starting the next cycle', async () => {
    const results: defined[] = [];
    const source = new Observable<number>(function (subscriber) {
      Promise.resolve().then(() => {
        subscriber.next(1);
        Promise.resolve().then(() => {
          subscriber.next(2);
          Promise.resolve().then(() => {
            subscriber.complete();
          });
        });
      });
      return () => {
        results.push('finalizer');
      };
    });

    await source.pipe(repeat0(3)).forEach((value) => results.push(value));

    expect(results).toEqual([1, 2, 'finalizer', 1, 2, 'finalizer', 1, 2, 'finalizer']);
  });

  it('should always finalize before starting the next cycle, even when synchronous', () => {
    const results: defined[] = [];
    const source = new Observable<number>(function (subscriber) {
      subscriber.next(1);
      subscriber.next(2);
      subscriber.complete();
      return () => {
        results.push('finalizer');
      };
    });
    const subscription = source.pipe(repeat0(3)).subscribe({
      next: (value) => results.push(value),
      complete: () => results.push('complete'),
    });

    expect(subscription.closed).toBe(true);
    expect(results).toEqual([1, 2, 'finalizer', 1, 2, 'finalizer', 1, 2, 'complete', 'finalizer']);
  });

  it('should not complete when source never completes', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold('-');
      const e1subs = '^';
      const expected = '-';

      expectObservable(e1.pipe(repeat0(3))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should not complete when source does not completes', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold('-');
      const unsub = '------------------------------!';
      const subs = ' ^-----------------------------!';
      const expected = '-';

      expectObservable(e1.pipe(repeat0(3)), unsub).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should complete immediately when source does not complete without emit but count is zero', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold('-');
      const subs: string[] = [];
      const expected = '|';

      expectObservable(e1.pipe(repeat0(0))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should complete immediately when source does not complete but count is zero', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold('--a--b--');
      const subs: string[] = [];
      const expected = '|';

      expectObservable(e1.pipe(repeat0(0))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should emit source once and does not complete when source emits but does not complete', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold(' --a--b--');
      const subs = ['   ^-------'];
      const expected = '--a--b--';

      expectObservable(e1.pipe(repeat0(3))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should complete when source is empty', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold('|');
      const e1subs = ['(^!)', '(^!)', '(^!)'];
      const expected = '|';

      expectObservable(e1.pipe(repeat0(3))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should complete when source does not emit', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold('----|        ');
      const subs = [
        '              ^---!        ', //
        '              ----^---!    ',
        '              --------^---!',
      ];
      const expected = '------------|';

      expectObservable(e1.pipe(repeat0(3))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should complete immediately when source does not emit but count is zero', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold('----|');
      const subs: string[] = [];
      const expected = '|';

      expectObservable(e1.pipe(repeat0(0))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should raise error when source raises error', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold(' --a--b--#');
      const subs = '    ^-------!';
      const expected = '--a--b--#';

      expectObservable(e1.pipe(repeat0(2))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should raises error if source throws', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold('#');
      const e1subs = '(^!)';
      const expected = '#';

      expectObservable(e1.pipe(repeat0(3))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should raises error if source throws when repeating infinitely', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold('#');
      const e1subs = '(^!)';
      const expected = '#';

      expectObservable(e1.pipe(repeat0())).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should raise error after first emit succeed', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      let repeated = false;

      const e1 = cold('--a--|').pipe(
        map((x: string) => {
          if (repeated) {
            throw 'error';
          } else {
            repeated = true;
            return x;
          }
        })
      );
      const expected = '--a----#';

      expectObservable(e1.pipe(repeat0(2))).toBe(expected);
    });
  });

  it('should repeat a synchronous source (multicasted and refCounted) multiple times', (_, done) => {
    const expected = [1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3];

    of(1, 2, 3)
      .pipe(
        multicast(() => new Subject<number>()),
        refCount(),
        repeat0(5)
      )
      .subscribe({
        next: (x: number) => {
          expect(x).toEqual(expected.shift());
        },
        error: (x) => {
          done(new Error('should not be called'));
        },
        complete: () => {
          expect(expected.size()).toEqual(0);
          done();
        },
      });
  });

  it('should stop listening to a synchronous observable when unsubscribed', () => {
    const sideEffects: number[] = [];
    const synchronousObservable = new Observable<number>(function (subscriber) {
      // This will check to see if the subscriber was closed on each loop
      // when the unsubscribe hits (from the `take`), it should be closed
      for (let i = 0; !subscriber.closed && i < 10; i++) {
        sideEffects.push(i);
        subscriber.next(i);
      }
    });

    synchronousObservable.pipe(repeat0(), take(3)).subscribe(() => {
      /* noop */
    });

    expect(sideEffects).toEqual([0, 1, 2]);
  });

  it('should allow count configuration', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold(' --a--b--|                ');
      const subs = [
        '               ^-------!                ', //
        '               --------^-------!        ',
        '               ----------------^-------!',
      ];
      const expected = '--a--b----a--b----a--b--|';

      expectObservable(e1.pipe(repeat0({ count: 3 }))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should allow delay time configuration', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold(' --a--b--|                ');
      const delay = 3; //       ---|       ---|
      const subs = [
        '               ^-------!                ', //
        '               -----------^-------!        ',
        '               ----------------------^-------!',
      ];
      const expected = '--a--b-------a--b-------a--b--|';

      expectObservable(e1.pipe(repeat0({ count: 3, delay }))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should allow delay function configuration', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const expectedCounts = [1, 2, 3];

      const e1 = cold(' --a--b--|                ');
      const delay = 3; //       ---|       ---|
      const subs = [
        '               ^-------!                ', //
        '               -----------^-------!        ',
        '               ----------------------^-------!',
      ];
      const expected = '--a--b-------a--b-------a--b--|';

      expectObservable(
        e1.pipe(
          repeat0({
            count: 3,
            delay: (count) => {
              expect(count).toEqual(expectedCounts.shift());
              return timer(delay);
            },
          })
        )
      ).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should handle delay function throwing', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const expectedCounts = [1, 2, 3];

      const e1 = cold(' --a--b--|                ');
      const delay = 3; //       ---|       ---|
      const subs = [
        '               ^-------!                ', //
        '               -----------^-------!        ',
      ];
      const expected = '--a--b-------a--b--#';

      expectObservable(
        e1.pipe(
          repeat0({
            count: 3,
            delay: (count) => {
              if (count === 2) {
                throw 'bad';
              }
              return timer(delay);
            },
          })
        )
      ).toBe(expected, undefined, 'bad');
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });
});
