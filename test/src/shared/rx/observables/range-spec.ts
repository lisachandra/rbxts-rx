import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { asapScheduler as asap, range, of } from '@rbxts/rx';
import { TestScheduler } from '@rbxts/rx/out/testing';
import { concatMap, delay } from '@rbxts/rx/out/operators';
import { observableMatcher } from '../helpers/observableMatcher';
import { Error } from '@rbxts/luau-polyfill';

/** @test {range} */
describe('range', () => {
  let rxTestScheduler: TestScheduler;

  beforeEach(() => {
    rxTestScheduler = new TestScheduler(observableMatcher);
  });

  it('should create an observable with numbers 1 to 10', () => {
    rxTestScheduler.run(({ expectObservable, time }) => {
      const delayAmount = time('--|');
      //                          --|
      //                            --|
      //                              --|
      //                                --|
      //                                  --|
      //                                    --|
      //                                      --|
      //                                        --|
      const expected = '        a-b-c-d-e-f-g-h-i-(j|)';

      const e1 = range(1, 10)
        // for the purpose of making a nice diagram, spread out the synchronous emissions
        .pipe(concatMap((x, i) => of(x).pipe(delay(i === 0 ? 0 : delayAmount))));
      const values = {
        a: 1,
        b: 2,
        c: 3,
        d: 4,
        e: 5,
        f: 6,
        g: 7,
        h: 8,
        i: 9,
        j: 10,
      };
      expectObservable(e1).toBe(expected, values);
    });
  });

  it('should work for two subscribers', () => {
    rxTestScheduler.run(({ expectObservable, time }) => {
      const delayAmount = time('--|');
      //                          --|
      //                            --|
      //                              --|
      const expected = '        a-b-c-d-(e|)';

      const e1 = range(1, 5).pipe(concatMap((x, i) => of(x).pipe(delay(i === 0 ? 0 : delayAmount))));

      const values = {
        a: 1,
        b: 2,
        c: 3,
        d: 4,
        e: 5,
      };
      expectObservable(e1).toBe(expected, values);
      expectObservable(e1).toBe(expected, values);
    });
  });

  it('should synchronously create a range of values by default', () => {
    const results: defined[] = [];
    range(12, 4).subscribe(function (x) {
      results.push(x);
    });
    expect(results).toEqual([12, 13, 14, 15]);
  });

  it('should accept a scheduler', (_, done) => {
    const expected = [12, 13, 14, 15];
    const spy = jest.spyOn(asap, 'schedule');

    const source = range(12, 4, asap);

    source.subscribe({
      next: (x) => {
        expect(spy).toHaveBeenCalled();
        const exp = expected.shift();
        expect(x).toEqual(exp);
      },
      error: (x) => {
        done(new Error('should not be called'));
      },
      complete: () => {
        spy.mockRestore();
        done();
      },
    });
  });

  it('should accept only one argument where count is argument and start is zero', () => {
    rxTestScheduler.run(({ expectObservable, time }) => {
      const delayAmount = time('--|');
      //                          --|
      //                            --|
      //                              --|
      const expected = '        a-b-c-d-(e|)';

      const e1 = range(5).pipe(concatMap((x, i) => of(x).pipe(delay(i === 0 ? 0 : delayAmount))));
      const values = {
        a: 0,
        b: 1,
        c: 2,
        d: 3,
        e: 4,
      };
      expectObservable(e1).toBe(expected, values);
      expectObservable(e1).toBe(expected, values);
    });
  });

  it('should return empty for range(0)', () => {
    const results: defined[] = [];
    range(0).subscribe({
      next: (value) => results.push(value),
      complete: () => results.push('done'),
    });
    expect(results).toEqual(['done']);
  });

  it('should return empty for range with a negative count', () => {
    const results: defined[] = [];
    range(5, -5).subscribe({
      next: (value) => results.push(value),
      complete: () => results.push('done'),
    });
    expect(results).toEqual(['done']);
  });
});
