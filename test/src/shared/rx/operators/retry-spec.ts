import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { retry, map, take, mergeMap, concat, multicast, refCount } from '@rbxts/rx/out/operators';
import { Observable, Observer, defer, range, of, throwError, Subject, timer, EMPTY } from '@rbxts/rx';
import { TestScheduler } from '@rbxts/rx/out/testing';
import { observableMatcher } from '../helpers/observableMatcher';
import { Error } from '@rbxts/luau-polyfill';

/** @test {retry} */
describe('retry', () => {
  let rxTest: TestScheduler;

  beforeEach(() => {
    rxTest = new TestScheduler(observableMatcher);
  });

  it('should handle a basic source that emits next then errors, count=3', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const source = cold('--1-2-3-#');
      const subs = [
        '                  ^-------!                ',
        '                  --------^-------!        ',
        '                  ----------------^-------!',
      ];
      const expected = '   --1-2-3---1-2-3---1-2-3-#';

      const result = source.pipe(retry(2));

      expectObservable(result).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should retry a number of times, without error, then complete', (_, done) => {
    let errors = 0;
    const retries = 2;
    new Observable(function (observer: Observer<number>) {
      observer.next(42);
      observer.complete();
    })
      .pipe(
        map((x: any) => {
          if (++errors < retries) {
            throw 'bad';
          }
          errors = 0;
          return x;
        }),
        retry(retries)
      )
      .subscribe({
        next: (x: number) => {
          expect(x).toEqual(42);
        },
        error: () => {
          expect('this was called').toBe(true);
        },
        complete: done,
      });
  });

  it('should retry a number of times, then call error handler', (_, done) => {
    let errors = 0;
    const retries = 2;
    new Observable(function (observer: Observer<number>) {
      observer.next(42);
      observer.complete();
    })
      .pipe(
        map(() => {
          errors += 1;
          throw 'bad';
        }),
        retry(retries - 1)
      )
      .subscribe({
        next: () => {
          done("shouldn't next");
        },
        error: () => {
          expect(errors).toEqual(2);
          done();
        },
        complete: () => {
          done("shouldn't complete");
        },
      });
  });

  it('should retry a number of times, then call error handler (with resetOnSuccess)', (_, done) => {
    let errors = 0;
    const retries = 2;
    new Observable(function (observer: Observer<number>) {
      observer.next(42);
      observer.complete();
    })
      .pipe(
        map(() => {
          errors += 1;
          throw 'bad';
        }),
        retry({ count: retries - 1, resetOnSuccess: true })
      )
      .subscribe({
        next: () => {
          done("shouldn't next");
        },
        error: () => {
          expect(errors).toEqual(2);
          done();
        },
        complete: () => {
          done("shouldn't complete");
        },
      });
  });

  it('should retry a number of times, then call next handler without error, then retry and complete', (_, done) => {
    let index = 0;
    let errors = 0;
    const retries = 2;
    defer(() => range(0, 4 - index))
      .pipe(
        mergeMap(() => {
          index++;
          if (index === 1 || index === 3) {
            errors++;
            return throwError(() => 'bad');
          } else {
            return of(42);
          }
        }),
        retry({ count: retries - 1, resetOnSuccess: true })
      )
      .subscribe({
        next: (x: number) => {
          expect(x).toEqual(42);
        },
        error: () => {
          done("shouldn't error");
        },
        complete: () => {
          expect(errors).toEqual(retries);
          done();
        },
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
    const subscription = source.pipe(retry(3)).subscribe({
      next: (value) => results.push(value),
      error: (err) => results.push(err),
    });

    expect(subscription.closed).toBe(true);
    expect(results).toEqual([1, 2, 'finalizer', 1, 2, 'finalizer', 1, 2, 'finalizer', 1, 2, 'bad', 'finalizer']);
  });

  it('should retry a number of times, then call next handler without error, then retry and error', (_, done) => {
    let index = 0;
    let errors = 0;
    const retries = 2;
    defer(() => range(0, 4 - index))
      .pipe(
        mergeMap(() => {
          index++;
          if (index === 1 || index === 3) {
            errors++;
            return throwError(() => 'bad');
          } else {
            return of(42);
          }
        }),
        retry({ count: retries - 1, resetOnSuccess: false })
      )
      .subscribe({
        next: (x: number) => {
          expect(x).toEqual(42);
        },
        error: () => {
          expect(errors).toEqual(retries);
          done();
        },
        complete: () => {
          done("shouldn't complete");
        },
      });
  });

  it('should retry until successful completion', (_, done) => {
    let errors = 0;
    const retries = 10;
    new Observable(function (observer: Observer<number>) {
      observer.next(42);
      observer.complete();
    })
      .pipe(
        map((x: any) => {
          if (++errors < retries) {
            throw 'bad';
          }
          errors = 0;
          return x;
        }),
        retry(),
        take(retries)
      )
      .subscribe({
        next: (x: number) => {
          expect(x).toEqual(42);
        },
        error: () => {
          expect('this was called').toBe(true);
        },
        complete: done,
      });
  });

  it('should handle an empty source', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const source = cold('|  ');
      const subs = '      (^!)';
      const expected = '   |  ';

      const result = source.pipe(retry());

      expectObservable(result).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should handle a never source', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const source = cold('-');
      const subs = '       ^';
      const expected = '   -';

      const result = source.pipe(retry());

      expectObservable(result).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should return a never observable given an async just-throw source and no count', () => {
    rxTest.run(({ cold, expectObservable }) => {
      const source = cold('-#                                    '); // important that it's not a sync error
      const unsub = '     -------------------------------------!';
      const expected = '  --------------------------------------';

      const result = source.pipe(retry());

      expectObservable(result, unsub).toBe(expected);
    });
  });

  it('should handle a basic source that emits next then completes', () => {
    rxTest.run(({ hot, expectObservable, expectSubscriptions }) => {
      const source = hot('--1--2--^--3--4--5---|');
      const subs = '              ^------------!';
      const expected = '          ---3--4--5---|';

      const result = source.pipe(retry());

      expectObservable(result).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should handle a basic source that emits next but does not complete', () => {
    rxTest.run(({ hot, expectObservable, expectSubscriptions }) => {
      const source = hot('--1--2--^--3--4--5---');
      const subs = '              ^------------';
      const expected = '          ---3--4--5---';

      const result = source.pipe(retry());

      expectObservable(result).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should handle a basic source that emits next then errors, no count', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const source = cold('--1-2-3-#                             ');
      //                           --1-2-3-#
      //                                   --1-2-3-#
      //                                           --1-2-3-#
      //                                                   --1-2-3-#
      const unsub = '      -------------------------------------!';
      const subs = [
        '                  ^-------!                             ',
        '                  --------^-------!                     ',
        '                  ----------------^-------!             ',
        '                  ------------------------^-------!     ',
        '                  --------------------------------^----!',
      ];
      const expected = '   --1-2-3---1-2-3---1-2-3---1-2-3---1-2-';

      const result = source.pipe(retry());

      expectObservable(result, unsub).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should handle a source which eventually throws, count=3, and result is unsubscribed early', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const source = cold('--1-2-3-#     ');
      //                           --1-2-3-#
      const unsub = '      -------------!';
      // prettier-ignore
      const subs = [
        '                  ^-------!     ',
        '                  --------^----!',
      ];
      const expected = '   --1-2-3---1-2-';

      const result = source.pipe(retry(3));

      expectObservable(result, unsub).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should not break unsubscription chain when unsubscribed explicitly', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const source = cold('--1-2-3-#     ');
      //                           --1-2-3-#
      // prettier-ignore
      const subs = [
        '                  ^-------!     ',
        '                  --------^----!',
      ];
      const expected = '   --1-2-3---1-2-';
      const unsub = '      -------------!';

      const result = source.pipe(
        mergeMap((x: string) => of(x)),
        retry(100),
        mergeMap((x: string) => of(x))
      );

      expectObservable(result, unsub).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should retry a synchronous source (multicasted and refCounted) multiple times', (_, done) => {
    const expected = [1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3];

    of(1, 2, 3)
      .pipe(
        concat(throwError(() => 'bad!')),
        multicast(() => new Subject<number>()),
        refCount(),
        retry(4)
      )
      .subscribe({
        next: (x: number) => {
          expect(x).toEqual(expected.shift());
        },
        error: (err: any) => {
          expect(err).toEqual('bad!');
          expect(expected.size()).toEqual(0);
          done();
        },
        complete: () => {
          done(new Error('should not be called'));
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

    synchronousObservable.pipe(retry(1), take(3)).subscribe(() => {
      /* noop */
    });

    expect(sideEffects).toEqual([0, 1, 2]);
  });

  it('should not alter the source when the number of retries is smaller than 1', () => {
    rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
      const source = cold('--1-2-3-# ');
      const subs = ['      ^-------! '];

      const expected = '   --1-2-3-# ';
      const unsub = '      ---------!';

      const result = source.pipe(retry(0));

      expectObservable(result, unsub).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  describe('with delay config', () => {
    describe('of a number', () => {
      it('should delay the retry by a specified amount of time', () => {
        rxTest.run(({ cold, time, expectSubscriptions, expectObservable }) => {
          const source = cold('---a---b---#');
          const t = time('                ----|');
          const subs = [
            //
            '                  ^----------!',
            '                  ---------------^----------!',
            '                  ------------------------------^----------!',
            '                  ---------------------------------------------^----!',
          ];
          const unsub = '      ^-------------------------------------------------!';
          const expected = '   ---a---b----------a---b----------a---b----------a--';
          const result = source.pipe(
            retry({
              delay: t,
            })
          );
          expectObservable(result, unsub).toBe(expected);
          expectSubscriptions(source.subscriptions).toBe(subs);
        });
      });

      it('should act like a normal retry if delay is set to 0', () => {
        rxTest.run(({ cold, expectSubscriptions, expectObservable }) => {
          const source = cold('---a---b---#');
          const subs = [
            //
            '                  ^----------!',
            '                  -----------^----------!',
            '                  ----------------------^----------!',
            '                  ---------------------------------^----!',
          ];
          const unsub = '      ^-------------------------------------!';
          const expected = '   ---a---b------a---b------a---b------a--';
          const result = source.pipe(
            retry({
              delay: 0,
            })
          );
          expectObservable(result, unsub).toBe(expected);
          expectSubscriptions(source.subscriptions).toBe(subs);
        });
      });

      it('should act like a normal retry if delay is less than 0', () => {
        rxTest.run(({ cold, expectSubscriptions, expectObservable }) => {
          const source = cold('---a---b---#');
          const subs = [
            //
            '                  ^----------!',
            '                  -----------^----------!',
            '                  ----------------------^----------!',
            '                  ---------------------------------^----!',
          ];
          const unsub = '      ^-------------------------------------!';
          const expected = '   ---a---b------a---b------a---b------a--';
          const result = source.pipe(
            retry({
              delay: -100,
            })
          );
          expectObservable(result, unsub).toBe(expected);
          expectSubscriptions(source.subscriptions).toBe(subs);
        });
      });

      it('should honor count as the max retries', () => {
        rxTest.run(({ cold, time, expectSubscriptions, expectObservable }) => {
          const source = cold('---a---b---#');
          const t = time('                ----|');
          const subs = [
            //
            '                  ^----------!',
            '                  ---------------^----------!',
            '                  ------------------------------^----------!',
          ];
          const expected = '   ---a---b----------a---b----------a---b---#';
          const result = source.pipe(
            retry({
              count: 2,
              delay: t,
            })
          );
          expectObservable(result).toBe(expected);
          expectSubscriptions(source.subscriptions).toBe(subs);
        });
      });
    });

    describe('of a function', () => {
      it('should delay the retry with a function that returns a notifier', () => {
        rxTest.run(({ cold, expectSubscriptions, expectObservable }) => {
          const source = cold('---a---b---#');
          const subs = [
            //
            '                  ^----------!',
            '                  ------------^----------!',
            '                  -------------------------^----------!',
            '                  ---------------------------------------^----!',
          ];
          const unsub = '      ^-------------------------------------------!';
          const expected = '   ---a---b-------a---b--------a---b---------a--';
          const result = source.pipe(
            retry({
              delay: (_err, retryCount) => {
                // retryCount will be 1, 2, 3, etc.
                return timer(retryCount);
              },
            })
          );
          expectObservable(result, unsub).toBe(expected);
          expectSubscriptions(source.subscriptions).toBe(subs);
        });
      });

      it('should delay the retry with a function that returns a hot observable', () => {
        rxTest.run(({ cold, hot, expectSubscriptions, expectObservable }) => {
          const source = cold(' ---a---b---#');
          const notifier = hot('--------------x----------------x----------------x------');
          const subs = [
            //
            '                   ^----------!',
            '                   --------------^----------!',
            '                   -------------------------------^----------!',
          ];
          const notifierSubs = [
            //
            '                   -----------^--!',
            '                   -------------------------^-----!',
            '                   ------------------------------------------^-!',
          ];
          const unsub = '       ^-------------------------------------------!';
          const expected = '    ---a---b---------a---b------------a---b------';
          const result = source.pipe(
            retry({
              delay: () => notifier,
            })
          );
          expectObservable(result, unsub).toBe(expected);
          expectSubscriptions(source.subscriptions).toBe(subs);
          expectSubscriptions(notifier.subscriptions).toBe(notifierSubs);
        });
      });

      it('should complete if the notifier completes', () => {
        rxTest.run(({ cold, expectSubscriptions, expectObservable }) => {
          const source = cold('---a---b---#');
          const subs = [
            //
            '                  ^----------!',
            '                  ------------^----------!',
            '                  -------------------------^----------!',
            '                  ------------------------------------!',
          ];
          const expected = '   ---a---b-------a---b--------a---b---|';
          const result = source.pipe(
            retry({
              delay: (_err, retryCount) => {
                return retryCount <= 2 ? timer(retryCount) : EMPTY;
              },
            })
          );
          expectObservable(result).toBe(expected);
          expectSubscriptions(source.subscriptions).toBe(subs);
        });
      });

      it('should error if the notifier errors', () => {
        rxTest.run(({ cold, expectSubscriptions, expectObservable }) => {
          const source = cold('---a---b---#');
          const subs = [
            //
            '                  ^----------!',
            '                  ------------^----------!',
            '                  -------------------------^----------!',
            '                  ------------------------------------!',
          ];
          const expected = '   ---a---b-------a---b--------a---b---#';
          const result = source.pipe(
            retry({
              delay: (_err, retryCount) => {
                return retryCount <= 2 ? timer(retryCount) : throwError(() => new Error('blah'));
              },
            })
          );
          expectObservable(result).toBe(expected, undefined, new Error('blah'));
          expectSubscriptions(source.subscriptions).toBe(subs);
        });
      });

      it('should error if the delay function throws', () => {
        rxTest.run(({ cold, expectSubscriptions, expectObservable }) => {
          const source = cold('---a---b---#');
          const subs = [
            //
            '                  ^----------!',
            '                  ------------^----------!',
            '                  -------------------------^----------!',
            '                  ------------------------------------!',
          ];
          const expected = '   ---a---b-------a---b--------a---b---#';
          const result = source.pipe(
            retry({
              delay: (_err, retryCount) => {
                if (retryCount <= 2) {
                  return timer(retryCount);
                } else {
                  throw new Error('blah');
                }
              },
            })
          );
          expectObservable(result).toBe(expected, undefined, new Error('blah'));
          expectSubscriptions(source.subscriptions).toBe(subs);
        });
      });

      it('should be usable for exponential backoff', () => {
        rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
          const source = cold('---a---#');
          const subs = [
            //
            '                  ^------!',
            '                  ---------^------!',
            '                  --------------------^------!',
            '                  -----------------------------------^------!',
          ];
          const expected = '   ---a--------a----------a--------------a---#';
          const result = source.pipe(
            retry({
              count: 3,
              delay: (_err, retryCount) => timer(2 ** retryCount),
            })
          );
          expectObservable(result).toBe(expected);
          expectSubscriptions(source.subscriptions).toBe(subs);
        });
      });
    });
  });
});
