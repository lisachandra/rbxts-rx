import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { Observer, TeardownLogic } from '@rbxts/rx/out/internal/types';
import { Observable, config, Subscription, noop, Subscriber, Operator, NEVER, Subject, of, throwError, empty } from '@rbxts/rx';
import {
  map,
  multicast,
  refCount,
  filter,
  count,
  tap,
  combineLatest,
  concat,
  merge,
  race,
  zip,
  catchError,
  concatMap,
  switchMap,
  publish,
  publishLast,
  publishBehavior,
  share,
  finalize,
} from '@rbxts/rx/out/operators';
import { TestScheduler } from '@rbxts/rx/out/testing';
import { observableMatcher } from './helpers/observableMatcher';
import { Error, setInterval, clearInterval, setTimeout } from '@rbxts/luau-polyfill';
import { typeAssertIs } from './helpers/type';
import RegExp from '@rbxts/regexp';

function expectFullObserver(val: unknown) {
  expect(type(val)).toBe('table');
  typeAssertIs<{ [K: string]: unknown }>(val);
  expect(type(val.next)).toBe('function');
  expect(type(val.error)).toBe('function');
  expect(type(val.complete)).toBe('function');
  expect(type(val.closed)).toBe('boolean');
}

/** @test {Observable} */
describe('Observable', () => {
  let rxTestScheduler: TestScheduler;

  beforeEach(() => {
    rxTestScheduler = new TestScheduler(observableMatcher);
  });

  it('should be constructed with a subscriber function', (_, done) => {
    const source = new Observable<number>(function (observer) {
      expectFullObserver(observer);
      observer.next(1);
      observer.complete();
    });

    source.subscribe({
      next: (x) => {
        expect(x).toEqual(1);
      },
      complete: done,
    });
  });

  it('should send errors thrown in the constructor down the error path', (_, done) => {
    new Observable<number>(() => {
      throw new Error('this should be handled');
    }).subscribe({
      error: (err: Error) => {
        expect(err.message).toEqual('this should be handled');
        done();
      },
    });
  });

  it('should allow empty ctor, which is effectively a never-observable', () => {
    rxTestScheduler.run(({ expectObservable }) => {
      const result = new Observable<any>();
      expectObservable(result).toBe('-');
    });
  });

  describe('forEach', () => {
    it('should iterate and return a Promise', (_, done) => {
      const expected = [1, 2, 3];
      const result = of(1, 2, 3)
        .forEach((x) => {
          expect(x).toEqual(expected.shift());
        }, Promise)
        .then(() => {
          done();
        });

      expect(type(result['andThen' as never])).toBe('function');
    });

    it('should reject promise when in error', (_, done) => {
      throwError(() => 'bad')
        .forEach(() => {
          done(new Error('should not be called'));
        }, Promise)
        .then(
          () => {
            done(new Error('should not complete'));
          },
          (err) => {
            expect(err).toEqual('bad');
            done();
          }
        );
    });

    it('should allow Promise to be globally configured', async () => {
      try {
        let wasCalled = false;

        config.Promise = {
          new: (callback: any) => {
            wasCalled = true;
            return new Promise<number>(callback);
          }
        } as any;

        await of(42).forEach((x) => {
          expect(x).toEqual(42);
        });

        expect(wasCalled).toBe(true);
      } finally {
        config.Promise = undefined;
      }
    });

    it('should reject promise if nextHandler throws', (_, done) => {
      const results: number[] = [];

      of(1, 2, 3)
        .forEach((x) => {
          if (x === 3) {
            throw new Error('NO THREES!');
          }
          results.push(x);
        }, Promise)
        .then(
          () => {
            done(new Error('should not be called'));
          },
          (err: Error) => {
            expect(err.message).toEqual('NO THREES!');
            expect(results).toEqual([1, 2]);
          }
        )
        .then(() => {
          done();
        });
    });

    it('should handle a synchronous throw from the next handler', () => {
      const expected = new Error('I told, you Bobby Boucher, threes are the debil!');
      const syncObservable = new Observable<number>( function (observer) {
        observer.next(1);
        observer.next(2);
        observer.next(3);
        observer.next(4);
      });

      const results: Array<number | Error> = [];

      return syncObservable
        .forEach((x) => {
          results.push(x);
          if (x === 3) {
            throw expected;
          }
        })
        .then(
          () => {
            throw new Error('should not be called');
          },
          (err) => {
            results.push(err);
            // The error should unsubscribe from the source, meaning we
            // should not see the number 4.
            expect(results).toEqual([1, 2, 3, expected]);
          }
        );
    });

    it('should handle an asynchronous throw from the next handler and tear down', () => {
      const expected = new Error('I told, you Bobby Boucher, twos are the debil!');
      const asyncObservable = new Observable<number>( function (observer) {
        let i = 1;
        const id = setInterval(() => observer.next(i++), 1);

        return () => {
          clearInterval(id);
        };
      });

      const results: Array<number | Error> = [];

      return asyncObservable
        .forEach((x) => {
          results.push(x);
          if (x === 2) {
            throw expected;
          }
        })
        .then(
          () => {
            throw new Error('should not be called');
          },
          (err) => {
            results.push(err);
            expect(results).toEqual([1, 2, expected]);
          }
        );
    });
  });

  describe('subscribe', () => {
    it('should work with handlers with hacked bind methods', () => {
      const source = of('Hi');
      const results: defined[] = [];
      const next0 = function (value: string) {
        results.push(value);
      };
      /*
      next0.bind = () => {

      };
      */

      const complete = function () {
        results.push('done');
      };
      /*
      complete.bind = () => {

      };
      */

      source.subscribe({ next: next0, complete });
      expect(results).toEqual(['Hi', 'done']);
    });

    it('should work with handlers with hacked bind methods, in the error case', () => {
      const source = throwError(() => 'an error');
      const results: defined[] = [];
      const err = function (value: string) {
        results.push(value);
      };

      source.subscribe({ error: err });
      expect(results).toEqual(['an error']);
    });

    it('should be synchronous', () => {
      let subscribed = false;
      let nexted: string;
      let completed: boolean;
      const source = new Observable<string>( function (observer) {
        subscribed = true;
        observer.next('wee');
        expect(nexted).toEqual('wee');
        observer.complete();
        expect(completed).toBe(true);
      });

      expect(subscribed).toBe(false);

      let mutatedByNext = false;
      let mutatedByComplete = false;

      source.subscribe({
        next: (x) => {
          nexted = x;
          mutatedByNext = true;
        },
        complete: () => {
          completed = true;
          mutatedByComplete = true;
        },
      });

      expect(mutatedByNext).toBe(true);
      expect(mutatedByComplete).toBe(true);
    });

    it('should work when subscribe is called with no arguments', () => {
      const source = new Observable<string>(function (subscriber) {
        subscriber.next('foo');
        subscriber.complete();
      });

      source.subscribe();
    });

    it('should not be unsubscribed when other empty subscription completes', () => {
      let unsubscribeCalled = false;
      const source = new Observable<number>(() => {
        return () => {
          unsubscribeCalled = true;
        };
      });

      source.subscribe();

      expect(unsubscribeCalled).toBe(false);

      empty().subscribe();

      expect(unsubscribeCalled).toBe(false);
    });

    it('should not be unsubscribed when other subscription with same observer completes', () => {
      let unsubscribeCalled = false;
      const source = new Observable<number>(() => {
        return () => {
          unsubscribeCalled = true;
        };
      });

      const observer = {
        next: () => {
          /*noop*/
        },
      };

      source.subscribe(observer);

      expect(unsubscribeCalled).toBe(false);

      empty().subscribe(observer);

      expect(unsubscribeCalled).toBe(false);
    });

    it('should run unsubscription logic when an error is sent asynchronously and subscribe is called with no arguments', (_, done) => {
      jest.useFakeTimers();

      let unsubscribeCalled = false;
      const source = new Observable<number>( function (observer) {
        const id = setInterval(() => {
          observer.error(0);
        }, 1);
        return () => {
          clearInterval(id);
          unsubscribeCalled = true;
        };
      });

      source.subscribe({
        error: () => {
          /* noop: expected error */
        },
      });

      setTimeout(() => {
        let err;
        let errHappened = false;
        try {
          expect(unsubscribeCalled).toBe(true);
        } catch (e) {
          err = e;
          errHappened = true;
        } finally {
          if (!errHappened) {
            done();
          } else {
            done(err);
          }
        }
      }, 100);

      jest.advanceTimersByTime(110);
      jest.useRealTimers();
    });

    it('should return a Subscription that calls the unsubscribe function returned by the subscriber', () => {
      let unsubscribeCalled = false;

      const source = new Observable<number>(() => {
        return () => {
          unsubscribeCalled = true;
        };
      });

      const sub = source.subscribe(() => {
        //noop
      });
      expect(sub instanceof Subscription).toBe(true);
      expect(unsubscribeCalled).toBe(false);
      expect(type(sub['unsubscribe' as never])).toBe('function');

      sub.unsubscribe();
      expect(unsubscribeCalled).toBe(true);
    });

    it('should ignore next messages after unsubscription', (_, done) => {
      let times = 0;

      const subscription = new Observable<number>( function (observer) {
        let i = 0;
        const id = setInterval(() => {
          observer.next(i++);
        });

        return () => {
          clearInterval(id);
          expect(times).toEqual(2);
          done();
        };
      })
        .pipe(tap(() => (times += 1)))
        .subscribe(function () {
          if (times === 2) {
            subscription.unsubscribe();
          }
        });
    });

    it('should ignore error messages after unsubscription', (_, done) => {
      let times = 0;
      let errorCalled = false;

      const subscription = new Observable<number>( function (observer) {
        let i = 0;
        const id = setInterval(() => {
          observer.next(i++);
          if (i === 3) {
            observer.error(new Error());
          }
        });

        return () => {
          clearInterval(id);
          expect(times).toEqual(2);
          expect(errorCalled).toBe(false);
          done();
        };
      })
        .pipe(tap(() => (times += 1)))
        .subscribe({
          next: () => {
            if (times === 2) {
              subscription.unsubscribe();
            }
          },
          error: () => {
            errorCalled = true;
          },
        });
    });

    it('should ignore complete messages after unsubscription', (_, done) => {
      let times = 0;
      let completeCalled = false;

      const subscription = new Observable<number>( function (observer) {
        let i = 0;
        const id = setInterval(() => {
          observer.next(i++);
          if (i === 3) {
            observer.complete();
          }
        });

        return () => {
          clearInterval(id);
          expect(times).toEqual(2);
          expect(completeCalled).toBe(false);
          done();
        };
      })
        .pipe(tap(() => (times += 1)))
        .subscribe({
          next: () => {
            if (times === 2) {
              subscription.unsubscribe();
            }
          },
          complete: () => {
            completeCalled = true;
          },
        });
    });

    describe('when called with an anonymous observer', () => {
      it(
        'should accept an anonymous observer with just a next function and call the next function in the context' +
          ' of the anonymous observer',
        (_, done) => {
          //intentionally not using lambda to avoid typescript's this context capture
          const o = {
            myValue: 'foo',
            next: (x: any) => {
              expect(o.myValue).toEqual('foo');
              expect(x).toEqual(1);
              done();
            },
          };

          of(1).subscribe(o);
        }
      );

      it(
        'should accept an anonymous observer with just an error function and call the error function in the context' +
          ' of the anonymous observer',
        (_, done) => {
          //intentionally not using lambda to avoid typescript's this context capture
          const o = {
            myValue: 'foo',
            error: (err: any) => {
              expect(o.myValue).toEqual('foo');
              expect(err).toEqual('bad');
              done();
            },
          };

          throwError(() => 'bad').subscribe(o);
        }
      );

      it(
        'should accept an anonymous observer with just a complete function and call the complete function in the' +
          ' context of the anonymous observer',
        (_, done) => {
          //intentionally not using lambda to avoid typescript's this context capture
          const o = {
            myValue: 'foo',
            complete: () => {
              expect(o.myValue).toEqual('foo');
              done();
            },
          };

          empty().subscribe(o);
        }
      );

      it('should accept an anonymous observer with no functions at all', () => {
        expect(() => {
          empty().subscribe(<any>{});
        }).never.toThrow();
      });

      it('should ignore next messages after unsubscription', (_, done) => {
        let times = 0;

        const subscription = new Observable<number>( function (observer) {
          let i = 0;
          const id = setInterval(() => {
            observer.next(i++);
          });

          return () => {
            clearInterval(id);
            expect(times).toEqual(2);
            done();
          };
        })
          .pipe(tap(() => (times += 1)))
          .subscribe({
            next: () => {
              if (times === 2) {
                subscription.unsubscribe();
              }
            },
          });
      });

      it('should ignore error messages after unsubscription', (_, done) => {
        let times = 0;
        let errorCalled = false;

        const subscription = new Observable<number>( function (observer) {
          let i = 0;
          const id = setInterval(() => {
            observer.next(i++);
            if (i === 3) {
              observer.error(new Error());
            }
          });
          return () => {
            clearInterval(id);
            expect(times).toEqual(2);
            expect(errorCalled).toBe(false);
            done();
          };
        })
          .pipe(tap(() => (times += 1)))
          .subscribe({
            next: () => {
              if (times === 2) {
                subscription.unsubscribe();
              }
            },
            error: () => {
              errorCalled = true;
            },
          });
      });

      it('should ignore complete messages after unsubscription', (_, done) => {
        let times = 0;
        let completeCalled = false;

        const subscription = new Observable<number>( function (observer) {
          let i = 0;
          const id = setInterval(() => {
            observer.next(i++);
            if (i === 3) {
              observer.complete();
            }
          });

          return () => {
            clearInterval(id);
            expect(times).toEqual(2);
            expect(completeCalled).toBe(false);
            done();
          };
        })
          .pipe(tap(() => (times += 1)))
          .subscribe({
            next: () => {
              if (times === 2) {
                subscription.unsubscribe();
              }
            },
            complete: () => {
              completeCalled = true;
            },
          });
      });
    });

    it('should finalize even with a synchronous thrown error', () => {
      let called = false;
      const badObservable = new Observable(function (subscriber) {
        subscriber.add(() => {
          called = true;
        });

        throw new Error('bad');
      });

      badObservable.subscribe({
        error: () => {
          /* do nothing */
        },
      });

      expect(called).toBe(true);
    });

    it('should handle empty string sync errors', () => {
      const fn = jest.fn(function () {
        throw '';
      })
      const badObservable = new Observable(fn);

      let caught = false;
      badObservable.subscribe({
        error: (err) => {
          caught = true;
          expect(fn).toHaveBeenCalled();
          // expect(err).toEqual('');
        },
      });
      expect(caught).toBe(true);
    });

    describe('if config.useDeprecatedSynchronousErrorHandling === true', () => {
      beforeEach(() => {
        config.useDeprecatedSynchronousErrorHandling = true;
      });

      it('should throw synchronously', () => {
        expect(() => throwError(() => new Error('thrown error')).subscribe()).toThrowError('thrown error');
      });

      it('should rethrow if next handler throws', () => {
        const observable = new Observable(function (observer) {
          observer.next(1);
        });

        const sink = Subscriber.create(() => {
          throw 'error!';
        });

        expect(() => {
          observable.subscribe(sink);
        }).toThrow('error!');
      });

      // From issue: https://github.com/ReactiveX/rxjs/issues/5979
      it('should still rethrow synchronous errors from next handlers on synchronous observables', () => {
        expect(() => {
          of('test')
            .pipe(
              // Any operators here
              map((x) => x + '!!!'),
              map((x) => x + x),
              map((x) => x + x),
              map((x) => x + x)
            )
            .subscribe({
              next: () => {
                throw new Error('hi there!');
              },
            });
        }).toThrow('hi there!');
      });

      it('should rethrow synchronous errors from flattened observables', () => {
        expect(() => {
          of(1)
            .pipe(concatMap(() => throwError(() => new Error('Ahoy! An error!'))))
            .subscribe(print);
        }).toThrow('Ahoy! An error!');

        expect(() => {
          of(1)
            .pipe(switchMap(() => throwError(() => new Error('Avast! Thar be a new error!'))))
            .subscribe(print);
        }).toThrow('Avast! Thar be a new error!');
      });

      it('should finalize even with a synchronous error', () => {
        let called = false;
        const badObservable = new Observable(function (subscriber) {
          subscriber.add(() => {
            called = true;
          });

          subscriber.error(new Error('bad'));
        });

        try {
          badObservable.subscribe();
        } catch (err) {
          // do nothing
        }
        expect(called).toBe(true);
      });

      it('should finalize even with a synchronous thrown error', () => {
        let called = false;
        const badObservable = new Observable(function (subscriber) {
          subscriber.add(() => {
            called = true;
          });

          throw new Error('bad');
        });

        try {
          badObservable.subscribe();
        } catch (err) {
          // do nothing
        }
        expect(called).toBe(true);
      });

      it('should handle empty string sync errors', () => {
        const errFn = jest.fn(() =>{ throw ''})
        const badObservable = new Observable(errFn);

        let caught = false;
        try {
          badObservable.subscribe();
        } catch (err) {
          caught = true;
          expect(errFn).toHaveBeenCalled();
        }
        expect(caught).toBe(true);
      });

      it('should execute finalizer even with a sync error', () => {
        let called = false;
        const badObservable = new Observable(function (subscriber) {
          subscriber.error(new Error('bad'));
        }).pipe(
          finalize(() => {
            called = true;
          })
        );

        try {
          badObservable.subscribe();
        } catch (err) {
          // do nothing
        }
        expect(called).toBe(true);
      });

      it('should execute finalize even with a sync thrown error', () => {
        let called = false;
        const badObservable = new Observable(function () {
          throw new Error('bad');
        }).pipe(
          finalize(() => {
            called = true;
          })
        );

        try {
          badObservable.subscribe();
        } catch (err) {
          // do nothing
        }
        expect(called).toBe(true);
      });

      it('should execute finalizer in order even with a sync error', () => {
        const results: defined[] = [];
        const badObservable = new Observable(function (subscriber) {
          subscriber.error(new Error('bad'));
        }).pipe(
          finalize(() => {
            results.push(1);
          }),
          finalize(() => {
            results.push(2);
          })
        );

        try {
          badObservable.subscribe();
        } catch (err) {
          // do nothing
        }
        expect(results).toEqual([1, 2]);
      });

      it('should execute finalizer in order even with a sync thrown error', () => {
        const results: defined[] = [];
        const badObservable = new Observable(function () {
          throw new Error('bad');
        }).pipe(
          finalize(() => {
            results.push(1);
          }),
          finalize(() => {
            results.push(2);
          })
        );

        try {
          badObservable.subscribe();
        } catch (err) {
          // do nothing
        }
        expect(results).toEqual([1, 2]);
      });

      // https://github.com/ReactiveX/rxjs/issues/6271
      it('should not have a run-time error if no errors are thrown and there are operators', () => {
        expect(() => {
          of(1, 2, 3)
            .pipe(
              map((x) => x + x),
              map((x) => math.log(x))
            )
            .subscribe();
        }).never.toThrow();
      });

      it('should call finalize if sync unsubscribed', () => {
        let called = false;
        const observable = new Observable(() => () => (called = true));
        const subscription = observable.subscribe();
        subscription.unsubscribe();

        expect(called).toBe(true);
      });

      it('should call registered finalizer if sync unsubscribed', () => {
        let called = false;
        const observable = new Observable(function (subscriber) {
          subscriber.add(() => (called = true))
        });
        const subscription = observable.subscribe();
        subscription.unsubscribe();

        expect(called).toBe(true);
      });

      afterEach(() => {
        config.useDeprecatedSynchronousErrorHandling = false;
      });
    });
  });

  describe('pipe', () => {
    it('should exist', () => {
      const source = of('test');
      expect(type(source['pipe' as never])).toBe('function');
    });

    it('should pipe multiple operations', (_, done) => {
      of('test')
        .pipe(
          map((x) => x + x),
          map((x) => x + '!!!')
        )
        .subscribe({
          next: (x) => {
            expect(x).toEqual('testtest!!!');
          },
          complete: done,
        });
    });

    it('should return the same observable if there are no arguments', () => {
      const source = of('test');
      const result = source.pipe();
      expect(result).toEqual(source);
    });
  });

  it('should not swallow internal errors', (_, done) => {
    const fn = jest.fn(function <T>(this: any, subscriber: Subscriber<T>) {
      subscriber.error('test');
      throw 'bad';
    })

    config.onStoppedNotification = (notification) => {
      expect(fn).toHaveBeenCalled();
      expect(notification.kind).toEqual('E');
      // expect(notification).toHaveProperty('error', 'bad');
      config.onStoppedNotification = undefined;
      done();
    };

    new Observable(fn).subscribe({
      error: (err) => {
        expect(err).toEqual('test');
      },
    });
  });

  // Discussion here: https://github.com/ReactiveX/rxjs/issues/5370
  it.skip('should handle sync errors within a test scheduler', () => {
    const observable = of(4).pipe(
      map((n) => {
        if (n === 4) {
          throw 'four!';
        }
        return n;
      }),
      catchError((err, source) => source)
    );

    rxTestScheduler.run((helpers) => {
      const { expectObservable } = helpers;
      expectObservable(observable).toBe('-');
    });
  });

  it('should emit an error for unhandled synchronous exceptions from something like a stack overflow', () => {
    const source = new Observable(function () {
      const boom = (): unknown => boom();
      boom();
    });

    let thrownError: unknown = undefined;
    source.subscribe({
      error: (err: unknown) => (thrownError = err),
    });

    /*
    expect(thrownError).toBeInstanceOf(RangeError);
    expect(thrownError.message).toEqual('Maximum call stack size exceeded');
    */
    expect(thrownError).toBeDefined();
  });
});

