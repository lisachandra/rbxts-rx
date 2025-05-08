import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals'; // TODO: import was changed due to the fact that at startup the test referred to rxjs from node_modules
import { setTimeout } from '@rbxts/luau-polyfill';
import { Immediate, TestTools } from '@rbxts/rx/out/internal/util/Immediate';

describe('Immediate', () => {
  it('should schedule on the next microtask', (_, done) => {
    const results: number[] = [];
    results.push(1);
    setTimeout(() => results.push(5));
    Immediate.setImmediate(() => results.push(3));
    results.push(2);
    Promise.resolve().then(() => results.push(4));

    setTimeout(() => {
      expect(results).toEqual([1, 2, 3, 4, 5]);
      done();
    });
  });

  it('should cancel the task with clearImmediate', (_, done) => {
    const results: number[] = [];
    results.push(1);
    setTimeout(() => results.push(5));
    const handle = Immediate.setImmediate(() => results.push(3));
    Immediate.clearImmediate(handle);
    results.push(2);
    Promise.resolve().then(() => results.push(4));

    setTimeout(() => {
      expect(results).toEqual([1, 2, 4, 5]);
      done();
    });
  });

  it('should clear the task after execution', (_, done) => {
    const results: number[] = [];
    Immediate.setImmediate(() => results.push(1));
    Immediate.setImmediate(() => results.push(2));

    setTimeout(() => {
      const number = TestTools.pending();
      expect(number).toEqual(0);
      done();
    });
  });
});
