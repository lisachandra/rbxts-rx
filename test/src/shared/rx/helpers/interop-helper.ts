import { Observable, Operator, Subject, Subscriber, Subscription } from '@rbxts/rx';

/**
 * Returns an observable that will be deemed by this package's implementation
 * to be an observable that requires interop. The returned observable will fail
 * the `instanceof Observable` test and will deem any `Subscriber` passed to
 * its `subscribe` method to be untrusted.
 */
export function asInteropObservable<T>(observable: Observable<T>): Observable<T> {
  return setmetatable({} as Observable<T>, {
    __index: (target, key) => {
      if (key === 'lift') {
        const { lift } = target;
        return interopLift(lift);
      }
      if (key === 'subscribe') {
        const { subscribe } = target;
        return interopSubscribe(subscribe);
      }
      return observable[key as keyof typeof observable];
    },
  }) as Observable<T>;
}

/**
 * Returns a subject that will be deemed by this package's implementation to
 * be untrusted. The returned subject will not include the symbol that
 * identifies trusted subjects.
 */
export function asInteropSubject<T>(subject: Subject<T>): Subject<T> {
  return asInteropSubscriber(subject as any) as any;
}

/**
 * Returns a subscriber that will be deemed by this package's implementation to
 * be untrusted. The returned subscriber will fail the `instanceof Subscriber`
 * test and will not include the symbol that identifies trusted subscribers.
 */
export function asInteropSubscriber<T>(subscriber: Subscriber<T>): Subscriber<T> {
  return setmetatable({}, { __index: subscriber as never }) as Subscriber<T>;
}

function interopLift<T, R>(lift: (this: Observable<T>, operator: Operator<T, R>) => Observable<R>) {
  return function (this: Observable<T>, operator: Operator<T, R>): Observable<R> {
    const observable = (lift as Callback)(this, operator);
    const call = observable.operator!;
    observable.operator! = function (this: Operator<T, R>, subscriber: Subscriber<R>, source: any) {
      return call(asInteropSubscriber(subscriber), source);
    };
    observable.source = asInteropObservable(observable.source!);
    return asInteropObservable(observable);
  };
}

function interopSubscribe<T>(subscribe: (...args: any[]) => Subscription) {
  return function (this: Observable<T>, ...args: any[]): Subscription {
    const [arg] = args;
    if (arg instanceof Subscriber) {
      return subscribe(this, asInteropSubscriber(arg));
    }
    return subscribe(this, ...args);
  };
}
