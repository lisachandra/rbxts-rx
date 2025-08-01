import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { EMPTY, NEVER, of, timer, defer, Observable, throwError } from '@rbxts/rx';
import { raceWith, mergeMap, map, finalize, startWith, take } from '@rbxts/rx/out/operators';
import { TestScheduler } from '@rbxts/rx/out/testing';
import { observableMatcher } from '../helpers/observableMatcher';

/** @test {raceWith} */
describe('raceWith operator', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler(observableMatcher);
  });

  it('should race cold and cold', () => {
    testScheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold(' ---a-----b-----c----|   ');
      const e1subs = '  ^-------------------!   ';
      const e2 = cold(' ------x-----y-----z----|');
      const e2subs = '  ^--!                    ';
      const expected = '---a-----b-----c----|   ';

      const result = e1.pipe(raceWith(e2));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should race hot and hot', () => {
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('  ---a-----b-----c----|   ');
      const e1subs = '  ^-------------------!   ';
      const e2 = hot('  ------x-----y-----z----|');
      const e2subs = '  ^--!                    ';
      const expected = '---a-----b-----c----|   ';

      const result = e1.pipe(raceWith(e2));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should race hot and cold', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold(' ---a-----b-----c----|   ');
      const e1subs = '  ^-------------------!   ';
      const e2 = hot('  ------x-----y-----z----|');
      const e2subs = '  ^--!                    ';
      const expected = '---a-----b-----c----|   ';

      const result = e1.pipe(raceWith(e2));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should race 2nd and 1st', () => {
    testScheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold(' ------x-----y-----z----|');
      const e1subs = '  ^--!                    ';
      const e2 = cold(' ---a-----b-----c----|   ');
      const e2subs = '  ^-------------------!   ';
      const expected = '---a-----b-----c----|   ';

      const result = e1.pipe(raceWith(e2));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should race emit and complete', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold(' -----|                  ');
      const e1subs = '  ^----!                  ';
      const e2 = hot('  ------x-----y-----z----|');
      const e2subs = '  ^----!                  ';
      const expected = '-----|                  ';

      const result = e1.pipe(raceWith(e2));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should allow unsubscribing early and explicitly', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold(' ---a-----b-----c----|   ');
      const e1subs = '  ^-----------!           ';
      const e2 = hot('  ------x-----y-----z----|');
      const e2subs = '  ^--!                    ';
      const expected = '---a-----b---           ';
      const unsub = '   ------------!           ';

      const result = e1.pipe(raceWith(e2));

      expectObservable(result, unsub).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should not break unsubscription chains when unsubscribed explicitly', () => {
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('  --a--^--b--c---d-| ');
      const e1subs = '       ^--------!    ';
      const e2 = hot('  ---e-^---f--g---h-|');
      const e2subs = '       ^--!          ';
      const expected = '     ---b--c---    ';
      const unsub = '        ---------!    ';

      const result = e1.pipe(
        mergeMap((x: string) => of(x)),
        raceWith(e2),
        mergeMap((x: string) => of(x))
      );

      expectObservable(result, unsub).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should never emit when given non emitting sources', () => {
    testScheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold(' ---|');
      const e2 = cold(' ---|');
      const e1subs = '  ^--!';
      const expected = '---|';

      const source = e1.pipe(raceWith(e2));

      expectObservable(source).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should throw when error occurs mid stream', () => {
    testScheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold(' ---a-----#              ');
      const e1subs = '  ^--------!              ';
      const e2 = cold(' ------x-----y-----z----|');
      const e2subs = '  ^--!                    ';
      const expected = '---a-----#              ';

      const result = e1.pipe(raceWith(e2));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should throw when error occurs before a winner is found', () => {
    testScheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold(' ---#                    ');
      const e1subs = '  ^--!                    ';
      const e2 = cold(' ------x-----y-----z----|');
      const e2subs = '  ^--!                    ';
      const expected = '---#                    ';

      const result = e1.pipe(raceWith(e2));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should allow observable emits immediately', (_, done) => {
    const e1 = of(true);
    const e2 = timer(200).pipe(map((_) => false));

    e1.pipe(raceWith(e2)).subscribe({
      next: (x) => {
        expect(x).toBe(true);
      },
      error: done,
      complete: done,
    });
  });

  it('should ignore latter observables if a former one emits immediately', () => {
    const onNext = jest.fn();
    const onSubscribe = jest.fn();
    const e1 = of('a'); // Wins the race
    const e2 = defer(onSubscribe); // Should be ignored

    e1.pipe(raceWith(e2)).subscribe(onNext);
    expect(onNext).toHaveBeenCalledWith('a');
    expect(onSubscribe).never.toHaveBeenCalled();
  });

  it('should ignore latter observables if a former one completes immediately', () => {
    const onComplete = jest.fn();
    const onSubscribe = jest.fn();
    const e1 = EMPTY; // Wins the race
    const e2 = defer(onSubscribe); // Should be ignored

    e1.pipe(raceWith(e2)).subscribe({ complete: onComplete });
    expect(onComplete).toHaveBeenCalledWith();
    expect(onSubscribe).never.toHaveBeenCalled();
  });

  it('should ignore latter observables if a former one errors immediately', () => {
    const onError = jest.fn();
    const onSubscribe = jest.fn();
    const e1 = throwError(() => 'kaboom'); // Wins the race
    const e2 = defer(onSubscribe); // Should be ignored

    e1.pipe(raceWith(e2)).subscribe({ error: onError });
    expect(onError).toHaveBeenCalledWith('kaboom');
    expect(onSubscribe).never.toHaveBeenCalled();
  });

  it('should unsubscribe former observables if a latter one emits immediately', () => {
    const onNext = jest.fn();
    const onUnsubscribe = jest.fn();
    const e1 = NEVER.pipe(finalize(onUnsubscribe)); // Should be unsubscribed
    const e2 = of('b'); // Wins the race

    e1.pipe(raceWith(e2)).subscribe(onNext);
    expect(onNext).toHaveBeenCalledWith('b');
    expect(onUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('should unsubscribe from immediately emitting observable on unsubscription', () => {
    const onNext = jest.fn();
    const onUnsubscribe = jest.fn();
    const e1 = <Observable<never>>NEVER.pipe(startWith('a'), finalize(onUnsubscribe)); // Wins the race
    const e2 = NEVER; // Loses the race

    const subscription = e1.pipe(raceWith(e2)).subscribe(onNext);
    expect(onNext).toHaveBeenCalledWith('a');
    expect(onUnsubscribe).never.toHaveBeenCalled();
    subscription.unsubscribe();
    expect(onUnsubscribe).toHaveBeenCalledTimes(1);
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

    synchronousObservable.pipe(raceWith(of(0)), take(3)).subscribe(() => {
      /* noop */
    });

    expect(sideEffects).toEqual([0, 1, 2]);
  });
});
