import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { Error } from '@rbxts/luau-polyfill';
import { UnsubscriptionError, Observable, timer, merge } from '@rbxts/rx';

/** @test {UnsubscriptionError} */
describe('UnsubscriptionError', () => {
  it('should create a message that is a clear indication of its internal errors', () => {
    const err1 = new Error('Swiss cheese tastes amazing but smells like socks');
    const err2 = new Error('User too big to fit in tiny European elevator');
    const source1 = new Observable(() => () => {
      throw err1;
    });
    const source2 = timer(1000);
    const source3 = new Observable(() => () => {
      throw err2;
    });
    const source = merge(source1, source2, source3);

    const subscription = source.subscribe();

    try {
      subscription.unsubscribe();
    } catch (arg) {
      if (arg instanceof UnsubscriptionError) {
        const err: UnsubscriptionError = arg;
        expect(err.errors).toEqual([err1, err2]);
        expect(err.name).toEqual('UnsubscriptionError');
        expect(type(err.stack)).toBe('string');
      } else {
        throw new Error('Invalid error type');
      }
    }
  });
});
