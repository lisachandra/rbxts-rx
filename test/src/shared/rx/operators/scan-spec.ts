import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { scan, mergeMap, finalize, take } from '@rbxts/rx/out/operators';
import { of, Observable } from '@rbxts/rx';
import { TestScheduler } from '@rbxts/rx/out/testing';
import { observableMatcher } from '../helpers/observableMatcher';
import { Array } from '@rbxts/luau-polyfill';

/** @test {scan} */
describe('scan', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler(observableMatcher);
  });

  it('should scan', () => {
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      // prettier-ignore
      const values = {
        a: 1, b: 3, c: 5,
        x: 1, y: 4, z: 9,
      };
      const e1 = hot('  --a--b--c--|', values);
      const e1subs = '  ^----------!';
      const expected = '--x--y--z--|';

      const scanFunction = function (o: number, x: number) {
        return o + x;
      };

      expectObservable(e1.pipe(scan(scanFunction, 0))).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should scan things', () => {
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('--a--^--b--c--d--e--f--g--|');
      const e1subs = '     ^--------------------!';
      const expected = '   ---u--v--w--x--y--z--|';

      const values = {
        u: ['b'],
        v: ['b', 'c'],
        w: ['b', 'c', 'd'],
        x: ['b', 'c', 'd', 'e'],
        y: ['b', 'c', 'd', 'e', 'f'],
        z: ['b', 'c', 'd', 'e', 'f', 'g'],
      };

      const source = e1.pipe(scan((acc, x) => Array.concat(acc, x), [] as string[]));

      expectObservable(source).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should provide the proper index if seed is skipped', () => {
    const expected = [1, 2];
    of(3, 3, 3)
      .pipe(
        scan((_: any, __, i) => {
          expect(i).toEqual(expected.shift());
          return undefined;
        })
      )
      .subscribe();
  });

  it('should scan with a seed of undefined', () => {
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('--a--^--b--c--d--e--f--g--|');
      const e1subs = '     ^--------------------!';
      const expected = '   ---u--v--w--x--y--z--|';

      const values = {
        u: 'nil b',
        v: 'nil b c',
        w: 'nil b c d',
        x: 'nil b c d e',
        y: 'nil b c d e f',
        z: 'nil b c d e f g',
      };

      const source = e1.pipe(scan((acc: string | undefined, x: string) => acc + ' ' + x, undefined));

      expectObservable(source).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should scan without seed', () => {
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('--a--^--b--c--d--|');
      const e1subs = '     ^-----------!';
      const expected = '   ---x--y--z--|';

      const values = {
        x: 'b',
        y: 'bc',
        z: 'bcd',
      };

      const source = e1.pipe(scan((acc: string, x: string) => acc + x));

      expectObservable(source).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should handle errors', () => {
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('--a--^--b--c--d--#');
      const e1subs = '     ^-----------!';
      const expected = '   ---u--v--w--#';

      const values = {
        u: ['b'],
        v: ['b', 'c'],
        w: ['b', 'c', 'd'],
      };

      const source = e1.pipe(scan((acc, x) => Array.concat(acc, x), [] as string[]));

      expectObservable(source).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should handle errors in the projection function', () => {
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('--a--^--b--c--d--e--f--g--|');
      const e1subs = '     ^--------!            ';
      const expected = '   ---u--v--#            ';

      const values = {
        u: ['b'],
        v: ['b', 'c'],
        w: ['b', 'c', 'd'],
        x: ['b', 'c', 'd', 'e'],
        y: ['b', 'c', 'd', 'e', 'f'],
        z: ['b', 'c', 'd', 'e', 'f', 'g'],
      };

      const source = e1.pipe(
        scan((acc, x) => {
          if (x === 'd') {
            throw 'bad!';
          }
          return Array.concat(acc, x);
        }, [] as string[])
      );

      expectObservable(source).toBe(expected, values, 'bad!');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('handle empty', () => {
    testScheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold(' |   ');
      const e1subs = '  (^!)';
      const expected = '|   ';

      const source = e1.pipe(scan((acc, x) => Array.concat(acc, x), [] as string[]));

      expectObservable(source).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('handle never', () => {
    testScheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold(' -');
      const e1subs = '  ^';
      const expected = '-';

      const source = e1.pipe(scan((acc, x) => Array.concat(acc, x), [] as string[]));

      expectObservable(source).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('handle throw', () => {
    testScheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold(' #   ');
      const e1subs = '  (^!)';
      const expected = '#   ';

      const source = e1.pipe(scan((acc, x) => Array.concat(acc, x), [] as string[]));

      expectObservable(source).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should allow unsubscribing explicitly and early', () => {
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('--a--^--b--c--d--e--f--g--|');
      const unsub = '      --------------!       ';
      const e1subs = '     ^-------------!       ';
      const expected = '   ---u--v--w--x--       ';
      const values = {
        u: ['b'],
        v: ['b', 'c'],
        w: ['b', 'c', 'd'],
        x: ['b', 'c', 'd', 'e'],
        y: ['b', 'c', 'd', 'e', 'f'],
        z: ['b', 'c', 'd', 'e', 'f', 'g'],
      };

      const source = e1.pipe(scan((acc, x) => Array.concat(acc, x), [] as string[]));

      expectObservable(source, unsub).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('--a--^--b--c--d--e--f--g--|');
      const e1subs = '     ^-------------!       ';
      const expected = '   ---u--v--w--x--       ';
      const unsub = '      --------------!       ';
      const values = {
        u: ['b'],
        v: ['b', 'c'],
        w: ['b', 'c', 'd'],
        x: ['b', 'c', 'd', 'e'],
        y: ['b', 'c', 'd', 'e', 'f'],
        z: ['b', 'c', 'd', 'e', 'f', 'g'],
      };

      const source = e1.pipe(
        mergeMap((x: string) => of(x)),
        scan((acc, x) => Array.concat(acc, x), [] as string[]),
        mergeMap((x: string[]) => of(x))
      );

      expectObservable(source, unsub).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should pass current index to accumulator', () => {
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      // prettier-ignore
      const values = {
        a: 1, b: 3, c: 5,
        x: 1, y: 4, z: 9,
      };
      let idx = [0, 1, 2];

      const e1 = hot('  --a--b--c--|', values);
      const e1subs = '  ^----------!';
      const expected = '--x--y--z--|';

      const scanFunction = (o: number, value: number, index: number) => {
        expect(index).toEqual(idx.shift());
        return o + value;
      };

      const scanObs = e1.pipe(
        scan(scanFunction, 0),
        finalize(() => {
          expect(idx).toHaveLength(0);
        })
      );

      expectObservable(scanObs).toBe(expected, values);
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
        scan((_acc, value: number) => value, 0),
        take(3)
      )
      .subscribe(() => {
        /* noop */
      });

    expect(sideEffects).toEqual([0, 1, 2]);
  });
});
