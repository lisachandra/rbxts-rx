import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { ArgumentOutOfRangeError } from '@rbxts/rx';

/** @test {ArgumentOutOfRangeError} */
describe('ArgumentOutOfRangeError', () => {
  const err = new ArgumentOutOfRangeError();
  it('Should have a name', () => {
    expect(err.name).toEqual('ArgumentOutOfRangeError');
  });
  it('Should have a message', () => {
    expect(err.message).toEqual('argument out of range');
  });
  it('Should have a stack', () => {
    expect(type(err.stack)).toBe('string');
  });
});
