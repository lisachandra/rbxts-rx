import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { SUSPENSE } from '@rbxts/rx-state/out/SUSPENSE';
import { concat, from, map, Observable, scan, take, throwError, timer } from '@rbxts/rx';
import { liftSuspense, sinkSuspense } from '@rbxts/rx-state/out';
import { setTimeout } from '@rbxts/luau-polyfill';

describe('liftSuspense', () => {
  it('lifts SUSPENSE', () => {
    let nSubscriptions = 0;
    const source = new Observable<number | SUSPENSE>( function (observer) {
      nSubscriptions++;
      for (let i = 0; i < 10 && !observer.closed; i++) {
        observer.next([3, 6].includes(i) ? SUSPENSE : i);
      }
    });

    const values: Array<number | SUSPENSE> = [];
    const errors = new Array<defined>();
    const valuesObservable = source.pipe(
      sinkSuspense(),
      map((x) => x * 2),
      liftSuspense(),
      take(9)
    );
    valuesObservable.subscribe(
      (x) => {
        values.push(x);
      },
      (e) => {
        errors.push(e);
      }
    );

    expect(nSubscriptions).toBe(1);
    expect(values).toEqual([0, 2, 4, SUSPENSE, 8, 10, SUSPENSE, 14, 16]);
    expect(errors).toEqual([]);
  });

  it('works with complex async values', async () => {
    const test = concat([SUSPENSE] as const, timer(20)).pipe(
      sinkSuspense(),
      map((x) => x + 10),
      liftSuspense()
    );

    const values: Array<number | SUSPENSE> = [];
    const errors = new Array<defined>();
    test.subscribe(
      (x) => {
        values.push(x);
      },
      (e) => {
        errors.push(e);
      }
    );

    await new Promise((res) => setTimeout(res, 30, undefined));

    expect(values).toEqual([SUSPENSE, 10]);
    expect(errors).toEqual([]);
  });

  it('propagates normal errors', async () => {
    const test = concat(
      [SUSPENSE] as const,
      timer(20),
      throwError(() => 'foo')
    ).pipe(
      sinkSuspense(),
      map((x) => x + 10),
      liftSuspense()
    );

    const values: Array<number | SUSPENSE> = [];
    const errors = new Array<defined>();
    test.subscribe(
      (x) => {
        values.push(x);
      },
      (e) => {
        errors.push(e);
      }
    );

    await new Promise((res) => setTimeout(res, 30, undefined));

    expect(values).toEqual([SUSPENSE, 10]);
    expect(errors).toEqual(['foo']);
  });

  it('resets stateful Observables upon SUSPENSE emission', async () => {
    const test = from([1, 2, SUSPENSE, 4, 5, SUSPENSE, 7, 8] as const).pipe(
      sinkSuspense(),
      scan((a, b) => a + b, 0),
      liftSuspense()
    );

    const values: Array<number | SUSPENSE> = [];
    const errors = new Array<defined>();
    test.subscribe(
      (x) => {
        values.push(x);
      },
      (e) => {
        errors.push(e);
      }
    );

    await new Promise((res) => setTimeout(res, 30, undefined));

    expect(values).toEqual([1, 3, SUSPENSE, 4, 9, SUSPENSE, 7, 15]);
    expect(errors).toEqual([]);
  });
});
