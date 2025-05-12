import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { EmptyError } from '@rbxts/rx';

/** @test {EmptyError} */
describe('EmptyError', () => {
  const err = new EmptyError();
  it('Should have a name', () => {
    expect(err.name).toEqual('EmptyError');
  });
  it('Should have a message', () => {
    expect(err.message).toEqual('no elements in sequence');
  });
  it('Should have a stack', () => {
    expect(type(err.stack)).toBe('string');
  });
});