/** @test {Observable} */
describe('Observable.create', () => {
  it('should create an Observable', () => {
    const result: Observable<any> = Observable.create(() => {
      //noop
    });
    expect(result instanceof Observable).toBe(true);
  });

  it('should provide an observer to the function', () => {
    let called = false;
    const result: Observable<any> = Observable.create((observer: Observer<any>) => {
      called = true;
      expectFullObserver(observer);
      observer.complete();
    });

    expect(called).toBe(false);
    result.subscribe(() => {
      //noop
    });
    expect(called).toBe(true);
  });

  it('should send errors thrown in the passed function down the error path', (_, done) => {
    (
      Observable.create((() => {
        throw new Error('this should be handled');
      }) as unknown) as Observable<any>
    ).subscribe({
      error: (err: Error) => {
        expect(err.message).toEqual('this should be handled');
        done();
      },
    });
  });
});

/** @test {Observable} */
describe('Observable.lift', () => {
  let rxTestScheduler: TestScheduler;

  beforeEach(() => {
    rxTestScheduler = new TestScheduler(observableMatcher);
  });

  class MyCustomObservable<T> extends Observable<T> {
    static from<T>(source: Observable<any>) {
      const observable = new MyCustomObservable<T>();
      observable.source = <Observable<T>>source;
      return observable;
    }
    lift<R>(operator: Operator<T, R>): Observable<R> {
      const observable = new MyCustomObservable<R>();
      (<any>observable).source = this;
      (<any>observable).operator = operator;
      return observable;
    }
  }

  it('should return Observable which calls FinalizationLogic of operator on unsubscription', (_, done) => {
    const myOperator: Operator<any, any> = (subscriber: Subscriber<any>, source: Observable<any>) => {
      const subscription = source.subscribe((x: any) => subscriber.next(x));
      return () => {
        subscription.unsubscribe();
        done();
      };
    };

    NEVER.lift(myOperator).subscribe().unsubscribe();
  });

  it('should be overridable in a custom Observable type that composes', (_, done) => {
    const result = new MyCustomObservable<number>( function (observer) {
      observer.next(1);
      observer.next(2);
      observer.next(3);
      observer.complete();
    }).pipe(
      map((x) => {
        return 10 * x;
      })
    );

    expect(result instanceof MyCustomObservable).toBe(true);

    const expected = [10, 20, 30];

    result.subscribe({
      next: (x) => {
        expect(x).toEqual(expected.shift());
      },
      error: () => {
        done(new Error('should not be called'));
      },
      complete: () => {
        done();
      },
    });
  });

  it('should compose through multicast and refCount', (_, done) => {
    const result = new MyCustomObservable<number>( function (observer) {
      observer.next(1);
      observer.next(2);
      observer.next(3);
      observer.complete();
    }).pipe(
      multicast(() => new Subject<number>()),
      refCount(),
      map((x) => 10 * x)
    );

    expect(result instanceof MyCustomObservable).toBe(true);

    const expected = [10, 20, 30];

    result.subscribe({
      next: (x) => {
        expect(x).toEqual(expected.shift());
      },
      error: () => {
        done(new Error('should not be called'));
      },
      complete: () => {
        done();
      },
    });
  });

  it('should compose through publish and refCount', (_, done) => {
    const result = new MyCustomObservable<number>( function (observer) {
      observer.next(1);
      observer.next(2);
      observer.next(3);
      observer.complete();
    }).pipe(
      publish(),
      refCount(),
      map((x) => 10 * x)
    );

    expect(result instanceof MyCustomObservable).toBe(true);

    const expected = [10, 20, 30];

    result.subscribe({
      next: (x) => {
        expect(x).toEqual(expected.shift());
      },
      error: () => {
        done(new Error('should not be called'));
      },
      complete: () => {
        done();
      },
    });
  });

  it('should compose through publishLast and refCount', (_, done) => {
    const result = new MyCustomObservable<number>( function (observer) {
      observer.next(1);
      observer.next(2);
      observer.next(3);
      observer.complete();
    }).pipe(
      publishLast(),
      refCount(),
      map((x) => 10 * x)
    );

    expect(result instanceof MyCustomObservable).toBe(true);

    const expected = [30];

    result.subscribe({
      next: (x) => {
        expect(x).toEqual(expected.shift());
      },
      error: () => {
        done(new Error('should not be called'));
      },
      complete: () => {
        done();
      },
    });
  });

  it('should compose through publishBehavior and refCount', (_, done) => {
    const result = new MyCustomObservable<number>( function (observer) {
      observer.next(1);
      observer.next(2);
      observer.next(3);
      observer.complete();
    }).pipe(
      publishBehavior(0),
      refCount(),
      map((x) => 10 * x)
    );

    expect(result instanceof MyCustomObservable).toBe(true);

    const expected = [0, 10, 20, 30];

    result.subscribe({
      next: (x) => {
        expect(x).toEqual(expected.shift());
      },
      error: () => {
        done(new Error('should not be called'));
      },
      complete: () => {
        done();
      },
    });
  });

  it('should composes Subjects in the simple case', () => {
    const subject = new Subject<number>();

    const result = subject.pipe(map((x) => 10 * x)) as any as Subject<number>; // Yes, this is correct. (but you're advised not to do this)

    expect(result instanceof Subject).toBe(true);

    const emitted: defined[] = [];
    result.subscribe((value) => emitted.push(value));

    result.next(10);
    result.next(20);
    result.next(30);

    expect(emitted).toEqual([100, 200, 300]);
  });

  /**
   * Seriously, never do this. It's probably bad that we've allowed this. Fortunately, it's not
   * a common practice, so maybe we can remove it?
   */
  it('should demonstrate the horrors of sharing and lifting the Subject through', () => {
    const subject = new Subject<number>();

    const shared = subject.pipe(share());

    const result1 = shared.pipe(map((x) => x * 10)) as any as Subject<number>; // Yes, this is correct.

    const result2 = shared.pipe(map((x) => x - 10)) as any as Subject<number>; // Yes, this is correct.
    expect(result1 instanceof Subject).toBe(true);

    const emitted1: defined[] = [];
    result1.subscribe((value) => emitted1.push(value));

    const emitted2: defined[] = [];
    result2.subscribe((value) => emitted2.push(value));

    // THIS IS HORRIBLE DON'T DO THIS.
    result1.next(10);
    result2.next(20); // Yuck
    result1.next(30);

    expect(emitted1).toEqual([100, 200, 300]);
    expect(emitted2).toEqual([0, 10, 20]);
  });

  /**
   * This section outlines one of the reasons that we need to get rid of operators that return
   * Connectable observable. Likewise it also reveals a slight design flaw in `lift`. It
   * probably should have never tried to compose through the Subject's observer methods.
   * If you're a user and you're reading this... NEVER try to use this feature, it's likely
   * to go away at some point.
   *
   * The problem is that you can have the Subject parts, or you can have the ConnectableObservable parts,
   * but you can't have both.
   *
   * NOTE: We can remove this in version 8 or 9, because we're getting rid of operators that
   * return `ConnectableObservable`. :tada:
   */
  describe.skip('The lift through Connectable gaff', () => {
    it('should compose through multicast and refCount, even if it is a Subject', () => {
      const subject = new Subject<number>();

      const result = subject.pipe(
        multicast(() => new Subject<number>()),
        refCount(),
        map((x) => 10 * x)
      ) as any as Subject<number>; // Yes, this is correct.

      expect(result instanceof Subject).toBe(true);

      const emitted: defined[] = [];
      result.subscribe((value) => emitted.push(value));

      result.next(10);
      result.next(20);
      result.next(30);

      expect(emitted).toEqual([100, 200, 300]);
    });

    it('should compose through publish and refCount, even if it is a Subject', () => {
      const subject = new Subject<number>();

      const result = subject.pipe(
        publish(),
        refCount(),
        map((x) => 10 * x)
      ) as any as Subject<number>; // Yes, this is correct.

      expect(result instanceof Subject).toBe(true);

      const emitted: defined[] = [];
      result.subscribe((value) => emitted.push(value));

      result.next(10);
      result.next(20);
      result.next(30);

      expect(emitted).toEqual([100, 200, 300]);
    });

    it('should compose through publishLast and refCount, even if it is a Subject', () => {
      const subject = new Subject<number>();

      const result = subject.pipe(
        publishLast(),
        refCount(),
        map((x) => 10 * x)
      ) as any as Subject<number>; // Yes, this is correct.

      expect(result instanceof Subject).toBe(true);

      const emitted: defined[] = [];
      result.subscribe((value) => emitted.push(value));

      result.next(10);
      result.next(20);
      result.next(30);

      expect(emitted).toEqual([100, 200, 300]);
    });

    it('should compose through publishBehavior and refCount, even if it is a Subject', () => {
      const subject = new Subject<number>();

      const result = subject.pipe(
        publishBehavior(0),
        refCount(),
        map((x) => 10 * x)
      ) as any as Subject<number>; // Yes, this is correct.

      expect(result instanceof Subject).toBe(true);

      const emitted: defined[] = [];
      result.subscribe((value) => emitted.push(value));

      result.next(10);
      result.next(20);
      result.next(30);

      expect(emitted).toEqual([0, 100, 200, 300]);
    });
  });

  it('should compose through multicast with selector function', (_, done) => {
    const result = new MyCustomObservable<number>( function (observer) {
      observer.next(1);
      observer.next(2);
      observer.next(3);
      observer.complete();
    }).pipe(
      multicast(
        () => new Subject<number>(),
        (shared) => shared.pipe(map((x) => 10 * x))
      )
    );

    expect(result instanceof MyCustomObservable).toBe(true);

    const expected = [10, 20, 30];

    result.subscribe({
      next: (x) => {
        expect(x).toEqual(expected.shift());
      },
      error: () => {
        done(new Error('should not be called'));
      },
      complete: () => {
        done();
      },
    });
  });

  it('should compose through combineLatest', () => {
    rxTestScheduler.run(({ cold, expectObservable }) => {
      const e1 = cold(' -a--b-----c-d-e-|');
      const e2 = cold(' --1--2-3-4---|   ');
      const expected = '--A-BC-D-EF-G-H-|';

      const result = MyCustomObservable.from(e1).pipe(combineLatest(e2, (a, b) => tostring(a) + tostring(b)));

      expect(result instanceof MyCustomObservable).toBe(true);

      expectObservable(result).toBe(expected, {
        A: 'a1',
        B: 'b1',
        C: 'b2',
        D: 'b3',
        E: 'b4',
        F: 'c4',
        G: 'd4',
        H: 'e4',
      });
    });
  });

  it('should compose through concat', () => {
    rxTestScheduler.run(({ cold, expectObservable }) => {
      const e1 = cold(' --a--b-|');
      const e2 = cold(' --x---y--|');
      const expected = '--a--b---x---y--|';

      const result = MyCustomObservable.from(e1).pipe(concat(e2, rxTestScheduler));

      expect(result instanceof MyCustomObservable).toBe(true);

      expectObservable(result).toBe(expected);
    });
  });
  it('should compose through merge', () => {
    rxTestScheduler.run(({ cold, expectObservable }) => {
      const e1 = cold(' -a--b-| ');
      const e2 = cold(' --x--y-|');
      const expected = '-ax-by-|';

      const result = MyCustomObservable.from(e1).pipe(merge(e2, rxTestScheduler));

      expect(result instanceof MyCustomObservable).toBe(true);

      expectObservable(result).toBe(expected);
    });
  });

  it('should compose through race', () => {
    rxTestScheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
      const e1 = cold(' ---a-----b-----c----|');
      const e1subs = '  ^-------------------!';
      const e2 = cold(' ------x-----y-----z----|');
      const e2subs = '  ^--!';
      const expected = '---a-----b-----c----|';

      const result = MyCustomObservable.from<string>(e1).pipe(race(e2));

      expect(result instanceof MyCustomObservable).toBe(true);

      expectObservable(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should compose through zip', () => {
    rxTestScheduler.run(({ cold, expectObservable }) => {
      const e1 = cold(' -a--b-----c-d-e-|');
      const e2 = cold(' --1--2-3-4---|   ');
      const expected = '--A--B----C-D|   ';

      const result = MyCustomObservable.from(e1).pipe(zip(e2, (a, b) => tostring(a) + tostring(b)));

      expect(result instanceof MyCustomObservable).toBe(true);

      expectObservable(result).toBe(expected, {
        A: 'a1',
        B: 'b2',
        C: 'c3',
        D: 'd4',
      });
    });
  });

  it('should allow injecting behaviors into all subscribers in an operator ' + 'chain when overridden', (_, done) => {
    // The custom Subscriber
    const log: Array<string> = [];

    class LogSubscriber<T> extends Subscriber<T> {
      next: (this: void, value?: T) => void = function (this: LogSubscriber<T>, value?: T) {
        log.push('next ' + value);
        if (!this.isStopped) {
          this._next(value!);
        }
      } as never;
    }

    // The custom Operator
    class LogOperator<T, R> {
      constructor(private childOperator: Operator<T, R>) {}

      call(subscriber: Subscriber<R>, source: Observable<any>): TeardownLogic {
        return this.childOperator(new LogSubscriber<R>(subscriber), source);
      }
    }

    // The custom Observable
    class LogObservable<T> extends Observable<T> {
      lift<R>(operator: Operator<T, R>): Observable<R> {
        const logOperator = new LogOperator(operator);
        const observable = new LogObservable<R>();
        observable.source = this;
        observable.operator = (subscriber, source) => logOperator.call(subscriber, source);
        return observable;
      }
    }

    // Use the LogObservable
    const result = new LogObservable<number>( function (observer) {
      observer.next(1);
      observer.next(2);
      observer.next(3);
      observer.complete();
    }).pipe(
      map((x) => 10 * x),
      filter((x) => x > 15),
      count()
    );

    expect(result instanceof LogObservable).toBe(true);

    const expected = [2];

    result.subscribe({
      next: (x) => {
        expect(x).toEqual(expected.shift());
      },
      error: () => {
        done(new Error('should not be called'));
      },
      complete: () => {
        expect(log).toEqual([
          'next 10', // map
          'next 20', // map
          'next 20', // filter
          'next 30', // map
          'next 30', // filter
          'next 2', // count
        ]);
        done();
      },
    });
  });
});
