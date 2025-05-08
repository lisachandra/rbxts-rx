import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { EmptyError } from '@rbxts/rx';

/** @test {EmptyError} */
describe('EmptyError', () => {
  const error = new EmptyError();
  it('Should have a name', () => {
    expect(error.name).toEqual('EmptyError');
  });
  it('Should have a message', () => {
    expect(error.message).toEqual('no elements in sequence');
  });
  it('Should have a stack', () => {
    expect(type(error.stack)).toBe('string');
  });
});
