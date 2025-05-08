import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { Subject, ObjectUnsubscribedError, Observable, AsyncSubject, Observer, of, config, throwError, concat } from '@rbxts/rx';
import { AnonymousSubject } from '@rbxts/rx/out/internal/Subject';
import { catchError, delay, map, mergeMap } from '@rbxts/rx/out/operators';
import { TestScheduler } from '@rbxts/rx/out/testing';
import { observableMatcher } from './helpers/observableMatcher';
import { Error } from '@rbxts/luau-polyfill';

/** @test {Subject} */
describe('Subject', () => {
  let rxTestScheduler: TestScheduler;

  beforeEach(() => {
    rxTestScheduler = new TestScheduler(observableMatcher);
  });

  it('should allow next with undefined or any when created with no type', (_, done) => {
    const subject = new Subject();
    subject.subscribe({
      next: (x) => {
        expect(type(x)).toBe('nil');
      },
      complete: done,
    });

    const data: any = undefined;
    subject.next(undefined);
    subject.next(data);
    subject.complete();
  });

  it('should allow empty next when created with void type', (_, done) => {
    const subject = new Subject<void>();
    subject.subscribe({
      next: (x) => {
        expect(type(x)).toBe('nil');
      },
      complete: done,
    });

    subject.next();
    subject.complete();
  });

  it('should pump values right on through itself', (_, done) => {
    const subject = new Subject<string>();
    const expected = ['foo', 'bar'];

    subject.subscribe({
      next: (x: string) => {
        expect(x).toEqual(expected.shift());
      },
      complete: done,
    });

    subject.next('foo');
    subject.next('bar');
    subject.complete();
  });

  it('should pump values to multiple subscribers', (_, done) => {
    const subject = new Subject<string>();
    const expected = ['foo', 'bar'];

    let i = 0;
    let j = 0;

    subject.subscribe(function (x) {
      expect(x).toEqual(expected[i++]);
    });

    subject.subscribe({
      next: function (x) {
        expect(x).toEqual(expected[j++]);
      },
      complete: done,
    });

    expect(subject.observers.size()).toEqual(2);
    subject.next('foo');
    subject.next('bar');
    subject.complete();
  });

  it('should handle subscribers that arrive and leave at different times, ' + 'subject does not complete', () => {
    const subject = new Subject<number>();
    const results1: (number | string)[] = [];
    const results2: (number | string)[] = [];
    const results3: (number | string)[] = [];

    subject.next(1);
    subject.next(2);
    subject.next(3);
    subject.next(4);

    const subscription1 = subject.subscribe({
      next: function (x) {
        results1.push(x);
      },
      error: function (e) {
        results1.push('E');
      },
      complete: () => {
        results1.push('C');
      },
    });

    subject.next(5);

    const subscription2 = subject.subscribe({
      next: function (x) {
        results2.push(x);
      },
      error: function (e) {
        results2.push('E');
      },
      complete: () => {
        results2.push('C');
      },
    });

    subject.next(6);
    subject.next(7);

    subscription1.unsubscribe();

    subject.next(8);

    subscription2.unsubscribe();

    subject.next(9);
    subject.next(10);

    const subscription3 = subject.subscribe({
      next: function (x) {
        results3.push(x);
      },
      error: function (e) {
        results3.push('E');
      },
      complete: () => {
        results3.push('C');
      },
    });

    subject.next(11);

    subscription3.unsubscribe();

    expect(results1).toEqual([5, 6, 7]);
    expect(results2).toEqual([6, 7, 8]);
    expect(results3).toEqual([11]);
  });

  it('should handle subscribers that arrive and leave at different times, ' + 'subject completes', () => {
    const subject = new Subject<number>();
    const results1: (number | string)[] = [];
    const results2: (number | string)[] = [];
    const results3: (number | string)[] = [];

    subject.next(1);
    subject.next(2);
    subject.next(3);
    subject.next(4);

    const subscription1 = subject.subscribe({
      next: function (x) {
        results1.push(x);
      },
      error: function (e) {
        results1.push('E');
      },
      complete: () => {
        results1.push('C');
      },
    });

    subject.next(5);

    const subscription2 = subject.subscribe({
      next: function (x) {
        results2.push(x);
      },
      error: function (e) {
        results2.push('E');
      },
      complete: () => {
        results2.push('C');
      },
    });

    subject.next(6);
    subject.next(7);

    subscription1.unsubscribe();

    subject.complete();

    subscription2.unsubscribe();

    const subscription3 = subject.subscribe({
      next: function (x) {
        results3.push(x);
      },
      error: function (e) {
        results3.push('E');
      },
      complete: () => {
        results3.push('C');
      },
    });

    subscription3.unsubscribe();

    expect(results1).toEqual([5, 6, 7]);
    expect(results2).toEqual([6, 7, 'C']);
    expect(results3).toEqual(['C']);
  });

  it('should handle subscribers that arrive and leave at different times, ' + 'subject terminates with an error', () => {
    const subject = new Subject<number>();
    const results1: (number | string)[] = [];
    const results2: (number | string)[] = [];
    const results3: (number | string)[] = [];

    subject.next(1);
    subject.next(2);
    subject.next(3);
    subject.next(4);

    const subscription1 = subject.subscribe({
      next: function (x) {
        results1.push(x);
      },
      error: function (e) {
        results1.push('E');
      },
      complete: () => {
        results1.push('C');
      },
    });

    subject.next(5);

    const subscription2 = subject.subscribe({
      next: function (x) {
        results2.push(x);
      },
      error: function (e) {
        results2.push('E');
      },
      complete: () => {
        results2.push('C');
      },
    });

    subject.next(6);
    subject.next(7);

    subscription1.unsubscribe();

    subject.error(new Error('err'));

    subscription2.unsubscribe();

    const subscription3 = subject.subscribe({
      next: function (x) {
        results3.push(x);
      },
      error: function (e) {
        results3.push('E');
      },
      complete: () => {
        results3.push('C');
      },
    });

    subscription3.unsubscribe();

    expect(results1).toEqual([5, 6, 7]);
    expect(results2).toEqual([6, 7, 'E']);
    expect(results3).toEqual(['E']);
  });

  it('should handle subscribers that arrive and leave at different times, ' + 'subject completes before nexting any value', () => {
    const subject = new Subject<number>();
    const results1: (number | string)[] = [];
    const results2: (number | string)[] = [];
    const results3: (number | string)[] = [];

    const subscription1 = subject.subscribe({
      next: function (x) {
        results1.push(x);
      },
      error: function (e) {
        results1.push('E');
      },
      complete: () => {
        results1.push('C');
      },
    });

    const subscription2 = subject.subscribe({
      next: function (x) {
        results2.push(x);
      },
      error: function (e) {
        results2.push('E');
      },
      complete: () => {
        results2.push('C');
      },
    });

    subscription1.unsubscribe();

    subject.complete();

    subscription2.unsubscribe();

    const subscription3 = subject.subscribe({
      next: function (x) {
        results3.push(x);
      },
      error: function (e) {
        results3.push('E');
      },
      complete: () => {
        results3.push('C');
      },
    });

    subscription3.unsubscribe();

    expect(results1).toEqual([]);
    expect(results2).toEqual(['C']);
    expect(results3).toEqual(['C']);
  });

  it('should disallow new subscriber once subject has been disposed', () => {
    const subject = new Subject<number>();
    const results1: (number | string)[] = [];
    const results2: (number | string)[] = [];
    const results3: (number | string)[] = [];

    const subscription1 = subject.subscribe({
      next: function (x) {
        results1.push(x);
      },
      error: function (e) {
        results1.push('E');
      },
      complete: () => {
        results1.push('C');
      },
    });

    subject.next(1);
    subject.next(2);

    const subscription2 = subject.subscribe({
      next: function (x) {
        results2.push(x);
      },
      error: function (e) {
        results2.push('E');
      },
      complete: () => {
        results2.push('C');
      },
    });

    subject.next(3);
    subject.next(4);
    subject.next(5);

    subscription1.unsubscribe();
    subscription2.unsubscribe();
    subject.unsubscribe();

    expect(() => {
      subject.subscribe({
        next: function (x) {
          results3.push(x);
        },
        error: function (err) {
          expect(false).toEqual('should not throw error: ' + tostring(err));
        },
      });
    }).toThrow(ObjectUnsubscribedError);

    expect(results1).toEqual([1, 2, 3, 4, 5]);
    expect(results2).toEqual([3, 4, 5]);
    expect(results3).toEqual([]);
  });

  it('should not allow values to be nexted after it is unsubscribed', (_, done) => {
    const subject = new Subject<string>();
    const expected = ['foo'];

    subject.subscribe(function (x) {
      expect(x).toEqual(expected.shift());
    });

    subject.next('foo');
    subject.unsubscribe();
    expect(() => subject.next('bar')).toThrow(ObjectUnsubscribedError);
    done();
  });

  it('should clean out unsubscribed subscribers', (_, done) => {
    const subject = new Subject();

    const sub1 = subject.subscribe(function (x) {
      //noop
    });

    const sub2 = subject.subscribe(function (x) {
      //noop
    });

    expect(subject.observers.size()).toEqual(2);
    sub1.unsubscribe();
    expect(subject.observers.size()).toEqual(1);
    sub2.unsubscribe();
    expect(subject.observers.size()).toEqual(0);
    done();
  });

  it('should expose observed status', () => {
    const subject = new Subject();

    expect(subject.getObserved()).toEqual(false);

    const sub1 = subject.subscribe(function (x) {
      //noop
    });

    expect(subject.getObserved()).toEqual(true);

    const sub2 = subject.subscribe(function (x) {
      //noop
    });

    expect(subject.getObserved()).toEqual(true);
    sub1.unsubscribe();
    expect(subject.getObserved()).toEqual(true);
    sub2.unsubscribe();
    expect(subject.getObserved()).toEqual(false);
    subject.unsubscribe();
    expect(subject.getObserved()).toEqual(false);
  });

  it('should have a static create function that works', () => {
    expect(type(Subject.create)).toBe('function');
    const source = of(1, 2, 3, 4, 5);
    const nexts: number[] = [];
    const output: number[] = [];

    let error: any;
    let complete = false;
    let outputComplete = false;

    const destination = {
      closed: false,
      next: function (x: number) {
        nexts.push(x);
      },
      error: function (err: any) {
        error = err;
        this.closed = true;
      },
      complete: function () {
        complete = true;
        this.closed = true;
      },
    };

    const sub: Subject<any> = Subject.create(destination, source);

    sub.subscribe({
      next: function (x: number) {
        output.push(x);
      },
      complete: () => {
        outputComplete = true;
      },
    });

    sub.next('a');
    sub.next('b');
    sub.next('c');
    sub.complete();

    expect(nexts).toEqual(['a', 'b', 'c']);
    expect(complete).toBe(true);
    expect(type(error)).toBe('nil');

    expect(output).toEqual([1, 2, 3, 4, 5]);
    expect(outputComplete).toBe(true);
  });

  it('should have a static create function that works also to raise errors', () => {
    expect(type(Subject.create)).toBe('function');
    const source = of(1, 2, 3, 4, 5);
    const nexts: number[] = [];
    const output: number[] = [];

    let error: any;
    let complete = false;
    let outputComplete = false;

    const destination = {
      closed: false,
      next: function (x: number) {
        nexts.push(x);
      },
      error: function (err: any) {
        error = err;
        this.closed = true;
      },
      complete: function () {
        complete = true;
        this.closed = true;
      },
    };

    const sub: Subject<any> = Subject.create(destination, source);

    sub.subscribe({
      next: function (x: number) {
        output.push(x);
      },
      complete: () => {
        outputComplete = true;
      },
    });

    sub.next('a');
    sub.next('b');
    sub.next('c');
    sub.error('boom');

    expect(nexts).toEqual(['a', 'b', 'c']);
    expect(complete).toBe(false);
    expect(error).toEqual('boom');

    expect(output).toEqual([1, 2, 3, 4, 5]);
    expect(outputComplete).toBe(true);
  });

  it('should be an Observer which can be given to Observable.subscribe', (_, done) => {
    const source = of(1, 2, 3, 4, 5);
    const subject = new Subject<number>();
    const expected = [1, 2, 3, 4, 5];

    subject.subscribe({
      next: function (x) {
        expect(x).toEqual(expected.shift());
      },
      error: (x) => {
        done(new Error('should not be called'));
      },
      complete: () => {
        done();
      },
    });

    source.subscribe(subject);
  });

  it('should be usable as an Observer of a finite delayed Observable', (_, done) => {
    const source = of(1, 2, 3).pipe(delay(50));
    const subject = new Subject<number>();

    const expected = [1, 2, 3];

    subject.subscribe({
      next: function (x) {
        expect(x).toEqual(expected.shift());
      },
      error: (x) => {
        done(new Error('should not be called'));
      },
      complete: () => {
        done();
      },
    });

    source.subscribe(subject);
  });

  it('should throw ObjectUnsubscribedError when emit after unsubscribed', () => {
    const subject = new Subject<string>();
    subject.unsubscribe();

    expect(() => {
      subject.next('a');
    }).toThrow(ObjectUnsubscribedError);

    expect(() => {
      subject.error('a');
    }).toThrow(ObjectUnsubscribedError);

    expect(() => {
      subject.complete();
    }).toThrow(ObjectUnsubscribedError);
  });

  it('should not next after completed', () => {
    const subject = new Subject<string>();
    const results: string[] = [];
    subject.subscribe({ next: (x) => results.push(x), complete: () => results.push('C') });
    subject.next('a');
    subject.complete();
    subject.next('b');
    expect(results).toEqual(['a', 'C']);
  });

  it('should not next after error', () => {
    const error = new Error('wut?');
    const subject = new Subject<string>();
    const results: string[] = [];
    subject.subscribe({ next: (x) => results.push(x), error: (err) => results.push(err) });
    subject.next('a');
    subject.error(error);
    subject.next('b');
    expect(results).toEqual(['a', error]);
  });

  describe('asObservable', () => {
    it('should hide subject', () => {
      const subject = new Subject();
      const observable = subject.asObservable();

      expect(subject).never.toEqual(observable);

      expect(observable instanceof Observable).toBe(true);
      expect(observable instanceof Subject).toBe(false);
    });

    it('should handle subject never emits', () => {
      rxTestScheduler.run(({ hot, expectObservable }) => {
        const observable = hot('-').asObservable();

        expectObservable(observable).toBe('-');
      });
    });

    it('should handle subject completes without emits', () => {
      rxTestScheduler.run(({ hot, expectObservable }) => {
        const observable = hot('--^--|').asObservable();
        const expected = '        ---|';

        expectObservable(observable).toBe(expected);
      });
    });

    it('should handle subject throws', () => {
      rxTestScheduler.run(({ hot, expectObservable }) => {
        const observable = hot('--^--#').asObservable();
        const expected = '        ---#';

        expectObservable(observable).toBe(expected);
      });
    });

    it('should handle subject emits', () => {
      rxTestScheduler.run(({ hot, expectObservable }) => {
        const observable = hot('--^--x--|').asObservable();
        const expected = '        ---x--|';

        expectObservable(observable).toBe(expected);
      });
    });

    it('should work with inherited subject', () => {
      const results: (number | string)[] = [];
      const subject = new AsyncSubject<number>();

      subject.next(42);
      subject.complete();

      const observable = subject.asObservable();

      observable.subscribe({ next: (x) => results.push(x), complete: () => results.push('done') });

      expect(results).toEqual([42, 'done']);
    });
  });

  describe('error thrown scenario', () => {
    afterEach(() => {
      config.onUnhandledError = undefined;
    });

    it('should not synchronously error when nexted into', (_, done) => {
      config.onUnhandledError = (err) => {
        expect(err.message).toEqual('Boom!');
        done();
      };

      const source = new Subject<number>();
      source.subscribe();
      source.subscribe(() => {
        throw new Error('Boom!');
      });
      source.subscribe();
      try {
        source.next(42);
      } catch (err) {
        // This should not happen!
        expect(true).toBe(false);
      }
      expect(true).toBe(true);
    });
  });
});

