import { Observable, Subject, MonoTypeOperatorFunction, BehaviorSubject } from '@rbxts/rx';
import { switchAll, tap } from '@rbxts/rx/out/operators';

/**
 * A creation operator that helps at creating observables that have circular
 * dependencies
 *
 * @returns [1, 2]
 * 1. The inner subject as an Observable
 * 2. A pipable operator that taps into the inner Subject
 */
export const selfDependent = <T>(): [Observable<T>, () => MonoTypeOperatorFunction<T>] => {
  const activeSubject: BehaviorSubject<Subject<T>> = new BehaviorSubject(new Subject<T>());
  return [
    activeSubject.pipe(switchAll()),
    () =>
      tap({
        next: (v) => activeSubject.getValue().next(v),
        error: (e) => {
          activeSubject.getValue().error(e);
          activeSubject.next(new Subject<T>());
        },
        complete: () => {
          activeSubject.getValue().complete();
          activeSubject.next(new Subject<T>());
        },
      }) as MonoTypeOperatorFunction<T>,
  ];
};

/**
 * @deprecated renamed to `selfDependent`
 */
export const selfDependant = selfDependent;
