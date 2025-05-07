import { isFunction } from './util/isFunction';
import { Observer, ObservableNotification } from './types';
import { isSubscription, Subscription } from './Subscription';
import { config } from './config';
import { reportUnhandledError } from './util/reportUnhandledError';
import { noop } from './util/noop';
import { nextNotification, errorNotification, COMPLETE_NOTIFICATION } from './NotificationFactories';
import { timeoutProvider } from './scheduler/timeoutProvider';
import { captureError } from './util/errorContext';
import { bind } from './polyfill/bind';
import { typeAssertIs } from './polyfill/type';

/**
 * Implements the {@link Observer} interface and extends the
 * {@link Subscription} class. While the {@link Observer} is the public API for
 * consuming the values of an {@link Observable}, all Observers get converted to
 * a Subscriber, in order to provide Subscription-like capabilities such as
 * `unsubscribe`. Subscriber is a common type in RxJS, and crucial for
 * implementing operators, but it is rarely used as a public API.
 */
export class Subscriber<T> extends Subscription implements Observer<T> {
  /**
   * A static factory for a Subscriber, given a (potentially partial) definition
   * of an Observer.
   * @param Next The `next` callback of an Observer.
   * @param err The `error` callback of an
   * Observer.
   * @param complete The `complete` callback of an
   * Observer.
   * @return A Subscriber wrapping the (partially defined)
   * Observer represented by the given arguments.
   * @deprecated Do not use. Will be removed in v8. There is no replacement for this
   * method, and there is no reason to be creating instances of `Subscriber` directly.
   * If you have a specific use case, please file an issue.
   */
  static create<T>(Next?: (x?: T) => void, err?: (e?: any) => void, complete?: () => void): Subscriber<T> {
    return new SafeSubscriber(Next, err, complete);
  }

  /** @deprecated Internal implementation detail, do not use directly. Will be made internal in v8. */
  protected isStopped: boolean = false;
  /** @deprecated Internal implementation detail, do not use directly. Will be made internal in v8. */
  protected destination: Subscriber<any> | Observer<any>; // this `any` is the escape hatch to erase extra type param (e.g. R)

  /**
   * @deprecated Internal implementation detail, do not use directly. Will be made internal in v8.
   * There is no reason to directly create an instance of Subscriber. This type is exported for typings reasons.
   */
  constructor(destination?: Subscriber<any> | Observer<any>) {
    super();
    if (destination) {
      this.destination = destination;
      // Automatically chain subscriptions together here.
      // if destination is a Subscription, then it is a Subscriber.
      if (isSubscription(destination)) {
        destination.add(this);
      }
    } else {
      this.destination = EMPTY_OBSERVER;
    }
  }

  /**
   * The {@link Observer} callback to receive notifications of type `next` from
   * the Observable, with a value. The Observable may call this method 0 or more
   * times.
   * @param value The `next` value.
   */
  next(this: void, value: T): void {
    typeAssertIs<Subscriber<T>>(this);
    if (this.isStopped) {
      handleStoppedNotification(nextNotification(value), this);
    } else {
      this._next(value);
    }
  }

  /**
   * The {@link Observer} callback to receive notifications of type `error` from
   * the Observable, with an attached `Error`. Notifies the Observer that
   * the Observable has experienced an error condition.
   * @param err The `error` exception.
   */
  error(this: void, err?: any): void {
    typeAssertIs<Subscriber<T>>(this);
    if (this.isStopped) {
      handleStoppedNotification(errorNotification(err), this);
    } else {
      this.isStopped = true;
      this._error(err);
    }
  }

  /**
   * The {@link Observer} callback to receive a valueless notification of type
   * `complete` from the Observable. Notifies the Observer that the Observable
   * has finished sending push-based notifications.
   */
  complete(this: void): void {
    typeAssertIs<Subscriber<T>>(this);
    if (this.isStopped) {
      handleStoppedNotification(COMPLETE_NOTIFICATION, this);
    } else {
      this.isStopped = true;
      this._complete();
    }
  }

  unsubscribe(): void {
    if (!this.closed) {
      this.isStopped = true;
      super.unsubscribe();
      this.destination = undefined!;
    }
  }

  protected _next(value: T): void {
    this.destination.next(value);
  }

  protected _error(err: any): void {
    try {
      this.destination.error(err);
    } finally {
      this.unsubscribe();
    }
  }

  protected _complete(): void {
    try {
      this.destination.complete();
    } finally {
      this.unsubscribe();
    }
  }
}

