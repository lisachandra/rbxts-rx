import { Subject } from './Subject';
import { Subscriber } from './Subscriber';
import { Subscription } from './Subscription';

/**
 * A variant of Subject that requires an initial value and emits its current
 * value whenever it is subscribed to.
 */
export class BehaviorSubject<T> extends Subject<T> {
  constructor(private _value: T) {
    super();
  }

  /** @internal */
  protected _subscribe(subscriber: Subscriber<T>): Subscription {
    const subscription = super._subscribe(subscriber);
    !subscription.closed && subscriber.next(this._value);
    return subscription;
  }

  getValue(): T {
    const { hasError, thrownError, _value } = this;
    if (hasError) {
      throw thrownError;
    }
    this._throwIfClosed();
    return _value;
  }

  next: (this: void, value: T) => void = function (this: BehaviorSubject<T>, value: T): void {
    this._next((this._value = value));
  } as never
}
