import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { finalize, map, share, take } from '@rbxts/rx/out/operators';
import { TestScheduler } from '@rbxts/rx/out/testing';
import { observableMatcher } from '../helpers/observableMatcher';
import { of, timer, interval, NEVER, Observable, noop } from '@rbxts/rx';
import { asInteropObservable } from '../helpers/interop-helper';
import { Error } from '@rbxts/luau-polyfill';

/** @test {finalize} */
describe('finalize', () => {
  it('should call finalize after complete', (_, done) => {
    let completed = false;
    of(1, 2, 3)
      .pipe(
        finalize(() => {
          expect(completed).toBe(true);
          done();
        })
      )
      .subscribe({
        complete: () => {
          completed = true;
        },
      });
  });

  it('should call finalize after error', (_, done) => {
    let thrown = false;
    of(1, 2, 3)
      .pipe(
        map(function (x) {
          if (x === 3) {
            throw x;
          }
          return x;
        }),
        finalize(() => {
          expect(thrown).toBe(true);
          done();
        })
      )
      .subscribe({
        error: () => {
          thrown = true;
        },
      });
  });

  it('should call finalize upon disposal', (_, done) => {
    let disposed = false;
    const subscription = timer(100)
      .pipe(
        finalize(() => {
          expect(disposed).toBe(true);
          done();
        })
      )
      .subscribe();
    disposed = true;
    subscription.unsubscribe();
  });

  it('should call finalize when synchronously subscribing to and unsubscribing from a shared Observable', (_, done) => {
    interval(50).pipe(finalize(done), share()).subscribe().unsubscribe();
  });

  it('should call two finalize instances in succession on a shared Observable', (_, done) => {
    let invoked = 0;
    function checkFinally() {
      invoked += 1;
      if (invoked === 2) {
        done();
      }
    }

    of(1, 2, 3).pipe(finalize(checkFinally), finalize(checkFinally), share()).subscribe();
  });

  it('should handle empty', () => {
    const testScheduler = new TestScheduler(observableMatcher);
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      let executed = false;
      const e1 = hot('  |   ');
      const e1subs = '  (^!)';
      const expected = '|   ';

      const result = e1.pipe(finalize(() => (executed = true)));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);

      // manually flush so `finalize()` has chance to execute before the test is over.
      testScheduler.flush();
      expect(executed).toBe(true);
    });
  });

  it('should handle never', () => {
    const testScheduler = new TestScheduler(observableMatcher);
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      let executed = false;
      const e1 = hot('  -');
      const e1subs = '  ^';
      const expected = '-';

      const result = e1.pipe(finalize(() => (executed = true)));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);

      // manually flush so `finalize()` has chance to execute before the test is over.
      testScheduler.flush();
      expect(executed).toBe(false);
    });
  });

  it('should handle throw', () => {
    const testScheduler = new TestScheduler(observableMatcher);
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      let executed = false;
      const e1 = hot('  #   ');
      const e1subs = '  (^!)';
      const expected = '#   ';

      const result = e1.pipe(finalize(() => (executed = true)));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);

      // manually flush so `finalize()` has chance to execute before the test is over.
      testScheduler.flush();
      expect(executed).toBe(true);
    });
  });

  it('should handle basic hot observable', () => {
    const testScheduler = new TestScheduler(observableMatcher);
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      let executed = false;
      const e1 = hot('  --a--b--c--|');
      const e1subs = '  ^----------!';
      const expected = '--a--b--c--|';

      const result = e1.pipe(finalize(() => (executed = true)));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);

      // manually flush so `finalize()` has chance to execute before the test is over.
      testScheduler.flush();
      expect(executed).toBe(true);
    });
  });

  it('should handle basic cold observable', () => {
    const testScheduler = new TestScheduler(observableMatcher);
    testScheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
      let executed = false;
      const e1 = cold(' --a--b--c--|');
      const e1subs = '  ^----------!';
      const expected = '--a--b--c--|';

      const result = e1.pipe(finalize(() => (executed = true)));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);

      // manually flush so `finalize()` has chance to execute before the test is over.
      testScheduler.flush();
      expect(executed).toBe(true);
    });
  });

  it('should handle basic error', () => {
    const testScheduler = new TestScheduler(observableMatcher);
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      let executed = false;
      const e1 = hot('  --a--b--c--#');
      const e1subs = '  ^----------!';
      const expected = '--a--b--c--#';

      const result = e1.pipe(finalize(() => (executed = true)));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);

      // manually flush so `finalize()` has chance to execute before the test is over.
      testScheduler.flush();
      expect(executed).toBe(true);
    });
  });

  it('should handle unsubscription', () => {
    const testScheduler = new TestScheduler(observableMatcher);
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      let executed = false;
      const e1 = hot('  --a--b--c--|');
      const e1subs = '  ^-----!     ';
      const expected = '--a--b-';
      const unsub = '   ------!';

      const result = e1.pipe(finalize(() => (executed = true)));

      expectObservable(result, unsub).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);

      // manually flush so `finalize()` has chance to execute before the test is over.
      testScheduler.flush();
      expect(executed).toBe(true);
    });
  });

  it('should handle interop source observables', () => {
    // https://github.com/ReactiveX/rxjs/issues/5237
    let finalized = false;
    const subscription = asInteropObservable(NEVER)
      .pipe(finalize(() => (finalized = true)))
      .subscribe();
    subscription.unsubscribe();
    expect(finalized).toBe(true);
  });

  it('should finalize sources before sinks', () => {
    const finalized: string[] = [];
    of(42)
      .pipe(
        finalize(() => finalized.push('source')),
        finalize(() => finalized.push('sink'))
      )
      .subscribe();
    expect(finalized).toEqual(['source', 'sink']);
  });

  it('should finalize after the finalization', () => {
    const order: string[] = [];
    const source = new Observable<void>(() => {
      return () => order.push('finalizer');
    });
    const subscription = source.pipe(finalize(() => order.push('finalize'))).subscribe();
    subscription.unsubscribe();
    expect(order).toEqual(['finalizer', 'finalize']);
  });

  it('should finalize after the finalizer with synchronous completion', () => {
    const order: string[] = [];
    const source = new Observable<void>(function (subscriber) {
      subscriber.complete();
      return () => order.push('finalizer');
    });
    source.pipe(finalize(() => order.push('finalize'))).subscribe();
    expect(order).toEqual(['finalizer', 'finalize']);
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
        finalize(() => {
          /* noop */
        }),
        take(3)
      )
      .subscribe(() => {
        /* noop */
      });

    expect(sideEffects).toEqual([0, 1, 2]);
  });

  it('should execute finalize even with a sync thrown error', () => {
    let called = false;
    const badObservable = new Observable(function () {
      throw new Error('bad');
    }).pipe(
      finalize(() => {
        called = true;
      })
    );

    badObservable.subscribe({
      error: noop,
    });

    expect(called).toBe(true);
  });

  it('should execute finalize in order even with a sync error', () => {
    const results: defined[] = [];
    const badObservable = new Observable(function (subscriber) {
      subscriber.error(new Error('bad'));
    }).pipe(
      finalize(() => {
        results.push(1);
      }),
      finalize(() => {
        results.push(2);
      })
    );

    badObservable.subscribe({
      error: noop,
    });

    expect(results).toEqual([1, 2]);
  });

  it('should execute finalize in order even with a sync thrown error', () => {
    const results: defined[] = [];
    const badObservable = new Observable(function () {
      throw new Error('bad');
    }).pipe(
      finalize(() => {
        results.push(1);
      }),
      finalize(() => {
        results.push(2);
      })
    );

    badObservable.subscribe({
      error: noop,
    });
    expect(results).toEqual([1, 2]);
  });

  it('should finalize in the proper order', () => {
    const results: defined[] = [];
    of(1)
      .pipe(
        finalize(() => results.push(1)),
        finalize(() => results.push(2)),
        finalize(() => results.push(3)),
        finalize(() => results.push(4))
      )
      .subscribe();

    expect(results).toEqual([1, 2, 3, 4]);
  });
});
