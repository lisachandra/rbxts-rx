import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { config } from '@rbxts/rx/out/internal/config';

import { Observable } from '@rbxts/rx';
import { timeoutProvider } from '@rbxts/rx/out/internal/scheduler/timeoutProvider';

describe('config', () => {
  it('should have a Promise property that defaults to nothing', () => {
    expect(config).toHaveProperty('Promise');
    expect(config.Promise).toBeUndefined();
  });

  describe('onUnhandledError', () => {
    afterEach(() => {
      config.onUnhandledError = undefined;
    });

    it('should default to undefined', () => {
      expect(config.onUnhandledError).toBeUndefined();
    });

    it('should call asynchronously if an error is emitted and not handled by the consumer observer', (_, done) => {
      let called = false;
      const results: defined[] = [];

      config.onUnhandledError = (err) => {
        called = true;
        expect(err).toEqual('bad');
        done();
      };

      const source = new Observable<number>(function (subscriber) {
        subscriber.next(1);
        subscriber.error('bad');
      });

      source.subscribe({
        next: (value) => results.push(value),
      });
      expect(called).toBe(false);
      expect(results).toEqual([1]);
    });

    it('should call asynchronously if an error is emitted and not handled by the consumer next callback', (_, done) => {
      let called = false;
      const results: defined[] = [];

      config.onUnhandledError = (err) => {
        called = true;
        expect(err).toEqual('bad');
        done();
      };

      const source = new Observable<number>(function (subscriber) {
        subscriber.next(1);
        subscriber.error('bad');
      });

      source.subscribe((value) => results.push(value));
      expect(called).toBe(false);
      expect(results).toEqual([1]);
    });

    it('should call asynchronously if an error is emitted and not handled by the consumer in the empty case', (_, done) => {
      let called = false;
      config.onUnhandledError = (err) => {
        called = true;
        expect(err).toEqual('bad');
        done();
      };

      const source = new Observable(function (subscriber) {
        subscriber.error('bad');
      });

      source.subscribe();
      expect(called).toBe(false);
    });

    /**
     * This test is added so people know this behavior is _intentional_. It's part of the contract of observables
     * and, while I'm not sure I like it, it might start surfacing untold numbers of errors, and break
     * node applications if we suddenly changed this to start throwing errors on other jobs for instances
     * where users accidentally called `subscriber.error` twice. Likewise, would we report an error
     * for two calls of `complete`? This is really something a build-time tool like a linter should
     * capture. Not a run time error reporting event.
     */
    it('should not be called if two errors are sent to the subscriber', (_, done) => {
      let called = false;
      config.onUnhandledError = () => {
        called = true;
      };

      const source = new Observable(function (subscriber) {
        subscriber.error('handled');
        subscriber.error('swallowed');
      });

      let syncSentError: any;
      source.subscribe({
        error: (err) => {
          syncSentError = err;
        },
      });

      expect(syncSentError).toEqual('handled');
      // When called, onUnhandledError is called on a timeout, so delay the
      // the assertion of the expectation until after the point at which
      // onUnhandledError would have been called.
      timeoutProvider.setTimeout(() => {
        expect(called).toBe(false);
        done();
      });
    });
  });

  describe('onStoppedNotification', () => {
    afterEach(() => {
      config.onStoppedNotification = undefined;
    });

    it('should default to undefined', () => {
      expect(config.onStoppedNotification).toBeUndefined();
    });

    it('should be called asynchronously if a subscription setup errors after the subscription is closed by an error', (_, done) => {
      let called = false;
      config.onStoppedNotification = (notification) => {
        called = true;
        expect(notification.kind).toEqual('E');
        expect(notification).toHaveProperty('error', 'bad');
        done();
      };

      const source = new Observable(function (subscriber) {
        subscriber.error('handled');
        throw 'bad';
      });

      let syncSentError: any;
      source.subscribe({
        error: (err) => {
          syncSentError = err;
        },
      });

      expect(syncSentError).toEqual('handled');
      expect(called).toBe(false);
    });

    it('should be called asynchronously if a subscription setup errors after the subscription is closed by a completion', (_, done) => {
      let called = false;
      let completed = false;
      config.onStoppedNotification = (notification) => {
        called = true;
        expect(notification.kind).toEqual('E');
        expect(notification).toHaveProperty('error', 'bad');
        done();
      };

      const source = new Observable(function (subscriber) {
        subscriber.complete();
        throw 'bad';
      });

      source.subscribe({
        error: () => {
          throw 'should not be called';
        },
        complete: () => {
          completed = true;
        },
      });

      expect(completed).toBe(true);
      expect(called).toBe(false);
    });

    it('should be called if a next is sent to the stopped subscriber', (_, done) => {
      let called = false;
      config.onStoppedNotification = (notification) => {
        called = true;
        expect(notification.kind).toEqual('N');
        expect(notification).toHaveProperty('value', 2);
        done();
      };

      const source = new Observable(function (subscriber) {
        subscriber.next(1);
        subscriber.complete();
        subscriber.next(2);
      });

      let syncSentValue: any;
      source.subscribe({
        next: (value) => {
          syncSentValue = value;
        },
      });

      expect(syncSentValue).toEqual(1);
      expect(called).toBe(false);
    });

    it('should be called if two errors are sent to the subscriber', (_, done) => {
      let called = false;
      config.onStoppedNotification = (notification) => {
        called = true;
        expect(notification.kind).toEqual('E');
        expect(notification).toHaveProperty('error', 'swallowed');
        done();
      };

      const source = new Observable(function (subscriber) {
        subscriber.error('handled');
        subscriber.error('swallowed');
      });

      let syncSentError: any;
      source.subscribe({
        error: (err) => {
          syncSentError = err;
        },
      });

      expect(syncSentError).toEqual('handled');
      expect(called).toBe(false);
    });

    it('should be called if two completes are sent to the subscriber', (_, done) => {
      let called = false;
      config.onStoppedNotification = (notification) => {
        called = true;
        expect(notification.kind).toEqual('C');
        done();
      };

      const source = new Observable(function (subscriber) {
        subscriber.complete();
        subscriber.complete();
      });

      source.subscribe();

      expect(called).toBe(false);
    });
  });
});
