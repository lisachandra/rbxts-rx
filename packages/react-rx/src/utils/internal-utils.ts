import { Observable } from '@rbxts/rx';

export const defaultStart =
  <T, D>(value: D) =>
  (source: Observable<T>) =>
    new Observable<T | D>(function (observer) {
      let emitted = false;
      const subscription = source.subscribe(
        (x) => {
          emitted = true;
          observer.next(x);
        },
        (e) => {
          observer.error(e);
        },
        () => {
          observer.complete();
        }
      );

      if (!emitted) {
        observer.next(value);
      }

      return subscription;
    });
