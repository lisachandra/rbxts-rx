import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { BehaviorSubject, merge } from '@rbxts/rx';
import { connect, delay } from '@rbxts/rx/out/operators';
import { TestScheduler } from '@rbxts/rx/out/testing';
import { observableMatcher } from '../helpers/observableMatcher';

describe('connect', () => {
  let rxTest: TestScheduler;

  beforeEach(() => {
    rxTest = new TestScheduler(observableMatcher);
  });

  it('should connect a source through a selector function', () => {
    rxTest.run(({ cold, time, expectObservable }) => {
      const source = cold('---a----b-----c---|');
      const d = time('        ---|');
      const expected = '   ---a--a-b--b--c--c|';

      const result = source.pipe(connect((shared) => merge(shared.pipe(delay(d)), shared)));

      expectObservable(result).toBe(expected);
    });
  });

  it('should connect a source through a selector function and use the provided connector', () => {
    rxTest.run(({ cold, time, expectObservable }) => {
      const source = cold('--------a---------b---------c-----|');
      const d = time('             ---|');
      const expected = '   S--S----a--a------b--b------c--c--|';

      const result = source.pipe(
        connect(
          (shared) => {
            return merge(shared.pipe(delay(d)), shared);
          },
          {
            connector: () => new BehaviorSubject('S'),
          }
        )
      );

      expectObservable(result).toBe(expected);
    });
  });
});
