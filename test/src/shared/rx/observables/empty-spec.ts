import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { empty, EMPTY } from '@rbxts/rx';
import { TestScheduler } from '@rbxts/rx/out/testing';
import { observableMatcher } from '../helpers/observableMatcher';

/** @test {empty} */
describe('empty', () => {
  let rxTestScheduler: TestScheduler;

  beforeEach(() => {
    rxTestScheduler = new TestScheduler(observableMatcher);
  });

  it('should return EMPTY', () => {
    expect(empty()).toEqual(EMPTY);
  });

  it('should create a cold observable with only complete', () => {
    rxTestScheduler.run(({ expectObservable }) => {
      const expected = '|';
      const e1 = empty();
      expectObservable(e1).toBe(expected);
    });
  });

  it('should return the same instance EMPTY', () => {
    const s1 = empty();
    const s2 = empty();
    expect(s1).toEqual(s2);
  });

  it('should be synchronous by default', () => {
    const source = empty();
    let hit = false;
    source.subscribe({
      complete() {
        hit = true;
      },
    });
    expect(hit).toBe(true);
  });

  it('should equal EMPTY', () => {
    expect(empty()).toEqual(EMPTY);
  });

  it('should take a scheduler', () => {
    const source = empty(rxTestScheduler);
    let hit = false;
    source.subscribe({
      complete() {
        hit = true;
      },
    });
    expect(hit).toBe(false);
    rxTestScheduler.flush();
    expect(hit).toBe(true);
  });
});
