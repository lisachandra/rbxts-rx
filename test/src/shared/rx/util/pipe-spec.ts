import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { pipe } from '@rbxts/rx';

describe('pipe', () => {
  it('should exist', () => {
    expect(type(pipe)).toBe('function');
  });

  it('should pipe two functions together', () => {
    const a = (x: number) => x + x;
    const b = (x: number) => x - 1;

    const c = pipe(a, b);
    expect(type(c)).toBe('function');
    expect(c(1)).toEqual(1);
    expect(c(10)).toEqual(19);
  });

  it('should return the same function if only one is passed', () => {
    const a = <T>(x: T) => x;
    const c = pipe(a);

    expect(c).toEqual(a);
  });

  it('should return the identity if not passed any functions', () => {
    const c = pipe();

    expect(c('whatever')).toEqual('whatever');
    const someObj = {};
    expect(c(someObj)).toEqual(someObj);
  });
});
