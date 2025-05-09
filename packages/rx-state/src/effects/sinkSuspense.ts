import { Observable, Subscriber } from '@rbxts/rx';
import { SUSPENSE } from '../SUSPENSE';
import { sinkSuspense as ISinkSuspense } from '../types';

type SubscriberWithInner<T> = Subscriber<T> & { inner: Subscriber<any> };
export const sinkSuspense: typeof ISinkSuspense = () => {
  return <T>(source: Observable<T>) => {
    let waiting: SubscriberWithInner<any> | undefined = undefined;

    return new Observable((observer) => {
      if (waiting) {
        waiting.inner = observer;
        const outter = waiting;
        return () => {
          if (outter.inner === observer) outter.unsubscribe();
        };
      }

      const outter = new Subscriber<T | SUSPENSE>({
        next(this: void, value: T | SUSPENSE) {
          if (value === SUSPENSE) {
            waiting = outter;
            outter.inner.error(value);
            waiting = undefined;
            if (outter.inner === observer) {
              outter.unsubscribe();
            }
          } else {
            outter.inner.next(value);
          }
        },
        error(this: void, e: unknown) {
          outter.inner.error(e);
        },
        complete(this: void) {
          outter.inner.complete();
        },
      }) as SubscriberWithInner<T>;

      outter.inner = observer;
      source.subscribe(outter);

      return () => {
        if (outter.inner === observer) outter.unsubscribe();
      };
    });
  };
};
