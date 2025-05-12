import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { ObjectUnsubscribedError } from '@rbxts/rx';

/** @test {ObjectUnsubscribedError} */
describe('ObjectUnsubscribedError', () => {
  const err = new ObjectUnsubscribedError();
  it('Should have a name', () => {
    expect(err.name).toEqual('ObjectUnsubscribedError');
  });
  it('Should have a message', () => {
    expect(err.message).toEqual('object unsubscribed');
  });
  it('Should have a stack', () => {
    expect(type(err.stack)).toBe('string');
  });
});
