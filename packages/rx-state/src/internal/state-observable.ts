import { noop, Observable, OperatorFunction, Subject, Subscriber, Subscription } from '@rbxts/rx';
import { EmptyObservableError, NoSubscribersError } from '../errors';
import { StatePromise } from '../StatePromise';
import { SUSPENSE } from '../SUSPENSE';
import { EMPTY_VALUE } from './empty-value';
import { bind } from 'polyfill/bind';

export default class StateObservable<T> extends Observable<T> {
  private subject: Subject<T> | undefined = undefined;
  private subscription: Subscriber<T> | undefined = undefined;
  private refCount = 0;
  private currentValue: T = EMPTY_VALUE;
  private promise:
    | {
        res: (value: Exclude<T, SUSPENSE>) => void;
        rej: (v: any) => void;
        p: StatePromise<Exclude<T, SUSPENSE>>;
      }
    | undefined = undefined;

  constructor(
    source: Observable<T>,
    private defaultValue: T,
    teardown = noop
  ) {
    super(((_: Observable<T>, subscriber: Subscriber<T>) => {
      const subscriberWithoutComplete = new Subscriber({
        next: bind(false, subscriber['next' as never], subscriber),
        error: bind(false, subscriber['error' as never], subscriber),
        complete: noop,
      });

      this.refCount++;
      let innerSub: Subscription;

      subscriber.add(() => {
        this.refCount--;
        innerSub.unsubscribe();
        if (this.refCount === 0) {
          this.currentValue = EMPTY_VALUE;
          if (this.subscription) {
            this.subscription.unsubscribe();
          }
          teardown();
          this.subject?.complete();
          this.subject = undefined;
          this.subscription = undefined;
          if (this.promise) {
            this.promise.rej(new NoSubscribersError());
            this.promise = undefined;
          }
        }
      });

      if (!this.subject) {
        this.subject = new Subject<T>();
        innerSub = this.subject.subscribe(subscriberWithoutComplete);
        this.subscription = undefined;
        this.subscription = new Subscriber<T>({
          next: (value: T) => {
            if (this.promise && (value as unknown) !== SUSPENSE) {
              this.promise.res(value as any);
              this.promise = undefined;
            }
            this.subject!.next((this.currentValue = value));
          },
          error: (err: unknown) => {
            this.subscription = undefined;
            const subject = this.subject;
            this.subject = undefined;
            this.currentValue = EMPTY_VALUE;

            const rej = this.promise?.rej;
            if (rej && err === SUSPENSE) {
              this.promise!.rej = () => {
                rej(err);
              };
            }
            subject!.error(err);
            if (rej && this.promise) {
              this.promise.rej = rej;
            }
          },
          complete: () => {
            this.subscription = undefined;
            if (this.promise) {
              this.promise.rej(new EmptyObservableError());
              this.promise = undefined;
            }

            if (this.currentValue !== EMPTY_VALUE) return this.subject!.complete();

            if (defaultValue === EMPTY_VALUE) {
              const subject = this.subject;
              this.subject = undefined;
              return subject!.error(new EmptyObservableError());
            }

            this.subject!.next((this.currentValue = defaultValue));
            this.subject!.complete();
          },
        });
        source.subscribe(this.subscription);
        if (defaultValue !== EMPTY_VALUE && this.currentValue === EMPTY_VALUE) {
          this.subject.next((this.currentValue = defaultValue));
        }
      } else {
        innerSub = this.subject.subscribe(subscriberWithoutComplete);
        if (this.currentValue !== EMPTY_VALUE) {
          subscriber.next(this.currentValue);
        }
      }
    }) as never);

    if (defaultValue === EMPTY_VALUE) {
      // Remove the getDefaultValue property from this object, as it's not part of the interface
      delete this.getDefaultValue;
    }
  }

  pipeState = (...ops: OperatorFunction<any, any>[]) => {
    const result: unknown = (super.pipe as Callback)(...ops);
    return result instanceof StateObservable ? result : new StateObservable(result as any, EMPTY_VALUE);
  };

  getRefCount = () => {
    return this.refCount;
  };
  getValue = (): Exclude<T, SUSPENSE> | StatePromise<Exclude<T, SUSPENSE>> => {
    if (this.promise) return this.promise.p;
    if (this.currentValue !== EMPTY_VALUE && (this.currentValue as unknown) !== SUSPENSE) return this.currentValue as any;
    if (this.defaultValue !== EMPTY_VALUE) return this.defaultValue as any;
    if (this.refCount === 0) throw new NoSubscribersError();

    const promise = new StatePromise<Exclude<T, SUSPENSE>>((res, rej) => {
      this.promise = { res, rej, p: undefined as any };
    });
    this.promise!.p = promise;
    return promise;
  };
  getDefaultValue? = () => {
    return this.defaultValue;
  };
}
