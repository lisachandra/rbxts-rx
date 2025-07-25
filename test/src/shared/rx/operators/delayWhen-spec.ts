import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { of, EMPTY, interval, take } from '@rbxts/rx';
import { delayWhen, tap } from '@rbxts/rx/out/operators';
import { TestScheduler } from '@rbxts/rx/out/testing';
import { observableMatcher } from '../helpers/observableMatcher';
import { Error } from '@rbxts/luau-polyfill';

/** @test {delayWhen} */
describe('delayWhen', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler(observableMatcher);
  });

  it('should delay by duration selector', () => {
    testScheduler.run(({ cold, hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('  ---a---b---c--|      ');
      const expected = '-----a------c----(b|)';
      const subs = '    ^-------------!      ';
      const selector = [
        cold('             --x--|            '),
        cold('                 ----------(x|)'),
        cold('                     -x--|     '),
      ];
      const selectorSubs = [
        '               ---^-!               ',
        '               -------^---------!   ',
        '               -----------^!        ',
      ];

      let idx = 0;
      function durationSelector(x: any) {
        return selector[idx++];
      }

      const result = e1.pipe(delayWhen(durationSelector));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
      expectSubscriptions(selector[0].subscriptions).toBe(selectorSubs[0]);
      expectSubscriptions(selector[1].subscriptions).toBe(selectorSubs[1]);
      expectSubscriptions(selector[2].subscriptions).toBe(selectorSubs[2]);
    });
  });

  it('should delay by selector', () => {
    testScheduler.run(({ cold, hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('     --a--b--| ');
      const expected = '   ---a--b-| ';
      const subs = '       ^-------! ';
      const selector = cold('-x--|   ');
      //                        -x--|
      // prettier-ignore
      const selectorSubs = [
        '                  --^!      ',
        '                  -----^!   ',
      ];

      const result = e1.pipe(delayWhen((x: any) => selector));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
      expectSubscriptions(selector.subscriptions).toBe(selectorSubs);
    });
  });

  it('should raise error if source raises error', () => {
    testScheduler.run(({ cold, hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('      --a--# ');
      const expected = '    ---a-# ';
      const subs = '        ^----! ';
      const selector = cold(' -x--|');
      const selectorSubs = '--^!   ';

      const result = e1.pipe(delayWhen((x: any) => selector));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
      expectSubscriptions(selector.subscriptions).toBe(selectorSubs);
    });
  });

  it('should raise error if selector raises error', () => {
    testScheduler.run(({ cold, hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('      --a--b--|');
      const expected = '    ---#     ';
      const subs = '        ^--!     ';
      const selector = cold(' -#     ');
      const selectorSubs = '--^!     ';

      const result = e1.pipe(delayWhen((x: any) => selector));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
      expectSubscriptions(selector.subscriptions).toBe(selectorSubs);
    });
  });

  it('should delay by selector and completes after value emits', () => {
    testScheduler.run(({ cold, hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('     --a--b--|       ');
      const expected = '   ---------a--(b|)';
      const subs = '       ^-------!       ';
      const selector = cold('-------x--|   ');
      //                        -------x--|
      // prettier-ignore
      const selectorSubs = [
        '                  --^------!      ',
        '                  -----^------!   '
      ];

      const result = e1.pipe(delayWhen((x: any) => selector));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
      expectSubscriptions(selector.subscriptions).toBe(selectorSubs);
    });
  });

  it('should delay, but not emit if the selector never emits a notification', () => {
    testScheduler.run(({ cold, hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('     --a--b--|   ');
      const expected = '   -----------|';
      const subs = '       ^-------!   ';
      const selector = cold('------|   ');
      //                        ------|
      // prettier-ignore
      const selectorSubs = [
        '                  --^-----!   ',
        '                  -----^-----!'
      ];

      const result = e1.pipe(delayWhen((x: any) => selector));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
      expectSubscriptions(selector.subscriptions).toBe(selectorSubs);
    });
  });

  it('should not emit for async source and sync empty selector', () => {
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('  a--|');
      const expected = '---|';
      const subs = '    ^--!';

      const result = e1.pipe(delayWhen((x: any) => EMPTY));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should not emit if selector never emits', () => {
    testScheduler.run(({ cold, hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('     --a--b--|');
      const expected = '   -        ';
      const subs = '       ^-------!';
      const selector = cold('-      ');
      //                        -
      // prettier-ignore
      const selectorSubs = [
        '                  --^      ',
        '                  -----^   ',
      ];

      const result = e1.pipe(delayWhen((x: any) => selector));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
      expectSubscriptions(selector.subscriptions).toBe(selectorSubs);
    });
  });

  it('should delay by first value from selector', () => {
    testScheduler.run(({ cold, hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('     --a--b--|       ');
      const expected = '   ------a--(b|)   ';
      const subs = '       ^-------!       ';
      const selector = cold('----x--y--|   ');
      //                        ----x--y--|
      // prettier-ignore
      const selectorSubs = [
        '                  --^---!         ',
        '                  -----^---!      ',
      ];

      const result = e1.pipe(delayWhen((x: any) => selector));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
      expectSubscriptions(selector.subscriptions).toBe(selectorSubs);
    });
  });

  it('should delay by selector that does not completes', () => {
    testScheduler.run(({ cold, hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('     --a--b--|          ');
      const expected = '   ------a--(b|)      ';
      const subs = '       ^-------!          ';
      const selector = cold('----x-----y---   ');
      //                        ----x-----y---
      // prettier-ignore
      const selectorSubs = [
        '                  --^---!            ',
        '                  -----^---!         '
      ];

      const result = e1.pipe(delayWhen((x: any) => selector));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
      expectSubscriptions(selector.subscriptions).toBe(selectorSubs);
    });
  });

  it('should raise error if selector throws', () => {
    testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('  --a--b--|');
      const e1subs = '  ^-!      ';
      const expected = '--#      ';

      const err = new Error('error');
      const result = e1.pipe(
        delayWhen(<any>((x: any) => {
          throw err;
        }))
      );

      expectObservable(result).toBe(expected, undefined, err);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should start subscription when subscription delay emits', () => {
    testScheduler.run(({ cold, hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('       -----a---b---| ');
      const expected = '     -------a---b-| ';
      const subs = '         ---^---------! ';
      const selector = cold('     --x--|    ');
      //                              --x--|
      // prettier-ignore
      const selectorSubs = [
        '                      -----^-!     ',
        '                      ---------^-! '
      ];
      const subDelay = cold('---x--|        ');
      const subDelaySub = '  ^--!           ';

      const result = e1.pipe(delayWhen((x: any) => selector, subDelay));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
      expectSubscriptions(selector.subscriptions).toBe(selectorSubs);
      expectSubscriptions(subDelay.subscriptions).toBe(subDelaySub);
    });
  });

  it('should start subscription when subscription delay completes without emit value', () => {
    testScheduler.run(({ cold, hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('       -----a---b---| ');
      const expected = '     -------a---b-| ';
      const subs = '         ---^---------! ';
      const selector = cold('     --x--|    ');
      //                              --x--|
      // prettier-ignore
      const selectorSubs = [
        '                    -----^-!       ',
        '                    ---------^-!   '
      ];
      const subDelay = cold('---|           ');
      const subDelaySub = '  ^--!           ';

      const result = e1.pipe(delayWhen((x: any) => selector, subDelay));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
      expectSubscriptions(selector.subscriptions).toBe(selectorSubs);
      expectSubscriptions(subDelay.subscriptions).toBe(subDelaySub);
    });
  });

  it('should raise error when subscription delay raises error', () => {
    testScheduler.run(({ cold, hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('       -----a---b---|');
      const expected = '     ---#          ';
      const selector = cold('     --x--|   ');
      const subDelay = cold('---#          ');
      const subDelaySub = '  ^--!          ';

      const result = e1.pipe(delayWhen((x: any) => selector, subDelay));

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe([]);
      expectSubscriptions(selector.subscriptions).toBe([]);
      expectSubscriptions(subDelay.subscriptions).toBe(subDelaySub);
    });
  });

  it('should complete when duration selector returns synchronous observable', () => {
    let next0: boolean = false;
    let complete: boolean = false;

    of(1)
      .pipe(delayWhen(() => of(2)))
      .subscribe({ next: () => (next0 = true), complete: () => (complete = true) });

    expect(next0).toBe(true);
    expect(complete).toBe(true);
  });

  it('should call predicate with indices starting at 0', () => {
    testScheduler.run(({ cold, hot, expectObservable, expectSubscriptions }) => {
      const e1 = hot('       --a--b--c--|');
      const e1subs = '       ^----------!';
      const expected = '     --a--b--c--|';
      const selector = cold('  (x|)');
      //                          (x|)
      //                             (x|)

      let indices: number[] = [];
      const predicate = (value: string, index: number) => {
        indices.push(index);
        return selector;
      };

      const result = e1.pipe(delayWhen(predicate));

      expectObservable(
        result.pipe(
          tap({
            complete: () => {
              expect(indices).toEqual([0, 1, 2]);
            },
          })
        )
      ).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should delayWhen Promise resolves', (_, done) => {
    const e1 = interval(1).pipe(take(5));
    const expected = [0, 1, 2, 3, 4];

    e1.pipe(delayWhen(() => Promise.resolve(42))).subscribe({
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

  it('should raise error when Promise rejects', (_, done) => {
    const e1 = interval(1).pipe(take(10));
    const expected = [0, 1, 2];
    const err = new Error('err');

    e1.pipe(delayWhen((x) => (x === 3 ? Promise.reject(err) : Promise.resolve(42)))).subscribe({
      next: (x: number) => {
        expect(x).toEqual(expected.shift());
      },
      error: (err: any) => {
        expect(err).toBeInstanceOf(Error);
        expect(expected.size()).toEqual(0);
        done();
      },
      complete: () => {
        done(new Error('should not be called'));
      },
    });
  });
});
