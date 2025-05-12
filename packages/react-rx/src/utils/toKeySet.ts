import { Observable, OperatorFunction } from '@rbxts/rx';
import { KeyChanges } from './partitionByKey';

/**
 * Operator function that maps a stream of KeyChanges into a Set that contains
 * the active keys.
 */
export function toKeySet<K>(): OperatorFunction<KeyChanges<K>, Set<K>> {
  return (source) =>
    new Observable<Set<K>>(function (observer) {
      const result = new Set<K>();
      let pristine = true;
      const subscription = source.subscribe({
        next: ({ type: kind, keys }) => {
          const action = kind === 'add' ? kind : 'delete';
          for (let [_, k] of pairs(keys)) {
            result[action](k as never);
          }
          observer.next(result);
          pristine = false;
        },
        error: (e) => {
          observer.error(e);
        },
        complete: () => {
          observer.complete();
        },
      });
      if (pristine) observer.next(result);
      return subscription;
    });
}
