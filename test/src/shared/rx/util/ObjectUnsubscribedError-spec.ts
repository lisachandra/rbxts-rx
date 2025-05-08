import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { ObjectUnsubscribedError } from '@rbxts/rx';

/** @test {ObjectUnsubscribedError} */
describe('ObjectUnsubscribedError', () => {
  const error = new ObjectUnsubscribedError();
  it('Should have a name', () => {
    expect(error.name).toEqual('ObjectUnsubscribedError');
  });
  it('Should have a message', () => {
    expect(error.message).toEqual('object unsubscribed');
  });
  it('Should have a stack', () => {
    expect(type(error.stack)).toBe('string');
  });
});
