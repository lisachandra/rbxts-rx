import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { retryWhen, map, mergeMap, takeUntil, take } from '@rbxts/rx/out/operators';
import { of, EMPTY, Observable, throwError } from '@rbxts/rx';
import { TestScheduler } from '@rbxts/rx/out/testing';
import { observableMatcher } from '../helpers/observableMatcher';
import { Error } from '@rbxts/luau-polyfill';

/** @test {retryWhen} */
describe('retryWhen', () => {
  let rxTest: TestScheduler;

  beforeEach(() => {
    rxTest = new TestScheduler(observableMatcher);
  });

  it('should handle a source with eventual error using a hot notifier', () => {
    rxTest.run(({ cold, hot, expectObservable, expectSubscriptions }) => {
      const source = cold(' -1--2--#                     ');
      //                                 -1--2--#
      //                                              -1--2--#
      const subs = [
        '                   ^------!                     ',
        '                   -------------^------!        ',
        '                   --------------------------^-!',
      ];
      const notifier = hot('-------------r------------r-|');
      const expected = '    -1--2---------1--2---------1|';

      const result = source.pipe(retryWhen(() => notifier));

      expectObservable(result).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should handle a source with eventual error using a hot notifier that raises error', () => {
    rxTest.run(({ cold, hot, expectObservable, expectSubscriptions }) => {
      const source = cold(' -1--2--#                      ');
      //                               -1--2--#
      //                                       -1--2--#
      const subs = [
        '                   ^------!                      ',
        '                   -----------^------!           ',
        '                   -------------------^------!   ',
      ];
      const notifier = hot('-----------r-------r---------#');
      const expected = '    -1--2-------1--2----1--2-----#';

      const result = source.pipe(retryWhen(() => notifier));

      expectObservable(result).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should retry when notified via returned notifier on thrown error', (_, done) => {
    let retried = false;
    const expected = [1, 2, 1, 2];
    let i = 0;
    of(1, 2, 3)
      .pipe(
        map((n: number) => {
          if (n === 3) {
            throw 'bad';
          }
          return n;
        }),
        retryWhen((errors) =>
          errors.pipe(
            map((x: any) => {
              expect(x).toEqual('bad');
              if (retried) {
                throw new Error('done');
              }
              retried = true;
              return x;
            })
          )
        )
      )
      .subscribe({
        next: (x: any) => {
          expect(x).toEqual(expected[i++]);
        },
        error: (err: any) => {
          expect(err).toBeInstanceOf(Error);
          done();
        },
      });
  });

  it('should retry when notified and complete on returned completion', (_, done) => {
    const expected = [1, 2, 1, 2];
    of(1, 2, 3)
      .pipe(
        map((n: number) => {
          if (n === 3) {
            throw 'bad';
          }
          return n;
        }),
        retryWhen(() => EMPTY)
      )
      .subscribe({
        next: (n: number) => {
          expect(n).toEqual(expected.shift());
        },
        error: () => {
          done(new Error('should not be called'));
        },
        complete: () => {
          done();
        },
      });
  });

  it('should apply an empty notifier on an empty source', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const source = cold('  |   ');
      const subs = '         (^!)';
      const notifier = cold('|   ');
      const expected = '     |   ';

      const result = source.pipe(retryWhen(() => notifier));

      expectObservable(result).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should apply a never notifier on an empty source', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const source = cold('  |   ');
      const subs = '         (^!)';
      const notifier = cold('-   ');
      const expected = '     |   ';

      const result = source.pipe(retryWhen(() => notifier));

      expectObservable(result).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should apply an empty notifier on a never source', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const source = cold('  ------------------------------------------');
      const unsub = '        -----------------------------------------!';
      const subs = '         ^----------------------------------------!';
      const notifier = cold('|                                         ');
      const expected = '     ------------------------------------------';

      const result = source.pipe(retryWhen(() => notifier));

      expectObservable(result, unsub).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should apply a never notifier on a never source', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const source = cold('  -----------------------------------------');
      const unsub = '        -----------------------------------------!';
      const subs = '         ^----------------------------------------!';
      const notifier = cold('------------------------------------------');
      const expected = '     -----------------------------------------';

      const result = source.pipe(retryWhen(() => notifier));

      expectObservable(result, unsub).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should return an empty observable given a just-throw source and empty notifier', () => {
    rxTest.run(({ cold, expectObservable }) => {
      const source = cold('  #');
      const notifier = cold('|');
      const expected = '     |';

      const result = source.pipe(retryWhen(() => notifier));

      expectObservable(result).toBe(expected);
    });
  });

  it('should return a never observable given a just-throw source and never notifier', () => {
    rxTest.run(({ cold, expectObservable }) => {
      const source = cold('  #');
      const notifier = cold('-');
      const expected = '     -';

      const result = source.pipe(retryWhen(() => notifier));

      expectObservable(result).toBe(expected);
    });
  });

  it('should hide errors using a never notifier on a source with eventual error', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const source = cold('  --a--b--c--#                              ');
      const subs = '         ^----------!                              ';
      const notifier = cold('           -------------------------------');
      const expected = '     --a--b--c---------------------------------';

      const result = source.pipe(retryWhen(() => notifier));

      expectObservable(result).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should propagate error thrown from notifierSelector function', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const source = cold('--a--b--c--#');
      const subs = '       ^----------!';
      const expected = '   --a--b--c--#';

      const result = source.pipe(
        retryWhen(() => {
          throw 'bad!';
        })
      );

      expectObservable(result).toBe(expected, undefined, 'bad!');
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should replace error with complete using an empty notifier on a source with eventual error', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const source = cold('  --a--b--c--#');
      const subs = '         ^----------!';
      const notifier = cold('           |');
      const expected = '     --a--b--c--|';

      const result = source.pipe(retryWhen(() => notifier));

      expectObservable(result).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should mirror a basic cold source with complete, given an empty notifier', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const source = cold('  --a--b--c--|');
      const subs = '         ^----------!';
      const notifier = cold('           |');
      const expected = '     --a--b--c--|';

      const result = source.pipe(retryWhen(() => notifier));

      expectObservable(result).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should mirror a basic cold source with no termination, given an empty notifier', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const source = cold('  --a--b--c---');
      const subs = '         ^-----------';
      const notifier = cold('           |');
      const expected = '     --a--b--c---';

      const result = source.pipe(retryWhen(() => notifier));

      expectObservable(result).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should mirror a basic hot source with complete, given an empty notifier', () => {
    rxTest.run(({ cold, hot, expectObservable, expectSubscriptions }) => {
      const source = hot('-a-^--b--c--|');
      const subs = '         ^--------!';
      const notifier = cold('         |');
      const expected = '     ---b--c--|';

      const result = source.pipe(retryWhen(() => notifier));

      expectObservable(result).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should handle a hot source that raises error but eventually completes', () => {
    rxTest.run(({ hot, expectObservable, expectSubscriptions }) => {
      const source = hot('  -1--2--3----4--5---|                  ');
      const ssubs = [
        '                   ^------!                              ',
        '                   --------------^----!                  ',
      ];
      const notifier = hot('--------------r--------r---r--r--r---|');
      const nsubs = '       -------^-----------!                  ';
      const expected = '    -1--2----------5---|                  ';

      const result = source.pipe(
        map((x: string) => {
          if (x === '3') {
            throw 'error';
          }
          return x;
        }),
        retryWhen(() => notifier)
      );

      expectObservable(result).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(ssubs);
      expectSubscriptions(notifier.subscriptions).toBe(nsubs);
    });
  });

  it('should tear down resources when result is unsubscribed early', () => {
    rxTest.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
      const source = cold(' -1--2--#                    ');
      //                             -1--2--#
      //                                     -1--2--#
      const unsub = '       --------------------!       ';
      const subs = [
        '                   ^------!                    ',
        '                   ---------^------!           ',
        '                   -----------------^--!       ',
      ];
      const notifier = hot('---------r-------r---------#');
      const nsubs = '       -------^------------!       ';
      const expected = '    -1--2-----1--2----1--       ';

      const result = source.pipe(retryWhen(() => notifier));

      expectObservable(result, unsub).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
      expectSubscriptions(notifier.subscriptions).toBe(nsubs);
    });
  });

  it('should not break unsubscription chains when unsubscribed explicitly', () => {
    rxTest.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
      const source = cold(' -1--2--#                    ');
      //                             -1--2--#
      //                                     -1--2--#
      const subs = [
        '                   ^------!                    ',
        '                   ---------^------!           ',
        '                   -----------------^--!       ',
      ];
      const notifier = hot('---------r-------r-------r-#');
      const nsubs = '       -------^------------!       ';
      const expected = '    -1--2-----1--2----1--       ';
      const unsub = '       --------------------!       ';

      const result = source.pipe(
        mergeMap((x: string) => of(x)),
        retryWhen(() => notifier),
        mergeMap((x: string) => of(x))
      );

      expectObservable(result, unsub).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
      expectSubscriptions(notifier.subscriptions).toBe(nsubs);
    });
  });

  it('should handle a source with eventual error using a dynamic notifier selector which eventually throws', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const source = cold('-1--2--#              ');
      //                          -1--2--#
      //                                 -1--2--#
      const subs = [
        '                  ^------!              ',
        '                  -------^------!       ',
        '                  --------------^------!',
      ];
      const expected = '   -1--2---1--2---1--2--#';

      let invoked = 0;
      const result = source.pipe(
        retryWhen((errors) =>
          errors.pipe(
            map(() => {
              if (++invoked === 3) {
                throw 'error';
              } else {
                return 'x';
              }
            })
          )
        )
      );

      expectObservable(result).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should handle a source with eventual error using a dynamic notifier selector which eventually completes', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const source = cold('-1--2--#              ');
      //                          -1--2--#
      //                                 -1--2--#
      const subs = [
        '                  ^------!              ',
        '                  -------^------!       ',
        '                  --------------^------!',
      ];
      const expected = '   -1--2---1--2---1--2--|';

      let invoked = 0;
      const result = source.pipe(
        retryWhen((errors) =>
          errors.pipe(
            map(() => 'x'),
            takeUntil(
              errors.pipe(
                mergeMap(() => {
                  if (++invoked < 3) {
                    return EMPTY;
                  } else {
                    return of('stop!');
                  }
                })
              )
            )
          )
        )
      );

      expectObservable(result).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should always finalize before starting the next cycle, even when synchronous', () => {
    const results: defined[] = [];
    const source = new Observable<number>(function (subscriber) {
      subscriber.next(1);
      subscriber.next(2);
      subscriber.error('bad');
      return () => {
        results.push('finalizer');
      };
    });
    const subscription = source
      .pipe(retryWhen((errors) => errors.pipe(mergeMap((err, i) => (i < 3 ? of(true) : throwError(() => err))))))
      .subscribe({
        next: (value) => results.push(value),
        error: (err) => results.push(err),
      });

    expect(subscription.closed).toBe(true);
    expect(results).toEqual([1, 2, 'finalizer', 1, 2, 'finalizer', 1, 2, 'finalizer', 1, 2, 'bad', 'finalizer']);
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

    synchronousObservable
      .pipe(
        retryWhen(() => of(0)),
        take(3)
      )
      .subscribe(() => {
        /* noop */
      });

    expect(sideEffects).toEqual([0, 1, 2]);
  });
});
