import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { ArgumentOutOfRangeError } from '@rbxts/rx';

/** @test {ArgumentOutOfRangeError} */
describe('ArgumentOutOfRangeError', () => {
  const error = new ArgumentOutOfRangeError();
  it('Should have a name', () => {
    expect(error.name).toEqual('ArgumentOutOfRangeError');
  });
  it('Should have a message', () => {
    expect(error.message).toEqual('argument out of range');
  });
  it('Should have a stack', () => {
    expect(type(error.stack)).toBe('string');
  });
});
