import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { SafeSubscriber } from '@rbxts/rx/out/internal/Subscriber';
import { Subscriber, Observable, config, of, Observer } from '@rbxts/rx';
import { asInteropSubscriber } from './helpers/interop-helper';
import { getRegisteredFinalizers } from './helpers/subscription';
import { Error } from '@rbxts/luau-polyfill';

/** @test {Subscriber} */
describe('SafeSubscriber', () => {
  it('should ignore next messages after unsubscription', () => {
    let times = 0;

    const sub = new SafeSubscriber<void>({
      next() {
        times += 1;
      },
    });

    sub.next();
    sub.next();
    sub.unsubscribe();
    sub.next();

    expect(times).toEqual(2);
  });

  it('should ignore error messages after unsubscription', () => {
    let times = 0;
    let errorCalled = false;

    const sub = new SafeSubscriber<void>({
      next() {
        times += 1;
      },
      error() {
        errorCalled = true;
      },
    });

    sub.next();
    sub.next();
    sub.unsubscribe();
    sub.next();
    sub.error();

    expect(times).toEqual(2);
    expect(errorCalled).toBe(false);
  });

  it('should ignore complete messages after unsubscription', () => {
    let times = 0;
    let completeCalled = false;

    const sub = new SafeSubscriber<void>({
      next() {
        times += 1;
      },
      complete() {
        completeCalled = true;
      },
    });

    sub.next();
    sub.next();
    sub.unsubscribe();
    sub.next();
    sub.complete();

    expect(times).toEqual(2);
    expect(completeCalled).toBe(false);
  });

  it('should not be closed when other subscriber with same observer instance completes', () => {
    const observer = {
      next: function () {
        /*noop*/
      },
    };

    const sub1 = new SafeSubscriber(observer);
    const sub2 = new SafeSubscriber(observer);

    sub2.complete();

    expect(sub1.closed).toBe(false);
    expect(sub2.closed).toBe(true);
  });

  it('should call complete observer without any arguments', () => {
    let argument: Array<any> | undefined = undefined;

    const observer = {
      complete: (...args: Array<any>) => {
        argument = args;
      },
    };

    const sub1 = new SafeSubscriber(observer);
    sub1.complete();

    expect(argument).toHaveLength(0);
  });

  it('should chain interop unsubscriptions', () => {
    let observableUnsubscribed = false;
    let subscriberUnsubscribed = false;
    let subscriptionUnsubscribed = false;

    const subscriber = new SafeSubscriber<void>();
    subscriber.add(() => (subscriberUnsubscribed = true));

    const source = new Observable<void>(() => () => (observableUnsubscribed = true));
    const subscription = source.subscribe(asInteropSubscriber(subscriber));
    subscription.add(() => (subscriptionUnsubscribed = true));
    subscriber.unsubscribe();

    expect(observableUnsubscribed).toBe(true);
    expect(subscriberUnsubscribed).toBe(true);
    expect(subscriptionUnsubscribed).toBe(true);
  });

  it('should have idempotent unsubscription', () => {
    let count = 0;
    const subscriber = new SafeSubscriber();
    subscriber.add(() => ++count);
    expect(count).toEqual(0);

    subscriber.unsubscribe();
    expect(count).toEqual(1);

    subscriber.unsubscribe();
    expect(count).toEqual(1);
  });

  it('should close, unsubscribe, and unregister all finalizers after complete', () => {
    let isUnsubscribed = false;
    const subscriber = new SafeSubscriber();
    subscriber.add(() => (isUnsubscribed = true));
    subscriber.complete();
    expect(isUnsubscribed).toBe(true);
    expect(subscriber.closed).toBe(true);
    expect(getRegisteredFinalizers(subscriber).size()).toEqual(0);
  });

  it('should close, unsubscribe, and unregister all finalizers after error', () => {
    let isTornDown = false;
    const subscriber = new SafeSubscriber({
      error: () => {
        // Mischief managed!
        // Adding this handler here to prevent the call to error from
        // throwing, since it will have an error handler now.
      },
    });
    subscriber.add(() => (isTornDown = true));
    subscriber.error(new Error('test'));
    expect(isTornDown).toBe(true);
    expect(subscriber.closed).toBe(true);
    expect(getRegisteredFinalizers(subscriber).size()).toEqual(0);
  });
});

describe('Subscriber', () => {
  it('should finalize and unregister all finalizers after complete', () => {
    let isTornDown = false;
    const subscriber = new Subscriber();
    subscriber.add(() => {
      isTornDown = true;
    });
    subscriber.complete();
    expect(isTornDown).toBe(true);
    expect(getRegisteredFinalizers(subscriber).size()).toEqual(0);
  });

  it('should NOT break this context on next methods from unfortunate consumers', () => {
    // This is a contrived class to illustrate that we can pass another
    // object that is "observer shaped" and not have it lose its context
    // as it would have in v5 - v6.
    class CustomConsumer {
      valuesProcessed: string[] = [];

      // In here, we access instance state and alter it.
      next(value: string) {
        if (value === 'reset') {
          this.valuesProcessed = [];
        } else {
          this.valuesProcessed.push(value);
        }
      }
    }

    const consumer = new CustomConsumer();

    of('old', 'old', 'reset', 'new', 'new').subscribe(consumer);

    expect(consumer.valuesProcessed).never.toEqual(['new', 'new']);
  });

  describe('deprecated next context mode', () => {
    beforeEach(() => {
      config.useDeprecatedNextContext = true;
    });

    afterEach(() => {
      config.useDeprecatedNextContext = false;
    });

    it('should allow changing the context of `this` in a POJO subscriber', () => {
      const results: any[] = [];

      const source = new Observable<number>((subscriber) => {
        for (let i = 0; i < 10 && !subscriber.closed; i++) {
          subscriber.next(i);
        }
        subscriber.complete();

        return () => {
          results.push('finalizer');
        };
      });

      source.subscribe({
        next: function (this: any, value) {
          expect(type(this.unsubscribe)).toBe('function');
          results.push(value);
          if (value === 3) {
            this.unsubscribe();
          }
        },
        complete() {
          throw new Error('should not be called');
        },
      });

      expect(results).toEqual([0, 1, 2, 3, 'finalizer']);
    });

    it('should NOT break this context on next methods from unfortunate consumers', () => {
      // This is a contrived class to illustrate that we can pass another
      // object that is "observer shaped"
      class CustomConsumer {
        valuesProcessed: string[] = [];

        // In here, we access instance state and alter it.
        next(value: string) {
          if (value === 'reset') {
            this.valuesProcessed = [];
          } else {
            this.valuesProcessed.push(value);
          }
        }
      }

      const consumer = new CustomConsumer();

      of('old', 'old', 'reset', 'new', 'new').subscribe(consumer);

      expect(consumer.valuesProcessed).never.toEqual(['new', 'new']);
    });
  });

  warn(`No support for FinalizationRegistry`);
});