/**
 * This bind is captured here because we want to be able to have
 * compatibility with monoid libraries that tend to use a method named
 * `bind`. In particular, a library called Monio requires this.

const _bind = Function.prototype.bind;

function bind<Fn extends (...args: any[]) => any>(fn: Fn, thisArg: any): Fn {
  return _bind.call(fn, thisArg);
}
*/

/**
 * Internal optimization only, DO NOT EXPOSE.
 * @internal
 */
class ConsumerObserver<T> implements Observer<T> {
  constructor(private partialObserver: Partial<Observer<T>>) {
    this.next = bind(false, this['next' as never], this);
    this.error = bind(false, this['error' as never], this);
    this.complete = bind(false, this['complete' as never], this);
  }

  next(this: void, value: T): void {
    const { partialObserver } = this as never as ConsumerObserver<T>;
    if (partialObserver.next) {
      try {
        partialObserver.next(value);
      } catch (error) {
        handleUnhandledError(error);
      }
    }
  }

  error(this: void, err: any): void {
    const { partialObserver } = this as never as ConsumerObserver<T>;
    if (partialObserver.error) {
      try {
        partialObserver.error(err);
      } catch (error) {
        handleUnhandledError(error);
      }
    } else {
      handleUnhandledError(err);
    }
  }

  complete(this: void): void {
    const { partialObserver } = this as never as ConsumerObserver<T>;
    if (partialObserver.complete) {
      try {
        partialObserver.complete();
      } catch (error) {
        handleUnhandledError(error);
      }
    }
  }
}

export class SafeSubscriber<T> extends Subscriber<T> {
  constructor(observerOrNext?: Partial<Observer<T>> | ((value: T) => void), err?: (e?: any) => void, complete?: () => void) {
    super();

    let partialObserver: Partial<Observer<T>>;
    if (isFunction(observerOrNext) || !observerOrNext) {
      // The first argument is a function, not an observer. The next
      // two arguments *could* be observers, or they could be empty.
      partialObserver = {
        next: (observerOrNext ?? undefined) as ((value: T) => void) | undefined,
        error: err ?? undefined,
        complete: complete ?? undefined,
      };
    } else {
      // The first argument is a partial observer.
      let context: any;
      if (this && config.useDeprecatedNextContext) {
        // This is a deprecated path that made `this.unsubscribe()` available in
        // next handler functions passed to subscribe. This only exists behind a flag
        // now, as it is *very* slow.
        context = table.clone(observerOrNext);
        context.unsubscribe = () => this.unsubscribe();
        partialObserver = {
          next: observerOrNext.next && bind(false, observerOrNext.next, context),
          error: observerOrNext.error && bind(false, observerOrNext.error, context),
          complete: observerOrNext.complete && bind(false, observerOrNext.complete, context),
        };
      } else {
        // The "normal" path. Just use the partial observer directly.
        partialObserver = observerOrNext;
      }
    }

    // Wrap the partial observer to ensure it's a full observer, and
    // make sure proper error handling is accounted for.
    this.destination = new ConsumerObserver(partialObserver);
  }
}

function handleUnhandledError(err: any) {
  if (config.useDeprecatedSynchronousErrorHandling) {
    captureError(err);
  } else {
    // Ideal path, we report this as an unhandled error,
    // which is thrown on a new call stack.
    reportUnhandledError(err);
  }
}

/**
 * An error handler used when no error handler was supplied
 * to the SafeSubscriber -- meaning no error handler was supplied
 * do the `subscribe` call on our observable.
 * @param err The error to handle
 */
function defaultErrorHandler(err: any) {
  throw err;
}

/**
 * A handler for notifications that cannot be sent to a stopped subscriber.
 * @param notification The notification being sent.
 * @param subscriber The stopped subscriber.
 */
function handleStoppedNotification(notification: ObservableNotification<any>, subscriber: Subscriber<any>) {
  const { onStoppedNotification } = config;
  onStoppedNotification && timeoutProvider.setTimeout(() => onStoppedNotification(notification, subscriber));
}

/**
 * The observer used as a stub for subscriptions where the user did not
 * pass any arguments to `subscribe`. Comes with the default error handling
 * behavior.
 */
export const EMPTY_OBSERVER: Readonly<Observer<any>> & { closed: true } = {
  closed: true,
  next: noop,
  error: defaultErrorHandler,
  complete: noop,
};
