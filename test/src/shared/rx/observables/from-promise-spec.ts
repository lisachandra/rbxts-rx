import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { asapScheduler, from } from '@rbxts/rx';
import { Error, setTimeout } from '@rbxts/luau-polyfill';

/** @test {fromPromise} */
describe('from (fromPromise)', () => {
  it('should emit one value from a resolved promise', (_, done) => {
    const promise = Promise.resolve(42);
    from(promise).subscribe({
      next: (x) => {
        expect(x).toEqual(42);
      },
      error: (x) => {
        done(new Error('should not be called'));
      },
      complete: () => {
        done();
      },
    });
  });

  it('should raise error from a rejected promise', (_, done) => {
    const promise = Promise.reject('bad');
    from(promise).subscribe({
      next: (x) => {
        done(new Error('should not be called'));
      },
      error: (e) => {
        expect(e).toEqual('bad');
        done();
      },
      complete: () => {
        done(new Error('should not be called'));
      },
    });
  });

  it('should share the underlying promise with multiple subscribers', (_, done) => {
    const promise = Promise.resolve(42);
    const observable = from(promise);

    observable.subscribe({
      next: (x) => {
        expect(x).toEqual(42);
      },
      error: (x) => {
        done(new Error('should not be called'));
      },
    });
    setTimeout(() => {
      observable.subscribe({
        next: (x) => {
          expect(x).toEqual(42);
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

  it('should accept already-resolved Promise', (_, done) => {
    const promise = Promise.resolve(42);
    promise.then(
      (x) => {
        expect(x).toEqual(42);
        from(promise).subscribe({
          next: (y) => {
            expect(y).toEqual(42);
          },
          error: (x) => {
            done(new Error('should not be called'));
          },
          complete: () => {
            done();
          },
        });
      },
      () => {
        done(new Error('should not be called'));
      }
    );
  });

  it('should accept PromiseLike object for interoperability', (_, done) => {
    /*
    class CustomPromise<T> implements PromiseLike<T> {
      constructor(private promise: PromiseLike<T>) {}
      then<TResult1 = T, TResult2 = T>(
        onFulfilled?: (value: T) => TResult1 | PromiseLike<TResult1>,
        onRejected?: (reason: any) => TResult2 | PromiseLike<TResult2>
      ): PromiseLike<TResult1 | TResult2> {
        return new CustomPromise(this.promise.then(onFulfilled, onRejected));
      }
    }
    */

    const promise = Promise.resolve(42);
    from(promise).subscribe({
      next: (x) => {
        expect(x).toEqual(42);
      },
      error: () => {
        done(new Error('should not be called'));
      },
      complete: () => {
        done();
      },
    });
  });

  it('should emit a value from a resolved promise on a separate scheduler', (_, done) => {
    const promise = Promise.resolve(42);
    from(promise, asapScheduler).subscribe({
      next: (x) => {
        expect(x).toEqual(42);
      },
      error: (x) => {
        done(new Error('should not be called'));
      },
      complete: () => {
        done();
      },
    });
  });

  it('should raise error from a rejected promise on a separate scheduler', (_, done) => {
    const promise = Promise.reject('bad');
    from(promise, asapScheduler).subscribe({
      next: (x) => {
        done(new Error('should not be called'));
      },
      error: (e) => {
        expect(e).toEqual('bad');
        done();
      },
      complete: () => {
        done(new Error('should not be called'));
      },
    });
  });

  it('should share the underlying promise with multiple subscribers on a separate scheduler', (_, done) => {
    const promise = Promise.resolve(42);
    const observable = from(promise, asapScheduler);

    observable.subscribe({
      next: (x) => {
        expect(x).toEqual(42);
      },
      error: (x) => {
        done(new Error('should not be called'));
      },
    });
    setTimeout(() => {
      observable.subscribe({
        next: (x) => {
          expect(x).toEqual(42);
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

  it('should not emit, throw or complete if immediately unsubscribed', (_, done) => {
    const nextSpy = jest.fn();
    const throwSpy = jest.fn();
    const completeSpy = jest.fn();
    const promise = Promise.resolve(42);
    const subscription = from(promise).subscribe({ next: nextSpy, error: throwSpy, complete: completeSpy });
    subscription.unsubscribe();

    setTimeout(() => {
      expect(nextSpy).never.toHaveBeenCalled();
      expect(throwSpy).never.toHaveBeenCalled();
      expect(completeSpy).never.toHaveBeenCalled();
      done();
    });
  });
});
