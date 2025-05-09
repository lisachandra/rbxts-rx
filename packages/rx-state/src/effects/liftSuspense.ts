import { Observable, Subscriber } from '@rbxts/rx';
import { SUSPENSE } from '../SUSPENSE';
import type { liftSuspense as ILiftSuspense } from '../types';

export const liftSuspense: typeof ILiftSuspense = () => {
  return <T>(source: Observable<T>): Observable<T | SUSPENSE> => {
    return new Observable((observer) => {
      let subscriber: Subscriber<any>;

      const setSubscriber = () => {
        subscriber = new Subscriber<T>({
          next(this: void, v: T) {
            observer.next(v as any);
          },
          error(this: void, e: unknown) {
            if (e === SUSPENSE) {
              observer.next(e);
              setSubscriber();
            } else observer.error(e);
          },
          complete(this: void) {
            observer.complete();
          },
        });
        source.subscribe(subscriber);
      };

      setSubscriber();

      return () => {
        subscriber.unsubscribe();
      };
    });
  };
};
