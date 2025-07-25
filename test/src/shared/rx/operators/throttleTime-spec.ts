import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { throttleTime, take, map, mergeMap } from '@rbxts/rx/out/operators';
import { TestScheduler } from '@rbxts/rx/out/testing';
import { of, concat, timer } from '@rbxts/rx';
import { observableMatcher } from '../helpers/observableMatcher';

/** @test {throttleTime} */
describe('throttleTime operator', () => {
  let rxTest: TestScheduler;

  beforeEach(() => {
    rxTest = new TestScheduler(observableMatcher);
  });

  describe('default behavior { leading: true, trailing: false }', () => {
    it('should immediately emit the first value in each time window', () => {
      rxTest.run(({ hot, expectObservable, expectSubscriptions }) => {
        const e1 = hot('  -a-x-y----b---x-cx---|');
        //                 ----|    ----| ----|
        const expected = '-a--------b-----c----|';
        const subs = '    ^--------------------!';

        const result = e1.pipe(throttleTime(5));

        expectObservable(result).toBe(expected);
        expectSubscriptions(e1.subscriptions).toBe(subs);
      });
    });

    it('should throttle events by 5 time units', (_, done) => {
      of(1, 2, 3)
        .pipe(throttleTime(5))
        .subscribe({
          next: (x) => {
            expect(x).toEqual(1);
          },
          complete: done,
        });
    });

    it('should throttle events multiple times', () => {
      const expected = ['1-0', '2-0'];
      concat(
        timer(0, 1).pipe(
          take(3),
          map((x) => '1-' + x)
        ),
        timer(8, 1).pipe(
          take(5),
          map((x) => '2-' + x)
        )
      )
        .pipe(throttleTime(5, rxTest))
        .subscribe((x) => {
          expect(x).toEqual(expected.shift());
        });

      rxTest.flush();
    });

    it('should simply mirror the source if values are not emitted often enough', () => {
      rxTest.run(({ hot, expectObservable, expectSubscriptions }) => {
        const e1 = hot('  -a--------b-----c----|');
        const subs = '    ^--------------------!';
        const expected = '-a--------b-----c----|';

        expectObservable(e1.pipe(throttleTime(5))).toBe(expected);
        expectSubscriptions(e1.subscriptions).toBe(subs);
      });
    });

    it('should handle a busy producer emitting a regular repeating sequence', () => {
      rxTest.run(({ hot, expectObservable, expectSubscriptions }) => {
        const e1 = hot('  abcdefabcdefabcdefabcdefa|');
        const subs = '    ^------------------------!';
        const expected = 'a-----a-----a-----a-----a|';

        expectObservable(e1.pipe(throttleTime(5))).toBe(expected);
        expectSubscriptions(e1.subscriptions).toBe(subs);
      });
    });

    it('should complete when source does not emit', () => {
      rxTest.run(({ hot, expectObservable, expectSubscriptions }) => {
        const e1 = hot('  -----|');
        const subs = '    ^----!';
        const expected = '-----|';

        expectObservable(e1.pipe(throttleTime(5))).toBe(expected);
        expectSubscriptions(e1.subscriptions).toBe(subs);
      });
    });

    it('should raise error when source does not emit and raises error', () => {
      rxTest.run(({ hot, expectObservable, expectSubscriptions }) => {
        const e1 = hot('  -----#');
        const subs = '    ^----!';
        const expected = '-----#';

        expectObservable(e1.pipe(throttleTime(10))).toBe(expected);
        expectSubscriptions(e1.subscriptions).toBe(subs);
      });
    });

    it('should handle an empty source', () => {
      rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
        const e1 = cold(' |');
        const subs = '    (^!)';
        const expected = '|';

        expectObservable(e1.pipe(throttleTime(30))).toBe(expected);
        expectSubscriptions(e1.subscriptions).toBe(subs);
      });
    });

    it('should handle a never source', () => {
      rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
        const e1 = cold(' -');
        const subs = '    ^';
        const expected = '-';

        expectObservable(e1.pipe(throttleTime(30))).toBe(expected);
        expectSubscriptions(e1.subscriptions).toBe(subs);
      });
    });

    it('should handle a throw source', () => {
      rxTest.run(({ cold, expectObservable, expectSubscriptions }) => {
        const e1 = cold(' #');
        const subs = '    (^!)';
        const expected = '#';

        expectObservable(e1.pipe(throttleTime(30))).toBe(expected);
        expectSubscriptions(e1.subscriptions).toBe(subs);
      });
    });

    it('should throttle and does not complete when source does not completes', () => {
      rxTest.run(({ hot, expectObservable, expectSubscriptions }) => {
        const e1 = hot('  -a--(bc)-------d----------------');
        const unsub = '   -------------------------------!';
        const subs = '    ^------------------------------!';
        const expected = '-a-------------d----------------';

        expectObservable(e1.pipe(throttleTime(5)), unsub).toBe(expected);
        expectSubscriptions(e1.subscriptions).toBe(subs);
      });
    });

    it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
      rxTest.run(({ hot, expectObservable, expectSubscriptions }) => {
        const e1 = hot('  -a--(bc)-------d----------------');
        const subs = '    ^------------------------------!';
        const expected = '-a-------------d----------------';
        const unsub = '   -------------------------------!';

        const result = e1.pipe(
          mergeMap((x) => of(x)),
          throttleTime(5),
          mergeMap((x) => of(x))
        );

        expectObservable(result, unsub).toBe(expected);
        expectSubscriptions(e1.subscriptions).toBe(subs);
      });
    });

    it('should throttle values until source raises error', () => {
      rxTest.run(({ hot, expectObservable, expectSubscriptions }) => {
        const e1 = hot('  -a--(bc)-------d---------------#');
        const subs = '    ^------------------------------!';
        const expected = '-a-------------d---------------#';

        expectObservable(e1.pipe(throttleTime(5))).toBe(expected);
        expectSubscriptions(e1.subscriptions).toBe(subs);
      });
    });
  });

  describe('throttleTime(fn, { leading: true, trailing: true })', () => {
    it('should immediately emit the first and last values in each time window', () => {
      rxTest.run(({ hot, time, expectObservable, expectSubscriptions }) => {
        const e1 = hot('  -a-xy-----b--x--cxxx--|');
        const e1subs = '  ^---------------------!';
        const t = time('   ----|                 ');
        //                     ----|----|---|---|
        const expected = '-a---y----b---x---x---(x|)';

        const result = e1.pipe(throttleTime(t, rxTest, { trailing: true }));

        expectObservable(result).toBe(expected);
        expectSubscriptions(e1.subscriptions).toBe(e1subs);
      });
    });

    it('should emit the value if only a single one is given', () => {
      rxTest.run(({ hot, time, expectObservable }) => {
        const e1 = hot('  -a--------------------|');
        const t = time('   ----|                 ');
        const expected = '-a--------------------|';

        const result = e1.pipe(throttleTime(t, rxTest, { trailing: true }));

        expectObservable(result).toBe(expected);
      });
    });
  });

  describe('throttleTime(fn, { leading: false, trailing: true })', () => {
    it('should immediately emit the last value in each time window', () => {
      rxTest.run(({ hot, time, expectObservable, expectSubscriptions }) => {
        const e1 = hot('  -a-xy-----b--x--cxxx--|');
        const e1subs = '  ^---------------------!';
        const t = time('   ----|                 ');
        //                 ----|---|----|---|---|
        const expected = '-----y--------x---x---(x|)';

        const result = e1.pipe(throttleTime(t, rxTest, { leading: false, trailing: true }));

        expectObservable(result).toBe(expected);
        expectSubscriptions(e1.subscriptions).toBe(e1subs);
      });
    });

    it('should emit the last throttled value when complete', () => {
      rxTest.run(({ hot, time, expectObservable, expectSubscriptions }) => {
        const e1 = hot('  -a-xy-----b--x--cxx-|');
        const e1subs = '  ^-------------------!';
        const t = time('   ----|               ');
        //                 ----|---|----|---|---|
        const expected = '-----y--------x---x-|';

        const result = e1.pipe(throttleTime(t, rxTest, { leading: false, trailing: true }));

        expectObservable(result).toBe(expected);
        expectSubscriptions(e1.subscriptions).toBe(e1subs);
      });
    });

    it('should emit the value if only a single one is given', () => {
      rxTest.run(({ hot, time, expectObservable }) => {
        const e1 = hot('  -a--------------------|');
        const t = time('   ----|                 ');
        const expected = '-----a----------------|';

        const result = e1.pipe(throttleTime(t, rxTest, { leading: false, trailing: true }));

        expectObservable(result).toBe(expected);
      });
    });
  });
});
