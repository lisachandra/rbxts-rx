import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { Error } from '@rbxts/luau-polyfill';
import { interval, lastValueFrom, EMPTY, EmptyError, throwError, of } from '@rbxts/rx';

import { finalize, take } from '@rbxts/rx/out/operators';

describe('lastValueFrom', () => {
  it('should emit the last value as a promise', async () => {
    let finalized = false;
    const source = interval(2).pipe(
      take(10),
      finalize(() => (finalized = true))
    );
    const result = await lastValueFrom(source);
    expect(result).toEqual(9);
    expect(finalized).toBe(true);
  });

  it('should support a default value', async () => {
    const source = EMPTY;
    const result = await lastValueFrom(source, { defaultValue: 0 });
    expect(result).toEqual(0);
  });

  it('should support an undefined config', async () => {
    const source = EMPTY;
    let error: any = undefined;
    try {
      await lastValueFrom(source, undefined as any);
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(EmptyError);
  });

  it('should error for empty observables', async () => {
    const source = EMPTY;
    let error: any = undefined;
    try {
      await lastValueFrom(source);
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(EmptyError);
  });

  it('should error for errored observables', async () => {
    const source = throwError(() => new Error('blorp!'));
    let error: any = undefined;
    try {
      await lastValueFrom(source);
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toEqual('blorp!');
  });

  it('should work with a synchronous observable', async () => {
    let finalized = false;
    const source = of('apples', 'bananas').pipe(finalize(() => (finalized = true)));
    const result = await lastValueFrom(source);
    expect(result).toEqual('bananas');
    expect(finalized).toBe(true);
  });
});
