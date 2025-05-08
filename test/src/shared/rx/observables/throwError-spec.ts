import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { TestScheduler } from '@rbxts/rx/out/testing';
import { throwError } from '@rbxts/rx';
import { observableMatcher } from '../helpers/observableMatcher';
import { Error } from '@rbxts/luau-polyfill';

/** @test {throwError} */
describe('throwError', () => {
  let rxTest: TestScheduler;

  beforeEach(() => {
    rxTest = new TestScheduler(observableMatcher);
  });

  it('should create a cold observable that just emits an error', () => {
    rxTest.run(({ expectObservable }) => {
      const expected = '#';
      const e1 = throwError(() => 'error');
      expectObservable(e1).toBe(expected);
    });
  });

  it('should emit one value', (_, done) => {
    let calls = 0;
    throwError(() => 'bad').subscribe({
      next: () => {
        done(new Error('should not be called'));
      },
      error: (err) => {
        expect(++calls).toEqual(1);
        expect(err).toEqual('bad');
        done();
      },
    });
  });

  it('should accept scheduler', () => {
    rxTest.run(({ expectObservable }) => {
      const e = throwError('error', rxTest);

      expectObservable(e).toBe('#');
    });
  });

  it('should accept a factory function', () => {
    let calls = 0;
    const errors: any[] = [];

    const source = throwError(() => ({
      call: ++calls,
      message: 'LOL',
    }));

    source.subscribe({
      next: () => {
        throw new Error('this should not happen');
      },
      error: (err) => {
        errors.push(err);
      },
    });

    source.subscribe({
      next: () => {
        throw new Error('this should not happen');
      },
      error: (err) => {
        errors.push(err);
      },
    });

    expect(errors).toEqual([
      {
        call: 1,
        message: 'LOL',
      },
      {
        call: 2,
        message: 'LOL',
      },
    ]);
  });
});
