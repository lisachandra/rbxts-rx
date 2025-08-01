import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { Error } from '@rbxts/luau-polyfill';
import { AsyncSubject, Observer } from '@rbxts/rx';

class TestObserver implements Observer<number> {
  results: (number | string)[] = [];

  constructor() {}

  next: (this: void, value: number) => void = function (this: TestObserver, value: number): void {
    this.results.push(value);
  } as never;

  error: (this: void, err: any) => void = function (this: TestObserver, err: any): void {
    this.results.push(err);
  } as never;

  complete: (this: void) => void = function (this: TestObserver): void {
    this.results.push('done');
  } as never;
}

/** @test {AsyncSubject} */
describe('AsyncSubject', () => {
  it('should emit the last value when complete', () => {
    const subject = new AsyncSubject<number>();
    const observer = new TestObserver();
    subject.subscribe(observer);

    subject.next(1);
    expect(observer.results).toEqual([]);
    subject.next(2);
    expect(observer.results).toEqual([]);
    subject.complete();
    expect(observer.results).toEqual([2, 'done']);
  });

  it('should emit the last value when subscribing after complete', () => {
    const subject = new AsyncSubject<number>();
    const observer = new TestObserver();

    subject.next(1);
    subject.next(2);
    subject.complete();

    subject.subscribe(observer);
    expect(observer.results).toEqual([2, 'done']);
  });

  it('should keep emitting the last value to subsequent subscriptions', () => {
    const subject = new AsyncSubject<number>();
    const observer = new TestObserver();
    const subscription = subject.subscribe(observer);

    subject.next(1);
    expect(observer.results).toEqual([]);
    subject.next(2);
    expect(observer.results).toEqual([]);
    subject.complete();
    expect(observer.results).toEqual([2, 'done']);

    subscription.unsubscribe();

    observer.results = [];
    subject.subscribe(observer);
    expect(observer.results).toEqual([2, 'done']);
  });

  it('should not emit values after complete', () => {
    const subject = new AsyncSubject<number>();
    const observer = new TestObserver();

    subject.subscribe(observer);

    subject.next(1);
    expect(observer.results).toEqual([]);
    subject.next(2);
    expect(observer.results).toEqual([]);
    subject.complete();
    subject.next(3);
    expect(observer.results).toEqual([2, 'done']);
  });

  it('should not allow change value after complete', () => {
    const subject = new AsyncSubject<number>();
    const observer = new TestObserver();
    const otherObserver = new TestObserver();
    subject.subscribe(observer);

    subject.next(1);
    expect(observer.results).toEqual([]);
    subject.complete();
    expect(observer.results).toEqual([1, 'done']);
    subject.next(2);
    subject.subscribe(otherObserver);
    expect(otherObserver.results).toEqual([1, 'done']);
  });

  it('should not emit values if unsubscribed before complete', () => {
    const subject = new AsyncSubject<number>();
    const observer = new TestObserver();
    const subscription = subject.subscribe(observer);

    subject.next(1);
    expect(observer.results).toEqual([]);
    subject.next(2);
    expect(observer.results).toEqual([]);

    subscription.unsubscribe();

    subject.next(3);
    expect(observer.results).toEqual([]);
    subject.complete();
    expect(observer.results).toEqual([]);
  });

  it('should just complete if no value has been nexted into it', () => {
    const subject = new AsyncSubject<number>();
    const observer = new TestObserver();
    subject.subscribe(observer);

    expect(observer.results).toEqual([]);
    subject.complete();
    expect(observer.results).toEqual(['done']);
  });

  it('should keep emitting complete to subsequent subscriptions', () => {
    const subject = new AsyncSubject<number>();
    const observer = new TestObserver();
    const subscription = subject.subscribe(observer);

    expect(observer.results).toEqual([]);
    subject.complete();
    expect(observer.results).toEqual(['done']);

    subscription.unsubscribe();
    observer.results = [];

    subject.error(new Error(''));

    subject.subscribe(observer);
    expect(observer.results).toEqual(['done']);
  });

  it('should only error if an error is passed into it', () => {
    const expected = new Error('bad');
    const subject = new AsyncSubject<number>();
    const observer = new TestObserver();
    subject.subscribe(observer);

    subject.next(1);
    expect(observer.results).toEqual([]);

    subject.error(expected);
    expect(observer.results).toEqual([expected]);
  });

  it('should keep emitting error to subsequent subscriptions', () => {
    const expected = new Error('bad');
    const subject = new AsyncSubject<number>();
    const observer = new TestObserver();
    const subscription = subject.subscribe(observer);

    subject.next(1);
    expect(observer.results).toEqual([]);

    subject.error(expected);
    expect(observer.results).toEqual([expected]);

    subscription.unsubscribe();

    observer.results = [];
    subject.subscribe(observer);
    expect(observer.results).toEqual([expected]);
  });

  it('should not allow send complete after error', () => {
    const expected = new Error('bad');
    const subject = new AsyncSubject<number>();
    const observer = new TestObserver();
    const subscription = subject.subscribe(observer);

    subject.next(1);
    expect(observer.results).toEqual([]);

    subject.error(expected);
    expect(observer.results).toEqual([expected]);

    subscription.unsubscribe();

    observer.results = [];

    subject.complete();
    subject.subscribe(observer);
    expect(observer.results).toEqual([expected]);
  });

  it('should not be reentrant via complete', () => {
    const subject = new AsyncSubject<number>();
    let calls = 0;
    subject.subscribe({
      next: (value) => {
        calls++;
        if (calls < 2) {
          // if this is more than 1, we're reentrant, and that's bad.
          subject.complete();
        }
      },
    });

    subject.next(1);
    subject.complete();

    expect(calls).toEqual(1);
  });

  it('should not be reentrant via next', () => {
    const subject = new AsyncSubject<number>();
    let calls = 0;
    subject.subscribe({
      next: (value) => {
        calls++;
        if (calls < 2) {
          // if this is more than 1, we're reentrant, and that's bad.
          subject.next(value + 1);
        }
      },
    });

    subject.next(1);
    subject.complete();

    expect(calls).toEqual(1);
  });

  it('should allow reentrant subscriptions', () => {
    const subject = new AsyncSubject<number>();
    const results: defined[] = [];

    subject.subscribe({
      next: (value) => {
        subject.subscribe({
          next: (value) => results.push('inner: ' + (value + value)),
          complete: () => results.push('inner: done'),
        });
        results.push('outer: ' + value);
      },
      complete: () => results.push('outer: done'),
    });

    subject.next(1);
    expect(results).toEqual([]);
    subject.complete();
    expect(results).toEqual(['inner: 2', 'inner: done', 'outer: 1', 'outer: done']);
  });
});
