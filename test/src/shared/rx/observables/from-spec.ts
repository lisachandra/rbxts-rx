import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { TestScheduler } from '@rbxts/rx/out/testing';
import { asyncScheduler, of, from, Observer, observable, Subject, noop, Subscription } from '@rbxts/rx';
import { first, concatMap, delay, take, tap } from '@rbxts/rx/out/operators';
import { observableMatcher } from '../helpers/observableMatcher';
import { Error, setTimeout } from '@rbxts/luau-polyfill';
import Symbol from '@rbxts/rx/out/internal/polyfill/symbol';
import { ReadableStream } from '../helpers/readableStream';
import { callable } from '../helpers/callable';

function getArguments<T>(...args: T[]) {
  return args;
}

/** @test {from} */
describe('from', () => {
  let rxTestScheduler: TestScheduler;

  beforeEach(() => {
    rxTestScheduler = new TestScheduler(observableMatcher);
  });

  it('should create an observable from an array', () => {
    rxTestScheduler.run(({ expectObservable, time }) => {
      const delayTime = time('--|');
      //                --|
      //                  --|
      const expected = 'x-y-(z|)';

      const e1 = from([10, 20, 30]).pipe(
        // for the purpose of making a nice diagram, spread out the synchronous emissions
        concatMap((x, i) => of(x).pipe(delay(i === 0 ? 0 : delayTime)))
      );

      expectObservable(e1).toBe(expected, { x: 10, y: 20, z: 30 });
    });
  });

  it('should throw for non observable object', () => {
    const r = () => {
      // tslint:disable-next-line:no-any needed for the test
      from({} as any).subscribe();
    };

    expect(r).toThrow();
  });

  it('should finalize an AsyncGenerator', (_, done) => {
    const results: defined[] = [];
    const sideEffects: defined[] = [];

    function* gen() {
      try {
        let i = 0;
        while (true) {
          sideEffects.push(i);
          yield i++;
        }
      } finally {
        results.push('finalized generator');
      }
    }

    const source = from(gen()).pipe(take(3));

    source.subscribe({
      next: (value) => results.push(value),
      complete: () => {
        results.push('done');
        setTimeout(() => {
          expect(sideEffects).toEqual([0, 1, 2]);
          expect(results).toEqual([0, 1, 2, 'done', 'finalized generator']);
          done();
        });
      },
    });
  });

  it('should finalize an AsyncGenerator on error', (_, done) => {
    const results: defined[] = [];
    const sideEffects: defined[] = [];

    function* gen() {
      try {
        let i = 0;
        while (true) {
          sideEffects.push(i);
          yield i++;
        }
      } finally {
        results.push('finalized generator');
      }
    }

    const source = from(gen()).pipe(
      tap({
        next: (value) => {
          if (value === 2) {
            throw new Error('weee');
          }
        },
      })
    );

    source.subscribe({
      next: (value) => results.push(value),
      error: () => {
        results.push('in error');
        setTimeout(() => {
          expect(sideEffects).toEqual([0, 1, 2]);
          expect(results).toEqual([0, 1, 'in error', 'finalized generator']);
          done();
        });
      },
    });
  });

  it('should finalize an AsyncGenerator on unsubscribe', (_, done) => {
    const results: defined[] = [];
    const sideEffects: defined[] = [];
    let subscription: Subscription;

    function* gen() {
      try {
        let i = 0;
        while (true) {
          sideEffects.push(i);
          yield i++;
          if (i === 2) {
            subscription.unsubscribe();
          }
        }
      } finally {
        results.push('finalized generator');
        expect(sideEffects).toEqual([0, 1, 2]);
        expect(results).toEqual([0, 1, 'finalized generator']);
        done();
      }
    }

    const source = from(gen());

    subscription = source.subscribe((value) => results.push(value));
  });

  it('should finalize a generator', () => {
    const results: defined[] = [];

    function* gen() {
      try {
        let i = 0;
        while (true) {
          yield i++;
        }
      } finally {
        results.push('finalized generator');
      }
    }

    const source = from(gen()).pipe(take(3));

    source.subscribe({
      next: (value) => results.push(value),
      complete: () => results.push('done'),
    });

    expect(results).toEqual([0, 1, 2, 'done', 'finalized generator']);
  });

  const fakervable = <T>(...values: T[]) => ({
    [observable]: () => ({
      subscribe: (observer: Observer<T>) => {
        for (const value of values) {
          observer.next(value);
        }
        observer.complete();
      },
    }),
  });

  const fakeArrayObservable = <T>(...values: T[]) => {
    const arr: any = ['bad array!'];
    arr[observable] = () => {
      return {
        subscribe: (observer: Observer<T>) => {
          for (const value of values) {
            observer.next(value);
          }
          observer.complete();
        },
      };
    };
    return arr;
  };

  const fakerator = <T>(...values: T[]) => ({
    [Symbol.iterator]: () => {
      const clone = [...values] as defined[];
      return {
        next: () => ({
          done: clone.size() <= 0,
          value: clone.shift(),
        }),
      };
    },
  });

  // tslint:disable-next-line:no-any it's silly to define all of these types.
  const sources: Array<{ name: string; createValue: () => any }> = [
    { name: 'observable', createValue: () => of('x') },
    { name: 'observable-like', createValue: () => fakervable('x') },
    { name: 'observable-like-array', createValue: () => fakeArrayObservable('x') },
    { name: 'array', createValue: () => ['x'] },
    { name: 'promise', createValue: () => Promise.resolve('x') },
    { name: 'iterator', createValue: () => fakerator('x') },
    { name: 'array-like', createValue: () => ({ [0]: 'x', length: 1 }) },
    // ReadableStreams are not lazy, so we have to have this createValue() thunk
    // so that each tests gets a new one.
    {
      name: 'readable-stream-like',
      createValue: () =>
        new ReadableStream({
          pull(controller) {
            controller.enqueue('x');
            controller.close();
          },
        }),
    },
    { name: 'string', createValue: () => 'x' },
    { name: 'arguments', createValue: () => getArguments('x') },
  ];

  if (Symbol && Symbol.asyncIterator) {
    const fakeAsyncIterator = (...values: defined[]) => {
      return {
        [Symbol.asyncIterator]() {
          let i = 0;
          return {
            next: () => {
              const index = i++;
              if (index < values.size()) {
                return Promise.resolve({ done: false, value: values[index] });
              } else {
                return Promise.resolve({ done: true });
              }
            },
            [Symbol.asyncIterator]() {
              return this;
            },
          };
        },
      };
    };

    sources.push({
      name: 'async-iterator',
      createValue: () => fakeAsyncIterator('x'),
    });
  }

  for (const source of sources) {
    it(`should accept ${source.name}`, (_, done) => {
      let nextInvoked = false;
      from(source.createValue()).subscribe({
        next: (x) => {
          nextInvoked = true;
          expect(x).toEqual('x');
        },
        error: (x) => {
          done(new Error('should not be called'));
        },
        complete: () => {
          expect(nextInvoked).toEqual(true);
          done();
        },
      });
    });
    it(`should accept ${source.name} and scheduler`, (_, done) => {
      let nextInvoked = false;
      from(source.createValue(), asyncScheduler).subscribe({
        next: (x) => {
          nextInvoked = true;
          expect(x).toEqual('x');
        },
        error: (x) => {
          done(new Error('should not be called'));
        },
        complete: () => {
          expect(nextInvoked).toEqual(true);
          done();
        },
      });
      expect(nextInvoked).toEqual(false);
    });

    it(`should accept a function that implements [Symbol.observable]`, (_, done) => {
      const subject = new Subject<any>();
      const handler = callable((arg: any) => subject.next(arg));
      handler[observable] = () => subject;
      let nextInvoked = false;

      from(handler as any)
        .pipe(first())
        .subscribe({
          next: (x) => {
            nextInvoked = true;
            expect(x).toEqual('x');
          },
          error: (x) => {
            done(new Error('should not be called'));
          },
          complete: () => {
            expect(nextInvoked).toEqual(true);
            done();
          },
        });
      (handler as Callback)('x');
    });

    it('should accept a thennable that happens to have a subscribe method', (_, done) => {
      // There was an issue with our old `isPromise` check that caused this to fail
      const input = Promise.resolve('test');
      (input as any).subscribe = noop;
      from(input).subscribe({
        next: (x) => {
          expect(x).toEqual('test');
          done();
        },
      });
    });
  }

  it('should appropriately handle errors from an iterator', () => {
    const erroringIterator = (function* () {
      for (let i = 0; i < 5; i++) {
        if (i === 3) {
          throw new Error('bad');
        }
        yield i;
      }
    })();

    const results: defined[] = [];

    from(erroringIterator).subscribe({
      next: (x) => results.push(x),
      error: (err: Error) => results.push(err.message),
    });

    expect(results).toEqual([0, 1, 2, 'bad']);
  });

  it('should execute the finally block of a generator', () => {
    let finallyExecuted = false;
    const generator = (function* () {
      try {
        yield 'hi';
      } finally {
        finallyExecuted = true;
      }
    })();

    from(generator).subscribe();

    expect(finallyExecuted).toBe(true);
  });

  it('should support ReadableStream-like objects', (_, done) => {
    const input = [0, 1, 2];
    const output: number[] = [];

    const readableStream = new ReadableStream<number>({
      pull(controller) {
        if (input.size() > 0) {
          controller.enqueue(input.shift()!);

          if (input.size() === 0) {
            controller.close();
          }
        }
      },
    });

    from(readableStream).subscribe({
      next: (value) => {
        output.push(value);
        expect(readableStream.locked).toEqual(true);
      },
      complete: () => {
        expect(output).toEqual([0, 1, 2]);
        expect(readableStream.locked).toEqual(false);
        done();
      },
    });
  });

  it('should lock and release ReadableStream-like objects', (_, done) => {
    const input = [0, 1, 2];
    const output: number[] = [];

    const readableStream = new ReadableStream<number>({
      pull(controller) {
        if (input.size() > 0) {
          controller.enqueue(input.shift()!);

          if (input.size() === 0) {
            controller.close();
          }
        }
      },
    });

    from(readableStream).subscribe({
      next: (value) => {
        output.push(value);
        expect(readableStream.locked).toEqual(true);
      },
      complete: () => {
        expect(output).toEqual([0, 1, 2]);
        expect(readableStream.locked).toEqual(false);
        done();
      },
    });
  });
});
