import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { TimeoutError } from '@rbxts/rx';

/** @test {TimeoutError} */
describe('TimeoutError', () => {
  const err = new TimeoutError();
  it('Should have a name', () => {
    expect(err.name).toEqual('TimeoutError');
  });
  it('Should have a message', () => {
    expect(err.message).toEqual('Timeout has occurred');
  });
  it('Should have a stack', () => {
    expect(type(err.stack)).toBe('string');
  });
});
