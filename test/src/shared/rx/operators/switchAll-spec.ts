import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { Observable, of, NEVER, queueScheduler, Subject, scheduled, Subscription } from '@rbxts/rx';
import { map, switchAll, mergeMap, take } from '@rbxts/rx/out/operators';
import { TestScheduler } from '@rbxts/rx/out/testing';
import { observableMatcher } from '../helpers/observableMatcher';
import { Error } from '@rbxts/luau-polyfill';

/** @test {switch} */
describe('switchAll', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler(observableMatcher);
  });

  it('should switch a hot observable of cold observables', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
      const x = cold('    --a---b--c---d--|      ');
      const xsubs = '   --^------!               ';
      const y = cold('           ----e---f--g---|');
      const ysubs = '   ---------^--------------!';
      const e1 = hot('  --x------y-------|       ', { x: x, y: y });
      const e1subs = '  ^----------------!       ';
      const expected = '----a---b----e---f--g---|';

      const result = e1.pipe(switchAll());

      expectObservable(result).toBe(expected);
      expectSubscriptions(x.subscriptions).toBe(xsubs);
      expectSubscriptions(y.subscriptions).toBe(ysubs);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should switch to each immediately-scheduled inner Observable', (_, done) => {
    const a = scheduled([1, 2, 3], queueScheduler);
    const b = scheduled([4, 5, 6], queueScheduler);
    const r = [1, 4, 5, 6];
    let i = 0;
    scheduled([a, b], queueScheduler)
      .pipe(switchAll())
      .subscribe({
        next: (x) => {
          expect(x).toEqual(r[i++]);
        },
        complete: done,
      });
  });

  it('should unsub inner observables', () => {
    const unsubbed: string[] = [];

    of('a', 'b')
      .pipe(
        map(
          (x) =>
            new Observable<string>(function (subscriber) {
              subscriber.complete();
              return () => {
                unsubbed.push(x);
              };
            })
        ),
        switchAll()
      )
      .subscribe();

    expect(unsubbed).toEqual(['a', 'b']);
  });

  it('should switch to each inner Observable', (_, done) => {
    const a = of(1, 2, 3);
    const b = of(4, 5, 6);
    const r = [1, 2, 3, 4, 5, 6];
    let i = 0;
    of(a, b)
      .pipe(switchAll())
      .subscribe({
        next: (x) => {
          expect(x).toEqual(r[i++]);
        },
        complete: done,
      });
  });

  it('should handle a hot observable of observables', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
      const x = cold('        --a---b---c--|         ');
      const xsubs = '   ------^-------!              ';
      const y = cold('                ---d--e---f---|');
      const ysubs = '   --------------^-------------!';
      const e1 = hot('  ------x-------y------|       ', { x: x, y: y });
      const e1subs = '  ^--------------------!       ';
      const expected = '--------a---b----d--e---f---|';

      const result = e1.pipe(switchAll());

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(x.subscriptions).toBe(xsubs);
      expectSubscriptions(y.subscriptions).toBe(ysubs);
    });
  });

  it('should handle a hot observable of observables, outer is unsubscribed early', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
      const x = cold('        --a---b---c--|         ');
      const xsubs = '   ------^-------!              ';
      const y = cold('                ---d--e---f---|');
      const ysubs = '   --------------^-!            ';
      const e1 = hot('  ------x-------y------|       ', { x: x, y: y });
      const unsub = '   ----------------!            ';
      const expected = '--------a---b---             ';

      const result = e1.pipe(switchAll());

      expectObservable(result, unsub).toBe(expected);
      expectSubscriptions(x.subscriptions).toBe(xsubs);
      expectSubscriptions(y.subscriptions).toBe(ysubs);
    });
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
      const x = cold('        --a---b---c--|         ');
      const xsubs = '   ------^-------!              ';
      const y = cold('                ---d--e---f---|');
      const ysubs = '   --------------^-!            ';
      const e1 = hot('  ------x-------y------|       ', { x: x, y: y });
      const expected = '--------a---b----            ';
      const unsub = '   ----------------!            ';

      const result = e1.pipe(
        mergeMap((x) => of(x)),
        switchAll(),
        mergeMap((x) => of(x))
      );

      expectObservable(result, unsub).toBe(expected);
      expectSubscriptions(x.subscriptions).toBe(xsubs);
      expectSubscriptions(y.subscriptions).toBe(ysubs);
    });
  });

  it('should handle a hot observable of observables, inner never completes', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
      const x = cold('        --a---b---c--|          ');
      const xsubs = '   ------^-------!               ';
      const y = cold('                ---d--e---f-----');
      const ysubs = '   --------------^               ';
      const e1 = hot('  ------x-------y------|        ', { x: x, y: y });
      const expected = '--------a---b----d--e---f-----';

      const result = e1.pipe(switchAll());

      expectObservable(result).toBe(expected);
      expectSubscriptions(x.subscriptions).toBe(xsubs);
      expectSubscriptions(y.subscriptions).toBe(ysubs);
    });
  });

  it('should handle a synchronous switch to the second inner observable', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
      const x = cold('        --a---b---c--|   ');
      const xsubs = '   ------(^!)             ';
      const y = cold('        ---d--e---f---|  ');
      const ysubs = '   ------^-------------!  ';
      const e1 = hot('  ------(xy)------------|', { x: x, y: y });
      const expected = '---------d--e---f-----|';

      const result = e1.pipe(switchAll());

      expectObservable(result).toBe(expected);
      expectSubscriptions(x.subscriptions).toBe(xsubs);
      expectSubscriptions(y.subscriptions).toBe(ysubs);
    });
  });

  it('should handle a hot observable of observables, one inner throws', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
      const x = cold('        --a---#                ');
      const xsubs = '   ------^-----!                ';
      const y = cold('                ---d--e---f---|');
      const ysubs = '                                ';
      const e1 = hot('  ------x-------y------|       ', { x: x, y: y });
      const expected = '--------a---#                ';

      const result = e1.pipe(switchAll());

      expectObservable(result).toBe(expected);
      expectSubscriptions(x.subscriptions).toBe(xsubs);
      expectSubscriptions(y.subscriptions).toBe(ysubs);
    });
  });

  it('should handle a hot observable of observables, outer throws', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
      const x = cold('        --a---b---c--|         ');
      const xsubs = '   ------^-------!              ';
      const y = cold('                ---d--e---f---|');
      const ysubs = '   --------------^-------!      ';
      const e1 = hot('  ------x-------y-------#      ', { x: x, y: y });
      const expected = '--------a---b----d--e-#      ';

      const result = e1.pipe(switchAll());

      expectObservable(result).toBe(expected);
      expectSubscriptions(x.subscriptions).toBe(xsubs);
      expectSubscriptions(y.subscriptions).toBe(ysubs);
    });
  });

  it('should handle an empty hot observable', () => {
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('  ------|');
      const e1subs = '  ^-----!';
      const expected = '------|';

      const result = e1.pipe(switchAll());

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should handle a never hot observable', () => {
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('  -');
      const e1subs = '  ^';
      const expected = '-';

      const result = e1.pipe(switchAll());

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should complete not before the outer completes', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
      const x = cold('        --a---b---c--|   ');
      const xsubs = '   ------^------------!   ';
      const e1 = hot('  ------x---------------|', { x: x });
      const e1subs = '  ^---------------------!';
      const expected = '--------a---b---c-----|';

      const result = e1.pipe(switchAll());

      expectObservable(result).toBe(expected);
      expectSubscriptions(x.subscriptions).toBe(xsubs);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should handle an observable of promises', (_, done) => {
    const expected = [3];

    of(Promise.resolve(1), Promise.resolve(2), Promise.resolve(3))
      .pipe(switchAll())
      .subscribe({
        next: (x) => {
          expect(x).toEqual(expected.shift());
        },
        complete: () => {
          expect(expected.size()).toEqual(0);
          done();
        },
      });
  });

  it('should handle an observable of promises, where last rejects', (_, done) => {
    of(Promise.resolve(1), Promise.resolve(2), Promise.reject(3))
      .pipe(switchAll())
      .subscribe({
        next: () => {
          done(new Error('should not be called'));
        },
        error: (err) => {
          expect(err).toEqual(3);
          done();
        },
        complete: () => {
          done(new Error('should not be called'));
        },
      });
  });

  it('should handle an observable with Arrays in it', () => {
    const expected = [1, 2, 3, 4];
    let completed = false;

    of(NEVER, NEVER, [1, 2, 3, 4])
      .pipe(switchAll())
      .subscribe({
        next: (x) => {
          expect(x).toEqual(expected.shift());
        },
        complete: () => {
          completed = true;
          expect(expected.size()).toEqual(0);
        },
      });

    expect(completed).toBe(true);
  });

  it('should not leak when child completes before each switch (prevent memory leaks #2355)', () => {
    let iStream: Subject<number>;
    const oStreamControl = new Subject<number>();
    const oStream = oStreamControl.pipe(map(() => (iStream = new Subject<number>())));
    const switcher = oStream.pipe(switchAll());
    const result: number[] = [];
    let sub = switcher.subscribe((x) => result.push(x));

    [0, 1, 2, 3, 4].forEach((n) => {
      oStreamControl.next(n); // creates inner
      iStream.complete();
    });

    // Expect one child of switchAll(): The oStream
    // @ts-expect-error
    expect(sub._finalizers?.[0]._finalizers?.size()).toEqual(1);
    sub.unsubscribe();
  });

  it('should not leak if we switch before child completes (prevent memory leaks #2355)', () => {
    const oStreamControl = new Subject<number>();
    const oStream = oStreamControl.pipe(map(() => new Subject<number>()));
    const switcher = oStream.pipe(switchAll());
    const result: number[] = [];
    let sub = switcher.subscribe((x) => result.push(x));

    [0, 1, 2, 3, 4].forEach((n) => {
      oStreamControl.next(n); // creates inner
    });

    // @ts-expect-error
    // Expect one child of switchAll(): The oStream
    expect(sub._finalizers?.[0]._finalizers?.size()).toEqual(1);
    // Expect two children of subscribe(): The destination and the first inner
    // See #4106 - inner subscriptions are now added to destinations
    // @ts-expect-error
    expect(sub._finalizers?.size()).toEqual(2);
    sub.unsubscribe();
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

    of(synchronousObservable)
      .pipe(switchAll(), take(3))
      .subscribe(() => {
        /* noop */
      });

    expect(sideEffects).toEqual([0, 1, 2]);
  });
});
