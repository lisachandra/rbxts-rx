import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { TimeoutError } from '@rbxts/rx';

/** @test {TimeoutError} */
describe('TimeoutError', () => {
  const error = new TimeoutError();
  it('Should have a name', () => {
    expect(error.name).toEqual('TimeoutError');
  });
  it('Should have a message', () => {
    expect(error.message).toEqual('Timeout has occurred');
  });
  it('Should have a stack', () => {
    expect(type(error.stack)).toBe('string');
  });
});
