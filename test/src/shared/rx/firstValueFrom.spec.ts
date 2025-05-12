import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { Error } from '@rbxts/luau-polyfill';
import { interval, firstValueFrom, EMPTY, EmptyError, throwError, of, Observable } from '@rbxts/rx';

import { finalize } from '@rbxts/rx/out/operators';

describe('firstValueFrom', () => {
  it('should emit the first value as a promise', async () => {
    let finalized = false;
    const source = interval(10).pipe(finalize(() => (finalized = true)));
    const result = await firstValueFrom(source);
    expect(result).toEqual(0);
    expect(finalized).toBe(true);
  });

  it('should support a default value', async () => {
    const source = EMPTY;
    const result = await firstValueFrom(source, { defaultValue: 0 });
    expect(result).toEqual(0);
  });

  it('should support an undefined config', async () => {
    const source = EMPTY;
    let err: any = undefined;
    try {
      await firstValueFrom(source, undefined as any);
    } catch (e) {
      err = e as Error;
    }
    expect(err).toBeInstanceOf(EmptyError);
  });

  it('should error for empty observables', async () => {
    const source = EMPTY;
    let err: Error = undefined as never;
    try {
      await firstValueFrom(source);
    } catch (e) {
      err = e as Error;
    }
    expect(err).toBeInstanceOf(EmptyError);
  });

  it('should error for errored observables', async () => {
    const source = throwError(() => new Error('blorp!'));
    let err: Error = undefined as never;
    try {
      await firstValueFrom(source);
    } catch (e) {
      err = e as Error;
    }
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toEqual('blorp!');
  });

  it('should work with a synchronous observable', async () => {
    let finalized = false;
    const source = of('apples', 'bananas').pipe(finalize(() => (finalized = true)));
    const result = await firstValueFrom(source);
    expect(result).toEqual('apples');
    expect(finalized).toBe(true);
  });

  it('should stop listening to a synchronous observable when resolved', async () => {
    const sideEffects: number[] = [];
    const synchronousObservable = new Observable<number>(function (subscriber) {
      // This will check to see if the subscriber was closed on each loop
      // when the unsubscribe hits (from the `take`), it should be closed
      for (let i = 0; !subscriber.closed && i < 10; i++) {
        sideEffects.push(i);
        subscriber.next(i);
      }
    });

    const result = await firstValueFrom(synchronousObservable);
    expect(sideEffects).toEqual([0]);
  });
});
