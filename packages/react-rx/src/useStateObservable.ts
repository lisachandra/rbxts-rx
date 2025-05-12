import { DefaultedStateObservable, liftSuspense, NoSubscribersError, StateObservable, StatePromise, SUSPENSE } from '@rbxts/rx-state';
import { useRef, useState } from '@rbxts/react';
import useSyncExternalStore from './internal/useSyncExternalStore';
import { useSubscription } from './Subscribe';
import { Error } from '@rbxts/luau-polyfill';

type VoidCb = () => void;

interface Ref<T> {
  source$: StateObservable<T>;
  args: [(cb: VoidCb) => VoidCb, () => Exclude<T, typeof SUSPENSE>];
}

export const useStateObservable = <O>(source: StateObservable<O>): Exclude<O, typeof SUSPENSE> => {
  const subscription = useSubscription();
  const [, setError] = useState();
  const callbackRef = useRef<Ref<O> | undefined>(undefined);

  if (!callbackRef.current) {
    const getValue = (src: StateObservable<O>) => {
      const result = src.getValue();
      if (result instanceof StatePromise)
        throw result.catch((e: unknown) => {
          if (e instanceof NoSubscribersError) return e;
          throw e;
        });
      return result as any;
    };

    const gv: <T>() => Exclude<T, typeof SUSPENSE> = () => {
      const src = callbackRef.current!.source$ as DefaultedStateObservable<O>;
      if (!src.getRefCount() && !src.getDefaultValue) {
        if (!subscription) throw new Error('Missing Subscribe!');
        subscription(src);
      }
      return getValue(src);
    };

    callbackRef.current = {
      source$: undefined as any,
      // eslint-disable-next-line no-sparse-arrays
      args: [, gv] as any,
    };
  }

  const ref = callbackRef.current;
  if (ref.source$ !== source) {
    ref.source$ = source;
    ref.args[0] = (next0: () => void) => {
      const subscription = liftSuspense()(source).subscribe({
        next: next0,
        error: (e) => {
          setError(() => {
            throw e;
          });
        },
      });
      return () => {
        subscription.unsubscribe();
      };
    };
  }

  return useSyncExternalStore(...ref.args);
};
