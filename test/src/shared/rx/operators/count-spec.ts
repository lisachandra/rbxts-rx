import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { of, range } from '@rbxts/rx';
import { count, skip, take, mergeMap } from '@rbxts/rx/out/operators';
import { TestScheduler } from '@rbxts/rx/out/testing';
import { observableMatcher } from '../helpers/observableMatcher';
import { Error } from '@rbxts/luau-polyfill';

/** @test {count} */
describe('count', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler(observableMatcher);
  });

  it('should count the values of an observable', () => {
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      const source = hot('--a--b--c--|');
      const subs = '      ^----------!';
      const expected = '  -----------(x|)';

      expectObservable(source.pipe(count())).toBe(expected, { x: 3 });
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should be never when source is never', () => {
    testScheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold(' -');
      const e1subs = '  ^';
      const expected = '-';

      expectObservable(e1.pipe(count())).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should be zero when source is empty', () => {
    testScheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold(' |');
      const e1subs = '  (^!)';
      const expected = '(w|)';

      expectObservable(e1.pipe(count())).toBe(expected, { w: 0 });
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it("should be never when source doesn't complete", () => {
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('--x--^--y--');
      const e1subs = '     ^     ';
      const expected = '   ------';

      expectObservable(e1.pipe(count())).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it("should be zero when source doesn't have values", () => {
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('-x-^---|');
      const e1subs = '   ^---!';
      const expected = ' ----(w|)';

      expectObservable(e1.pipe(count())).toBe(expected, { w: 0 });
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should count the unique value of an observable', () => {
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('-x-^--y--|');
      const e1subs = '   ^-----!';
      const expected = ' ------(w|)';

      expectObservable(e1.pipe(count())).toBe(expected, { w: 1 });
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should count the values of an ongoing hot observable', () => {
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      const source = hot('--a-^-b--c--d--|');
      const subs = '          ^----------!';
      const expected = '      -----------(x|)';

      expectObservable(source.pipe(count())).toBe(expected, { x: 3 });
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should count a range() source observable', (_, done) => {
    range(1, 10)
      .pipe(count())
      .subscribe({
        next: (value: number) => {
          expect(value).toEqual(10);
        },
        error: (x) => {
          done(new Error('should not be called'));
        },
        complete: () => {
          done();
        },
      });
  });

  it('should count a range().skip(1) source observable', (_, done) => {
    range(1, 10)
      .pipe(skip(1), count())
      .subscribe({
        next: (value: number) => {
          expect(value).toEqual(9);
        },
        error: (x) => {
          done(new Error('should not be called'));
        },
        complete: () => {
          done();
        },
      });
  });

  it('should count a range().take(1) source observable', (_, done) => {
    range(1, 10)
      .pipe(take(1), count())
      .subscribe({
        next: (value: number) => {
          expect(value).toEqual(1);
        },
        error: (x) => {
          done(new Error('should not be called'));
        },
        complete: () => {
          done();
        },
      });
  });

  it('should work with error', () => {
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('-x-^--y--z--#', { x: 1, y: 2, z: 3 }, 'too bad');
      const e1subs = '   ^--------!';
      const expected = ' ---------#';

      expectObservable(e1.pipe(count())).toBe(expected, undefined, 'too bad');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should work with throw', () => {
    testScheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold(' #');
      const e1subs = '  (^!)';
      const expected = '#';

      expectObservable(e1.pipe(count())).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should handle an always-true predicate on an empty hot observable', () => {
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('-x-^---|');
      const e1subs = '   ^---!';
      const expected = ' ----(w|)';
      const predicate = () => {
        return true;
      };

      expectObservable(e1.pipe(count(predicate))).toBe(expected, { w: 0 });
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should handle an always-false predicate on an empty hot observable', () => {
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('-x-^---|');
      const e1subs = '   ^---!';
      const expected = ' ----(w|)';
      const predicate = () => {
        return false;
      };

      expectObservable(e1.pipe(count(predicate))).toBe(expected, { w: 0 });
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should handle an always-true predicate on a simple hot observable', () => {
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('-x-^-a-|');
      const e1subs = '   ^---!';
      const expected = ' ----(w|)';
      const predicate = () => {
        return true;
      };

      expectObservable(e1.pipe(count(predicate))).toBe(expected, { w: 1 });
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should handle an always-false predicate on a simple hot observable', () => {
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('-x-^-a-|');
      const e1subs = '   ^---!';
      const expected = ' ----(w|)';
      const predicate = () => {
        return false;
      };

      expectObservable(e1.pipe(count(predicate))).toBe(expected, { w: 0 });
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should allow unsubscribing early and explicitly', () => {
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('-1-^-2--3--4-|');
      const e1subs = '   ^-----!    ';
      const expected = ' -------    ';
      const unsub = '    ------!    ';

      const result = e1.pipe(count((value: string) => tonumber(value)! < 10));

      expectObservable(result, unsub).toBe(expected, { w: 3 });
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('-1-^-2--3--4-|');
      const e1subs = '   ^-----!    ';
      const expected = ' -------    ';
      const unsub = '    ------!    ';

      const result = e1.pipe(
        mergeMap((x: string) => of(x)),
        count((value: string) => tonumber(value)! < 10),
        mergeMap((x: number) => of(x))
      );

      expectObservable(result, unsub).toBe(expected, { w: 3 });
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should handle a match-all predicate on observable with many values', () => {
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('-1-^-2--3--4-|');
      const e1subs = '   ^---------!';
      const expected = ' ----------(w|)';
      const predicate = (value: string) => tonumber(value)! < 10;

      expectObservable(e1.pipe(count(predicate))).toBe(expected, { w: 3 });
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should handle a match-none predicate on observable with many values', () => {
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('-1-^-2--3--4-|');
      const e1subs = '   ^---------!';
      const expected = ' ----------(w|)';
      const predicate = (value: string) => tonumber(value)! > 10;

      expectObservable(e1.pipe(count(predicate))).toBe(expected, { w: 0 });
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should handle an always-true predicate on observable that throws', () => {
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('-1-^---#');
      const e1subs = '   ^---!';
      const expected = ' ----#';
      const predicate = () => true;

      expectObservable(e1.pipe(count(predicate))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should handle an always-false predicate on observable that throws', () => {
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('-1-^---#');
      const e1subs = '   ^---!';
      const expected = ' ----#';
      const predicate = () => false;

      expectObservable(e1.pipe(count(predicate))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should handle an always-true predicate on a hot never-observable', () => {
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('-x-^----');
      const e1subs = '   ^    ';
      const expected = ' -----';
      const predicate = () => true;

      expectObservable(e1.pipe(count(predicate))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should handle a predicate that throws, on observable with many values', () => {
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('-1-^-2--3--|');
      const e1subs = '   ^----!   ';
      const expected = ' -----#   ';
      const predicate = (value: string) => {
        if (value === '3') {
          throw 'error';
        }
        return true;
      };

      expectObservable(e1.pipe(count(predicate))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });
});
