import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { using, range, Subscription } from '@rbxts/rx';
import { take } from '@rbxts/rx/out/operators';
import { Error } from '@rbxts/luau-polyfill';

describe('using', () => {
  it('should dispose of the resource when the subscription is disposed', (_, done) => {
    let disposed = false;
    const source = using(
      () => new Subscription(() => (disposed = true)),
      (resource) => range(0, 3)
    ).pipe(take(2));

    source.subscribe();

    if (disposed) {
      done();
    } else {
      done(new Error('disposed should be true but was false'));
    }
  });

  it('should accept factory returns promise resolves', (_, done) => {
    const expected = 42;

    let disposed = false;
    const e1 = using(
      () => new Subscription(() => (disposed = true)),
      (resource) =>
        new Promise((resolve) => {
          resolve(expected);
        })
    );

    e1.subscribe({
      next: (x) => {
        expect(x).toEqual(expected);
      },
      error: (x) => {
        done(new Error('should not be called'));
      },
      complete: () => {
        done();
      },
    });
  });

  it('should accept factory returns promise rejects', (_, done) => {
    const expected = 42;

    let disposed = false;
    const e1 = using(
      () => new Subscription(() => (disposed = true)),
      (resource) =>
        new Promise((resolve, reject) => {
          reject(expected);
        })
    );

    e1.subscribe({
      next: (x) => {
        done(new Error('should not be called'));
      },
      error: (x) => {
        expect(x).toEqual(expected);
        done();
      },
      complete: () => {
        done(new Error('should not be called'));
      },
    });
  });

  it('should raise error when resource factory throws', (_, done) => {
    const expectedError = 'expected';
    const err = 'error';

    const source = using(
      () => {
        throw expectedError;
      },
      (resource) => {
        throw err;
      }
    );

    source.subscribe({
      next: (x) => {
        done(new Error('should not be called'));
      },
      error: (x) => {
        expect(x).toEqual(expectedError);
        done();
      },
      complete: () => {
        done(new Error('should not be called'));
      },
    });
  });

  it('should raise error when observable factory throws', (_, done) => {
    const err = 'error';
    let disposed = false;

    const source = using(
      () => new Subscription(() => (disposed = true)),
      (resource) => {
        throw err;
      }
    );

    source.subscribe({
      next: (x) => {
        done(new Error('should not be called'));
      },
      error: (x) => {
        expect(x).toEqual(err);
        done();
      },
      complete: () => {
        done(new Error('should not be called'));
      },
    });
  });
});
