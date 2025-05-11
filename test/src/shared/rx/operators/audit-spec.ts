import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { TestScheduler } from '@rbxts/rx/out/testing';
import { of, interval, EMPTY, Observable } from '@rbxts/rx';
import { audit, take, mergeMap } from '@rbxts/rx/out/operators';
import { observableMatcher } from '../helpers/observableMatcher';
import { Error } from '@rbxts/luau-polyfill';

/** @test {audit} */
describe('audit operator', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler(observableMatcher);
  });

  it('should emit the last value in each time window', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
      const e1 = hot('  -a-xy-----b--x--cxyz-|');
      const e1subs = '  ^--------------------!';
      const e2 = cold('  ----i                ');
      //                          ----i
      //                                ----i
      const e2subs = [
        '               -^---!                ',
        '               ----------^---!       ',
        '               ----------------^---! ',
      ];
      const expected = '-----y--------x-----z|';

      const result = e1.pipe(audit(() => e2));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should delay the source if values are not emitted often enough', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
      const e1 = hot('  -a--------b-----c----|');
      const e1subs = '  ^--------------------!';
      const e2 = cold('  ----x                ');
      const e2subs = [
        '               -^---!                ',
        '               ----------^---!       ',
        '               ----------------^---! ',
      ];
      const expected = '-----a--------b-----c|';

      const result = e1.pipe(audit(() => e2));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should audit with duration Observable using next to close the duration', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
      const e1 = hot('   -a-xy-----b--x--cxxx-|');
      const e1subs = '   ^--------------------!';
      const e2 = cold('   ----x-y-z            ');
      const e2subs = [
        '                -^---!                ',
        '                ----------^---!       ',
        '                ----------------^---! ',
      ];
      const expected = ' -----y--------x-----x|';

      const result = e1.pipe(audit(() => e2));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should interrupt source and duration when result is unsubscribed early', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
      const e1 = hot('  -a-x-y-z-xyz-x-y-z----b--x-x-|');
      const unsub = '   --------------!               ';
      const e1subs = '  ^-------------!               ';
      const e2 = cold('  -----x------------|          ');
      const e2subs = [
        '               -^----!                       ',
        '               -------^----!                 ',
        '               -------------^!               ',
      ];
      const expected = '------y-----z--               ';

      const result = e1.pipe(audit(() => e2));

      expectObservable(result, unsub).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
      const e1 = hot('  -a-x-y-z-xyz-x-y-z----b--x-x-|');
      const e1subs = '  ^-------------!               ';
      const e2 = cold('  -----x------------|          ');
      const e2subs = [
        '               -^----!                       ',
        '               -------^----!                 ',
        '               -------------^!               ',
      ];
      const expected = '------y-----z--               ';
      const unsub = '   --------------!               ';

      const result = e1.pipe(
        mergeMap((x: string) => of(x)),
        audit(() => e2),
        mergeMap((x: string) => of(x))
      );

      expectObservable(result, unsub).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should handle a busy producer emitting a regular repeating sequence', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
      const e1 = hot('  abcdefabcdefabcdefabcdefa|    ');
      const e1subs = '  ^------------------------!    ';
      const e2 = cold(' -----x                        ');
      const e2subs = [
        '               ^----!                        ',
        '               ------^----!                  ',
        '               ------------^----!            ',
        '               ------------------^----!      ',
        '               ------------------------^----!',
      ];
      const expected = '-----f-----f-----f-----f-----(a|)';

      const result = e1.pipe(audit(() => e2));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should mirror source if durations are immediate', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
      const e1 = hot('  abcdefabcdefabcdefabcdefa|');
      const e1subs = '  ^------------------------!';
      const e2 = cold(' x');
      const expected = 'abcdefabcdefabcdefabcdefa|';

      const result = e1.pipe(audit(() => e2));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should emit no values if durations are EMPTY', () => {
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('  abcdefabcdefabcdefabcdefa|');
      const e1subs = '  ^------------------------!';
      const e2 = EMPTY;
      const expected = '-------------------------|';

      const result = e1.pipe(audit(() => e2));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should emit no values and never complete if duration is a never', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
      const e1 = hot('  ----abcdefabcdefabcdefabcdefa|');
      const e1subs = '  ^----------------------------!';
      const e2 = cold(' -');
      const e2subs = '  ----^-------------------------';
      const expected = '------------------------------';

      const result = e1.pipe(audit(() => e2));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should unsubscribe duration Observable when source raise error', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
      const e1 = hot('  ----abcdefabcdefabcdefabcdefa#');
      const e1subs = '  ^----------------------------!';
      const e2 = cold(' -');
      const e2subs = '  ----^------------------------!';
      const expected = '-----------------------------#';

      const result = e1.pipe(audit(() => e2));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should mirror source if durations are synchronous observables', () => {
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('  abcdefabcdefabcdefabcdefa|');
      const e1subs = '  ^------------------------!';
      const e2 = of('one single value');
      const expected = 'abcdefabcdefabcdefabcdefa|';

      const result = e1.pipe(audit(() => e2));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should raise error as soon as just-throw duration is used', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
      const e1 = hot('  ----abcdefabcdefabcdefabcdefa|');
      const e1subs = '  ^---!                         ';
      const e2 = cold(' #');
      const e2subs = '  ----(^!)                      ';
      const expected = '----(-#)                      ';

      const result = e1.pipe(audit(() => e2));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should audit using durations of varying lengths', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
      const e1 = hot('  abcdefabcdabcdefghabca|     ');
      const e1subs = '  ^---------------------!     ';
      const e2 = [
        cold('          -----x                      '),
        cold('              ---x                    '),
        cold('                  -------x            '),
        cold('                        --x           '),
        cold('                           ----x      '),
      ];
      const e2subs = [
        '               ^----!                      ',
        '               ------^--!                  ',
        '               ----------^------!          ',
        '               ------------------^-!       ',
        '               ---------------------^---!  ',
      ];
      const expected = '-----f---d-------h--c----(a|)';

      let i = 0;
      const result = e1.pipe(audit(() => e2[i++]));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      for (let j = 0; j < e2.size(); j++) {
        expectSubscriptions(e2[j].subscriptions).toBe(e2subs[j]);
      }
    });
  });

  it('should propagate error from duration Observable', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
      const e1 = hot('  abcdefabcdabcdefghabca|');
      const e1subs = '  ^----------------!     ';
      const e2 = [
        cold('          -----x                 '),
        cold('              ---x               '),
        cold('                  -------#       '),
      ];
      const e2subs = [
        '               ^----!                 ',
        '               ------^--!             ',
        '               ----------^------!     ',
      ];
      const expected = '-----f---d-------#     ';

      let i = 0;
      const result = e1.pipe(audit(() => e2[i++]));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      for (let j = 0; j < e2.size(); j++) {
        expectSubscriptions(e2[j].subscriptions).toBe(e2subs[j]);
      }
    });
  });

  it('should propagate error thrown from durationSelector function', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
      const e1 = hot('  abcdefabcdabcdefghabca|   ');
      const e1subs = '  ^---------!               ';
      const e2 = [
        cold('          -----x                    '),
        cold('              ---x                  '),
        cold('                  -------x          '),
      ];
      // prettier-ignore
      const e2subs = [
        '               ^----!                     ',
        '               ------^--!                 ',
      ];
      const expected = '-----f---d#                ';

      let i = 0;
      const result = e1.pipe(
        audit(() => {
          if (i === 2) {
            throw 'error';
          }
          return e2[i++];
        })
      );

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      for (let j = 0; j < e2subs.size(); j++) {
        expectSubscriptions(e2[j].subscriptions).toBe(e2subs[j]);
      }
    });
  });

  it('should complete when source does not emit', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
      const e1 = hot('  -----|');
      const subs = '    ^----!';
      const expected = '-----|';
      function durationSelector() {
        return cold('-----|');
      }

      expectObservable(e1.pipe(audit(durationSelector))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should raise error when source does not emit and raises error', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
      const e1 = hot('  -----#');
      const subs = '    ^----!';
      const expected = '-----#';
      function durationSelector() {
        return cold('   -----|');
      }

      expectObservable(e1.pipe(audit(durationSelector))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should handle an empty source', () => {
    testScheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold(' |');
      const subs = '    (^!)';
      const expected = '|';
      function durationSelector() {
        return cold('   -----|');
      }

      expectObservable(e1.pipe(audit(durationSelector))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should handle a never source', () => {
    testScheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold(' -');
      const subs = '    ^';
      const expected = '-';
      function durationSelector() {
        return cold('   -----|');
      }

      expectObservable(e1.pipe(audit(durationSelector))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should handle a throw source', () => {
    testScheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold(' #');
      const subs = '    (^!)';
      const expected = '#';
      function durationSelector() {
        return cold('   -----|');
      }

      expectObservable(e1.pipe(audit(durationSelector))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should audit by promise resolves', (_, done) => {
    const e1 = interval(1).pipe(take(5));
    const expected = [0, 1, 2, 3, 4];

    e1.pipe(audit(() => Promise.resolve(42))).subscribe({
      next: (x: number) => {
        expect(x).toEqual(expected.shift());
      },
      error: () => {
        done(new Error('should not be called'));
      },
      complete: () => {
        expect(expected.size()).toEqual(0);
        done();
      },
    });
  });

  it('should raise error when promise rejects', (_, done) => {
    const e1 = interval(1).pipe(take(10));
    const expected = [0, 1, 2];
    const err = new Error('error');

    e1.pipe(
      audit((x: number) => {
        if (x === 3) {
          return new Promise((resolve, reject) => {
            reject(err);
          });
        } else {
          return new Promise((resolve) => {
            resolve(42);
          });
        }
      })
    ).subscribe({
      next: (x: number) => {
        expect(x).toEqual(expected.shift());
      },
      error: (err: Error) => {
        expect(err.message).toEqual('error');
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
    const synchronousObservable = new Observable((subscriber) => {
      // This will check to see if the subscriber was closed on each loop
      // when the unsubscribe hits (from the `take`), it should be closed
      for (let i = 0; !subscriber.closed && i < 10; i++) {
        sideEffects.push(i);
        subscriber.next(i);
      }
    });

    synchronousObservable
      .pipe(
        audit(() => of(0)),
        take(3)
      )
      .subscribe(() => {
        /* noop */
      });

    expect(sideEffects).toEqual([0, 1, 2]);
  });

  it('should emit last value after duration completes if source completes first', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
      const e1 = hot('  -a--------xy|  ');
      const e1subs = '  ^-----------!  ';
      const e2 = cold('  ----x         ');
      // prettier-ignore
      const e2subs = [
        '               -^---!         ',
        '               ----------^---!',
      ];
      const expected = '-----a--------(y|)';

      const result = e1.pipe(audit(() => e2));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });
});
