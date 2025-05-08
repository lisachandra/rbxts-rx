import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { merge } from '@rbxts/rx/out/operators';
import { queueScheduler, of } from '@rbxts/rx';
import { Error } from '@rbxts/luau-polyfill';

describe('merge (legacy)', () => {
  it('should merge an immediately-scheduled source with an immediately-scheduled second', (_, done) => {
    const a = of(1, 2, 3, queueScheduler);
    const b = of(4, 5, 6, 7, 8, queueScheduler);
    const r = [1, 2, 4, 3, 5, 6, 7, 8];

    a.pipe(merge(b, queueScheduler)).subscribe({
      next: (val) => {
        expect(val).toEqual(r.shift());
      },
      error: (x) => {
        done(new Error('should not be called'));
      },
      complete: () => {
        done();
      },
    });
  });
});
