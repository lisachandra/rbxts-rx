import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { tap, mergeMap, take } from '@rbxts/rx/out/operators';
import { Subject, of, throwError, Observer, EMPTY, Observable, noop } from '@rbxts/rx';
import { TestScheduler } from '@rbxts/rx/out/testing';
import { observableMatcher } from '../helpers/observableMatcher';
import { Error } from '@rbxts/luau-polyfill';

/** @test {tap} */
describe('tap', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler(observableMatcher);
  });

  it('should mirror multiple values and complete', () => {
    testScheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold(' --1--2--3--|');
      const e1subs = '  ^----------!';
      const expected = '--1--2--3--|';

      const result = e1.pipe(
        tap(() => {
          //noop
        })
      );

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should next with a callback', () => {
    let value = undefined;
    of(42)
      .pipe(
        tap(function (x) {
          value = x;
        })
      )
      .subscribe();

    expect(value).toEqual(42);
  });

  it('should error with a callback', () => {
    let err = undefined;
    throwError(() => 'bad')
      .pipe(
        tap({
          error: (x) => {
            err = x;
          },
        })
      )
      .subscribe({
        error: (ex) => {
          expect(ex).toEqual('bad');
        },
      });

    expect(err).toEqual('bad');
  });

  it('should handle everything with an observer', (_, done) => {
    const expected = [1, 2, 3];
    const results: number[] = [];

    of(1, 2, 3)
      .pipe(
        tap(<Observer<number>>{
          next: (x: number) => {
            results.push(x);
          },
          error: () => {
            done(new Error('should not be called'));
          },
          complete: () => {
            expect(results).toEqual(expected);
            done();
          },
        })
      )
      .subscribe();
  });

  it('should handle everything with a Subject', (_, done) => {
    const expected = [1, 2, 3];
    const results: number[] = [];
    const subject = new Subject<number>();

    subject.subscribe({
      next: (x: any) => {
        results.push(x);
      },
      error: () => {
        done(new Error('should not be called'));
      },
      complete: () => {
        expect(results).toEqual(expected);
        done();
      },
    });

    of(1, 2, 3).pipe(tap(subject)).subscribe();
  });

  it('should handle an error with a callback', () => {
    let errored = false;
    throwError(() => 'bad')
      .pipe(
        tap({
          error: (err: any) => {
            expect(err).toEqual('bad');
          },
        })
      )
      .subscribe({
        error: (err: any) => {
          errored = true;
          expect(err).toEqual('bad');
        },
      });

    expect(errored).toBe(true);
  });

  it('should handle an error with observer', () => {
    let errored = false;
    throwError(() => 'bad')
      .pipe(
        tap(<any>{
          error: (err: string) => {
            expect(err).toEqual('bad');
          },
        })
      )
      .subscribe({
        error: (err) => {
          errored = true;
          expect(err).toEqual('bad');
        },
      });

    expect(errored).toBe(true);
  });

  it('should handle complete with observer', () => {
    let completed = false;

    EMPTY.pipe(
      tap(<any>{
        complete: () => {
          completed = true;
        },
      })
    ).subscribe();

    expect(completed).toBe(true);
  });

  it('should handle next with observer', () => {
    let value = undefined;

    of('hi')
      .pipe(
        tap(<any>{
          next: (x: string) => {
            value = x;
          },
        })
      )
      .subscribe();

    expect(value).toEqual('hi');
  });

  it('should raise error if next handler raises error', () => {
    of('hi')
      .pipe(
        tap(<any>{
          next: () => {
            throw new Error('bad');
          },
        })
      )
      .subscribe({
        error: (err: Error) => {
          expect(err.message).toEqual('bad');
        },
      });
  });

  it('should raise error if error handler raises error', () => {
    throwError(() => 'ops')
      .pipe(
        tap(<any>{
          error: () => {
            throw new Error('bad');
          },
        })
      )
      .subscribe({
        error: (err: Error) => {
          expect(err.message).toEqual('bad');
        },
      });
  });

  it('should raise error if complete handler raises error', () => {
    EMPTY.pipe(
      tap(<any>{
        complete: () => {
          throw new Error('bad');
        },
      })
    ).subscribe({
      error: (err: Error) => {
        expect(err.message).toEqual('bad');
      },
    });
  });

  it('should allow unsubscribing explicitly and early', () => {
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('  --1--2--3--#');
      const unsub = '   -------!    ';
      const e1subs = '  ^------!    ';
      const expected = '--1--2--    ';

      const result = e1.pipe(
        tap(() => {
          //noop
        })
      );
      expectObservable(result, unsub).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('  --1--2--3--#');
      const e1subs = '  ^------!    ';
      const expected = '--1--2--    ';
      const unsub = '   -------!    ';

      const result = e1.pipe(
        mergeMap((x: any) => of(x)),
        tap(() => {
          //noop
        }),
        mergeMap((x: any) => of(x))
      );

      expectObservable(result, unsub).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should mirror multiple values and complete', () => {
    testScheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold(' --1--2--3--|');
      const e1subs = '  ^----------!';
      const expected = '--1--2--3--|';

      const result = e1.pipe(
        tap(() => {
          //noop
        })
      );
      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should mirror multiple values and terminate with error', () => {
    testScheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold(' --1--2--3--#');
      const e1subs = '  ^----------!';
      const expected = '--1--2--3--#';

      const result = e1.pipe(
        tap(() => {
          //noop
        })
      );
      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
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

    synchronousObservable
      .pipe(
        tap(() => {
          /* noop */
        }),
        take(3)
      )
      .subscribe(() => {
        /* noop */
      });

    expect(sideEffects).toEqual([0, 1, 2]);
  });

  describe('lifecycle handlers', () => {
    it('should support an unsubscribe event that fires before finalize', () => {
      const results: defined[] = [];
      const subject = new Subject<number>();

      const subscription = subject
        .pipe(
          tap({
            subscribe: () => results.push('subscribe'),
            next: (value) => results.push(`next ${value}`),
            error: (err: Error) => results.push(`error: ${err.message}`),
            complete: () => results.push('complete'),
            unsubscribe: () => results.push('unsubscribe'),
            finalize: () => results.push('finalize'),
          })
        )
        .subscribe();

      subject.next(1);
      subject.next(2);
      expect(results).toEqual(['subscribe', 'next 1', 'next 2']);

      subscription.unsubscribe();

      expect(results).toEqual(['subscribe', 'next 1', 'next 2', 'unsubscribe', 'finalize']);
    });

    it('should not call unsubscribe if source completes', () => {
      const results: defined[] = [];
      const subject = new Subject<number>();

      const subscription = subject
        .pipe(
          tap({
            subscribe: () => results.push('subscribe'),
            next: (value) => results.push(`next ${value}`),
            error: (err: Error) => results.push(`error: ${err.message}`),
            complete: () => results.push('complete'),
            unsubscribe: () => results.push('unsubscribe'),
            finalize: () => results.push('finalize'),
          })
        )
        .subscribe();

      subject.next(1);
      subject.next(2);
      expect(results).toEqual(['subscribe', 'next 1', 'next 2']);
      subject.complete();
      // should have no effect
      subscription.unsubscribe();

      expect(results).toEqual(['subscribe', 'next 1', 'next 2', 'complete', 'finalize']);
    });

    it('should not call unsubscribe if source errors', () => {
      const results: defined[] = [];
      const subject = new Subject<number>();

      const subscription = subject
        .pipe(
          tap({
            subscribe: () => results.push('subscribe'),
            next: (value) => results.push(`next ${value}`),
            error: (err: Error) => results.push(`error: ${err.message}`),
            complete: () => results.push('complete'),
            unsubscribe: () => results.push('unsubscribe'),
            finalize: () => results.push('finalize'),
          })
        )
        .subscribe({
          error: noop,
        });

      subject.next(1);
      subject.next(2);
      expect(results).toEqual(['subscribe', 'next 1', 'next 2']);
      subject.error(new Error('bad'));
      // should have no effect
      subscription.unsubscribe();

      expect(results).toEqual(['subscribe', 'next 1', 'next 2', 'error: bad', 'finalize']);
    });
  });
});