describe('AnonymousSubject', () => {
  it('should be exposed', () => {
    expect(type(AnonymousSubject)).toBe('function');
  });

  it('should not be eager', () => {
    let subscribed = false;

    const subject = Subject.create(
      undefined,
      new Observable((observer: Observer<any>) => {
        subscribed = true;
        const subscription = of('x').subscribe(observer);
        return () => {
          subscription.unsubscribe();
        };
      })
    );

    const observable = subject.asObservable();
    expect(subscribed).toBe(false);

    observable.subscribe();
    expect(subscribed).toBe(true);
  });
});

describe('useDeprecatedSynchronousErrorHandling', () => {
  beforeEach(() => {
    config.useDeprecatedSynchronousErrorHandling = true;
  });

  afterEach(() => {
    config.useDeprecatedSynchronousErrorHandling = false;
  });

  it('should throw an error when nexting with a flattened, erroring inner observable', () => {
    const subject = new Subject<string>();
    subject.pipe(mergeMap(() => throwError(() => new Error('bad')))).subscribe();

    expect(() => {
      subject.next('wee');
    }).toThrowError('bad');
  });

  it('should throw an error when nexting with a flattened, erroring inner observable with more than one operator', () => {
    const subject = new Subject<string>();
    subject
      .pipe(
        mergeMap(() => throwError(() => new Error('bad'))),
        map((x) => x)
      )
      .subscribe();

    expect(() => {
      subject.next('wee');
    }).toThrowError('bad');
  });

  it('should throw an error when notifying an error with catchError returning an erroring inner observable', () => {
    const subject = new Subject<string>();
    subject.pipe(catchError(() => throwError(() => new Error('bad')))).subscribe();

    expect(() => {
      subject.error('wee');
    }).toThrowError('bad');
  });

  it('should throw an error when nexting with an operator that errors synchronously', () => {
    const subject = new Subject<string>();
    subject
      .pipe(
        mergeMap(() => {
          throw new Error('lol');
        })
      )
      .subscribe();

    expect(() => {
      subject.next('wee');
    }).toThrowError('lol');
  });

  it('should throw an error when notifying an error with a catchError that errors synchronously', () => {
    const subject = new Subject<string>();
    subject
      .pipe(
        catchError(() => {
          throw new Error('lol');
        })
      )
      .subscribe();

    expect(() => {
      subject.error('wee');
    }).toThrowError('lol');
  });

  it('should throw an error when nexting with an erroring next handler', () => {
    const subject = new Subject<string>();
    subject.subscribe(() => {
      throw new Error('lol');
    });

    expect(() => {
      subject.next('wee');
    }).toThrowError('lol');
  });

  it('should throw an error when notifying with an erroring error handler', () => {
    const subject = new Subject<string>();
    subject.subscribe({
      error: () => {
        throw new Error('lol');
      },
    });

    expect(() => {
      subject.error('wee');
    }).toThrowError('lol');
  });

  it('should throw an error when notifying with an erroring complete handler', () => {
    const subject = new Subject<string>();
    subject.subscribe({
      complete: () => {
        throw new Error('lol');
      },
    });

    expect(() => {
      subject.complete();
    }).toThrowError('lol');
  });

  it('should throw an error when notifying an complete, and concatenated with another observable that synchronously errors', () => {
    const subject = new Subject<string>();
    concat(subject, throwError(new Error('lol'))).subscribe();

    expect(() => {
      subject.complete();
    }).toThrowError('lol');
  });

  it('should not throw on second error passed', () => {
    const subject = new Subject();

    subject.subscribe();

    expect(() => {
      subject.error(new Error('one'));
    }).toThrowError('one');

    expect(() => {
      subject.error(new Error('two'));
    }).never.toThrowError('two');
  });

  it('should not throw on second error passed, even after having been operated on', () => {
    const subject = new Subject();

    subject.pipe(mergeMap((x) => [x])).subscribe();

    expect(() => {
      subject.error(new Error('one'));
    }).toThrowError('one');

    expect(() => {
      subject.error('two');
    }).never.toThrow();
  });

  it('deep rethrowing 1', () => {
    const subject1 = new Subject();
    const subject2 = new Subject();

    subject2.subscribe();

    subject1.subscribe({
      next: () => subject2.error(new Error('hahaha')),
    });

    expect(() => {
      subject1.next('test');
    }).toThrowError('hahaha');
  });

  it('deep rethrowing 2', () => {
    const subject1 = new Subject();

    subject1.subscribe({
      next: () => {
        throwError(new Error('hahaha')).subscribe();
      },
    });

    expect(() => {
      subject1.next('test');
    }).toThrowError('hahaha');
  });
});
