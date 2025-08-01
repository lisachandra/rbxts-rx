import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { NEVER } from '@rbxts/rx';

import { TestScheduler } from '@rbxts/rx/out/testing';
import { observableMatcher } from '../helpers/observableMatcher';

/** @test {NEVER} */
describe('NEVER', () => {
  let rxTestScheduler: TestScheduler;

  beforeEach(() => {
    rxTestScheduler = new TestScheduler(observableMatcher);
  });

  it('should create a cold observable that never emits', () => {
    rxTestScheduler.run(({ expectObservable }) => {
      const expected = '-';
      const e1 = NEVER;
      expectObservable(e1).toBe(expected);
    });
  });

  it('should return the same instance every time', () => {
    expect(NEVER).toEqual(NEVER);
  });
});
