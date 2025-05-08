import { of, asyncScheduler, Observable, scheduled, ObservableInput } from '@rbxts/rx';
import Symbol from '@rbxts/rx/out/internal/polyfill/symbol';

const iterator = Symbol.iterator;
const observable = Symbol.observable;

export function lowerCaseO<T>(...args: Array<any>): Observable<T> {
  const o: any = {
    subscribe(observer: any) {
      args.forEach((v) => observer.next(v));
      observer.complete();
      return {
        unsubscribe() {
          /* do nothing */
        },
      };
    },
  };

  o[observable] = function (this: any) {
    return this;
  };

  return <any>o;
}

export const createObservableInputs = <T>(value: T) =>
  of(
    of(value),
    scheduled([value], asyncScheduler),
    [value],
    Promise.resolve(value),
    {
      [iterator]: () => {
        const iteratorResults = [{ value, done: false }, { done: true }];
        return {
          next: () => {
            return iteratorResults.shift();
          },
        };
      },
    } as any as Iterable<T>,
    {
      [observable]: () => of(value),
    } as any
  ) as Observable<ObservableInput<T>>;

/**
 * Used to signify no subscriptions took place to `expectSubscriptions` assertions.
 */
export const NO_SUBS: string[] = [];
