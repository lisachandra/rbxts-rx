import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { SUSPENSE } from '@rbxts/rx-state/out/SUSPENSE';
import { from, Observable } from '@rbxts/rx';
import { sinkSuspense } from '@rbxts/rx-state/out';

describe('sinkSuspense', () => {
  it('propagates SUSPENSE as errors', () => {
    const test$ = from([1, SUSPENSE, 3, SUSPENSE, 5] as const).pipe(sinkSuspense());

    const values: Array<number> = [];
    const errors = new Array<any>();
    test$.subscribe(
      (x) => {
        values.push(x);
      },
      (e) => {
        errors.push(e);
      }
    );

    expect(values).toEqual([1]);
    expect(errors).toEqual([SUSPENSE]);
  });

  it('keeps the source subscription alive after synchronously re-subscribing upon receiving a SUSPENSE', () => {
    let nSubscriptions = 0;
    const source$ = new Observable<number | SUSPENSE>((observer) => {
      nSubscriptions++;
      for (let i = 0; i < 10 && !observer.closed; i++) {
        observer.next(i === 3 ? SUSPENSE : i);
      }
    });

    const values: Array<number | null> = [];
    const errors = new Array<any>();
    const sinked$ = source$.pipe(sinkSuspense());
    sinked$.subscribe(
      (x) => {
        values.push(x);
      },
      (e) => {
        if (e === SUSPENSE) {
          errors.push(e);
          sinked$.subscribe((x) => {
            values.push(x);
          });
        } else {
          errors.push(e);
        }
      }
    );

    expect(nSubscriptions).toBe(1);
    expect(values).toEqual([0, 1, 2, 4, 5, 6, 7, 8, 9]);
    expect(errors).toEqual([SUSPENSE]);
  });

  it('propagates errors', () => {
    let nSubscriptions = 0;
    const source$ = new Observable<number | SUSPENSE>((observer) => {
      nSubscriptions++;
      for (let i = 0; i < 10 && !observer.closed; i++) {
        if (i === 2) observer.error(2);
        observer.next(i === 3 ? SUSPENSE : i);
      }
    });

    const values: Array<number | null> = [];
    const errors = new Array<any>();
    const sinked$ = source$.pipe(sinkSuspense());
    sinked$.subscribe(
      (x) => {
        values.push(x);
      },
      (e) => {
        if (e === SUSPENSE) {
          errors.push(e);
          sinked$.subscribe((x) => {
            values.push(x);
          });
        } else {
          errors.push(e);
        }
      }
    );

    expect(nSubscriptions).toBe(1);
    expect(values).toEqual([0, 1]);
    expect(errors).toEqual([2]);
  });

  it('propagates completes', () => {
    let nSubscriptions = 0;
    const source$ = new Observable<number | SUSPENSE>((observer) => {
      nSubscriptions++;
      for (let i = 0; i < 10 && !observer.closed; i++) {
        if (i === 2) observer.complete();
        observer.next(i === 3 ? SUSPENSE : i);
      }
    });

    const values: Array<number | null> = [];
    const errors = new Array<any>();
    const sinked$ = source$.pipe(sinkSuspense());
    sinked$.subscribe(
      (x) => {
        values.push(x);
      },
      (e) => {
        if (e === SUSPENSE) {
          errors.push(e);
          sinked$.subscribe((x) => {
            values.push(x);
          });
        } else {
          errors.push(e);
        }
      }
    );

    expect(nSubscriptions).toBe(1);
    expect(values).toEqual([0, 1]);
    expect(errors).toEqual([]);
  });
});
