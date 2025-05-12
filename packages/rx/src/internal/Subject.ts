import { Operator } from './Operator';
import { Observable } from './Observable';
import { Subscriber } from './Subscriber';
import { Subscription, EMPTY_SUBSCRIPTION } from './Subscription';
import { Observer, SubjectLike, SubscriptionLike, TeardownLogic } from './types';
import { ObjectUnsubscribedError } from './util/ObjectUnsubscribedError';
import { arrRemove } from './util/arrRemove';
import { errorContext } from './util/errorContext';

/**
 * A Subject is a special type of Observable that allows values to be
 * multicasted to many Observers. Subjects are like EventEmitters.
 *
 * Every Subject is an Observable and an Observer. You can subscribe to a
 * Subject, and you can call next to feed values as well as error and complete.
 */
export class Subject<T> extends Observable<T> implements SubscriptionLike {
  closed = false;

  private currentObservers: Observer<T>[] | undefined = undefined;

  /** @deprecated Internal implementation detail, do not use directly. Will be made internal in v8. */
  observers: Observer<T>[] = [];
  /** @deprecated Internal implementation detail, do not use directly. Will be made internal in v8. */
  isStopped = false;
  /** @deprecated Internal implementation detail, do not use directly. Will be made internal in v8. */
  hasError = false;
  /** @deprecated Internal implementation detail, do not use directly. Will be made internal in v8. */
  thrownError: any = undefined;

  /**
   * Creates a "subject" by basically gluing an observer to an observable.
   *
   * @deprecated Recommended you do not use. Will be removed at some point in the future. Plans for replacement still under discussion.
   */
  static create: (...args: any[]) => any = <T>(destination: Observer<T>, source: Observable<T>): AnonymousSubject<T> => {
    return new AnonymousSubject<T>(destination, source);
  };

  constructor() {
    // NOTE: This must be here to obscure Observable's constructor.
    super();
  }

  /** @deprecated Internal implementation detail, do not use directly. Will be made internal in v8. */
  lift<R>(operator: Operator<T, R>): Observable<R> {
    const subject = new AnonymousSubject(this, this);
    subject.operator = operator as any;
    return subject as any;
  }

  /** @internal */
  protected _throwIfClosed() {
    if (this.closed) {
      throw new ObjectUnsubscribedError();
    }
  }

  next: (this: void, value: T) => void = function (this: Subject<T>, value: T): void {
    this._next(value)
  } as never

  error: (this: void, err: any) => void = function (this: Subject<T>, err: any): void {
    this._error(err)
  } as never

  complete: (this: void) => void = function (this: Subject<T>): void {
    this._complete()
  } as never

  /** @internal */
  protected _next(value: T) {
    errorContext(() => {
      this._throwIfClosed();
      if (!this.isStopped) {
        if (!this.currentObservers) {
          this.currentObservers = table.clone(this.observers);
        }
        for (const observer of this.currentObservers) {
          observer.next(value);
        }
      }
    });
  }

  /** @internal */
  protected _error(err: any) {
    errorContext(() => {
      this._throwIfClosed();
      if (!this.isStopped) {
        this.hasError = this.isStopped = true;
        this.thrownError = err;
        const { observers } = this;
        while (observers.size()) {
          observers.shift()!.error(err);
        }
      }
    });
  }

  /** @internal */
  protected _complete() {
    errorContext(() => {
      this._throwIfClosed();
      if (!this.isStopped) {
        this.isStopped = true;
        const { observers } = this;
        while (observers.size()) {
          observers.shift()!.complete();
        }
      }
    });
  }

  unsubscribe() {
    this.isStopped = this.closed = true;
    this.observers = this.currentObservers = undefined!;
  }

  getObserved() {
    return this.observers?.size() > 0;
  }

  /** @internal */
  protected _trySubscribe(subscriber: Subscriber<T>): TeardownLogic {
    this._throwIfClosed();
    return super._trySubscribe(subscriber);
  }

  /** @internal */
  protected _subscribe(subscriber: Subscriber<T>): Subscription {
    this._throwIfClosed();
    this._checkFinalizedStatuses(subscriber);
    return this._innerSubscribe(subscriber);
  }

  /** @internal */
  protected _innerSubscribe(subscriber: Subscriber<any>) {
    const { hasError, isStopped, observers } = this;
    if (hasError || isStopped) {
      return EMPTY_SUBSCRIPTION;
    }
    this.currentObservers = undefined;
    observers.push(subscriber);
    return new Subscription(() => {
      this.currentObservers = undefined;
      arrRemove(observers, subscriber);
    });
  }

  /** @internal */
  protected _checkFinalizedStatuses(subscriber: Subscriber<any>) {
    const { hasError, thrownError, isStopped } = this;
    if (hasError) {
      subscriber.error(thrownError);
    } else if (isStopped) {
      subscriber.complete();
    }
  }

  /**
   * Creates a new Observable with this Subject as the source. You can do this
   * to create custom Observer-side logic of the Subject and conceal it from
   * code that uses the Observable.
   * @return Observable that this Subject casts to.
   */
  asObservable(): Observable<T> {
    const observable: any = new Observable<T>();
    observable.source = this;
    return observable;
  }
}

export class AnonymousSubject<T> extends Subject<T> {
  constructor(
    /** @deprecated Internal implementation detail, do not use directly. Will be made internal in v8. */
    public destination?: Observer<T>,
    source?: Observable<T>
  ) {
    super();
    this.source = source;
  }

  next: (this: void, value: T) => void = function (this: AnonymousSubject<T>, value: T): void {
    this.destination?.next?.(value);
  } as never

  error: (this: void, err: any) => void = function (this: AnonymousSubject<T>, err: any): void {
    this.destination?.error?.(err);
  } as never

  complete: (this: void) => void = function (this: AnonymousSubject<T>): void {
   this.destination?.complete?.();
  } as never

  /** @internal */
  protected _subscribe(subscriber: Subscriber<T>): Subscription {
    return this.source?.subscribe(subscriber) ?? EMPTY_SUBSCRIPTION;
  }
}
