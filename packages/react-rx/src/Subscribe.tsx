import React, { useState, Suspense, useEffect, ReactNode, useRef, createContext, useContext } from '@rbxts/react';
import { Observable, Subscription } from '@rbxts/rx';
import { liftSuspense, StateObservable } from '@rbxts/rx-state';
import { EMPTY_VALUE } from './internal/empty-value';

const SubscriptionContext = createContext<((src: StateObservable<any>) => void) | undefined>(undefined);
const { Provider } = SubscriptionContext;
export const useSubscription = () => useContext(SubscriptionContext);

const p = Promise.resolve();
const Throw = () => {
  throw p;
};

/**
 * A React Component that:
 * - collects the subscriptions of its children and it unsubscribes them when
 * the component unmounts.
 * - if a source$ property is used, then it ensures that the subscription to the
 * observable will exist before the children gets rendered, and it unsubscribes
 * from it when the component unmounts.
 *
 * If the fallback property is used, then the component will create a Suspense
 * boundary with the provided JSX Element, otherwise it will render null until
 * the subscription exists.
 *
 * @param [source$] (=undefined) - Source observable that the Component will
 * subscribe to before it renders its children.
 * @param [fallback] (=null) - JSX Element to be used by the Suspense boundary.
 *
 * @remarks This Component doesn't trigger any updates from the source$.
 */
export const Subscribe: React.FC<{
  children?: React.ReactNode;
  source$?: Observable<any>;
  fallback?: NonNullable<ReactNode>;
}> = ({ source$: source, children, fallback }) => {
  const subscriptionRef = useRef<
    | {
        s: Subscription;
        u: (source: StateObservable<any>) => void;
      }
    | undefined
  >(undefined);

  if (!subscriptionRef.current) {
    const s = new Subscription();
    subscriptionRef.current = {
      s,
      u: (src) => {
        let err = EMPTY_VALUE;
        let synchronous = true;
        s.add(
          liftSuspense()(src).subscribe({
            error: (e) => {
              if (synchronous) {
                // Can't setState of this component when another one is rendering.
                err = e as never;
                return;
              }
              setSubscribedSource(() => {
                throw e;
              });
            },
          })
        );
        synchronous = false;
        if (err !== EMPTY_VALUE) {
          throw err;
        }
      },
    };
  }

  const [subscribedSource, setSubscribedSource] = useState<Observable<any> | undefined>(undefined);

  if (subscribedSource !== undefined && subscribedSource !== source) {
    if (source === undefined) {
      setSubscribedSource(source);
    } else {
      try {
        (source['getValue' as never] as Callback)(source);
        setSubscribedSource(source);
        // eslint-disable-next-line no-empty
      } catch (e: any) {}
    }
  }

  useEffect(() => {
    setSubscribedSource(source);
    if (!source) return;

    const subscription = liftSuspense()(source).subscribe({
      error: (e) =>
        setSubscribedSource(() => {
          throw e;
        }),
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [source]);

  useEffect(() => {
    return () => {
      subscriptionRef.current?.s.unsubscribe();
      subscriptionRef.current = undefined;
    };
  }, []);

  const actualChildren =
    subscribedSource === source ? (
      <Provider value={subscriptionRef.current.u}>{children}</Provider>
    ) : fallback === undefined ? undefined : (
      <Throw />
    );

  return fallback === undefined ? (
    actualChildren
  ) : subscribedSource === undefined ? (
    fallback
  ) : (
    <Suspense fallback={fallback}>{actualChildren}</Suspense>
  );
};

/**
 * Component that prevents its children from using the parent `Subscribe` boundary
 * to manage their subscriptions.
 */
export const RemoveSubscribe: React.FC<{
  children?: React.ReactNode | undefined;
}> = ({ children }) => <Provider value={undefined}>{children}</Provider>;
