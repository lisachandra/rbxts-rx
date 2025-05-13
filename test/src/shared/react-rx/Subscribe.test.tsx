import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { Error, Array, Object, setTimeout, setInterval, clearTimeout, clearInterval } from '@rbxts/luau-polyfill';
import { EmptyObservableError, NoSubscribersError, sinkSuspense, state, SUSPENSE } from '@rbxts/rx-state';
import { act, render, screen } from '@rbxts/react-testing-library';
import React, { StrictMode, useEffect, useState } from '@rbxts/react';
// import { renderToPipeableStream } from 'react-dom/server';
import { defer, EMPTY, lastValueFrom, NEVER, Observable, of, startWith, Subject } from '@rbxts/rx';
import { bind, Subscribe as OriginalSubscribe, RemoveSubscribe } from '@rbxts/react-rx';
// import { pipeableStreamToObservable } from '@rbxts/react-rx/out/test-helpers/pipeableStreamToObservable';
import { TestErrorBoundary } from '@rbxts/react-rx/out/test-helpers/TestErrorBoundary';
import { useStateObservable } from '@rbxts/react-rx/out/useStateObservable';

const wait = (ms: number) => new Promise((res) => setTimeout(res, ms, undefined as never));

const Subscribe = (props: any) => {
  return (
    <StrictMode>
      <OriginalSubscribe {...props} />
    </StrictMode>
  );
};

describe('Subscribe', () => {
  describe('Subscribe with source$', () => {
    it('renders the sync emitted value on a StateObservable without default value', () => {
      const test0 = state(EMPTY.pipe(startWith('there!')));
      const useTest = () => useStateObservable(test0);

      const Test: React.FC = () => <textlabel Text={`Hello ${useTest()}`} />;

      const TestSubscribe: React.FC = () => (
        <Subscribe>
          <Test />
        </Subscribe>
      );

      const { unmount } = render(<TestSubscribe />);

      expect(screen.queryByText('Hello there!')).never.toBeNull();

      unmount();
    });
    it("subscribes to the provided observable and remains subscribed until it's unmounted", () => {
      let nSubscriptions = 0;
      const [useNumber, number0] = bind(
        new Observable<number>(() => {
          nSubscriptions++;
          return () => {
            nSubscriptions--;
          };
        })
      );

      const Number: React.FC = () => <textlabel Text={`${useNumber()}`} />;
      const TestSubscribe: React.FC = () => (
        <Subscribe source$={number0} fallback={undefined}>
          <Number />
        </Subscribe>
      );

      expect(nSubscriptions).toBe(0);

      const { unmount } = render(<TestSubscribe />);

      expect(nSubscriptions).toBe(1);

      unmount();
      expect(nSubscriptions).toBe(0);
    });

    it("doesn't render its content until it has subscribed to a new source", () => {
      let nSubscriptions = 0;
      let errored = false;
      const [useInstance, instance0] = bind((id: number) => {
        if (id === 0) {
          return of(0);
        }
        return defer(() => {
          nSubscriptions++;
          return of(1);
        });
      });

      const Child = ({ id }: { id: number }) => {
        const value = useInstance(id);

        if (id !== 0 && nSubscriptions === 0) {
          errored = true;
        }

        return <textlabel Text={`${value}`} />;
      };
      const { rerender } = render(
        <Subscribe source$={instance0(0)}>
          <Child id={0} />
        </Subscribe>
      );
      expect(nSubscriptions).toBe(0);
      expect(errored).toBe(false);

      rerender(
        <Subscribe source$={instance0(1)}>
          <Child id={1} />
        </Subscribe>
      );
      expect(nSubscriptions).toBe(1);
      expect(errored).toBe(false);

      rerender(
        <Subscribe>
          <Child id={2} />
        </Subscribe>
      );
      expect(nSubscriptions).toBe(2);
      expect(errored).toBe(false);
    });

    it('prevents the issue of stale data when switching keys', () => {
      const [useInstance, instance0] = bind((id: number) => of(id));

      const Child = ({ id, initialValue }: { id: number; initialValue: number }) => {
        const [value] = useState(initialValue);

        return (
          <>
            <textlabel Tag={`data-testid="id"`} Text={`${id}`} />
            <textlabel Tag={`data-testid="value"`} Text={`${value}`} />
          </>
        );
      };

      const Parent = ({ id }: { id: number }) => {
        const value = useInstance(id);

        return <Child key={id} id={id} initialValue={value} />;
      };
      const { rerender, getByTestId } = render(
        <Subscribe source$={instance0(0)}>
          <Parent id={0} />
        </Subscribe>
      );

      rerender(
        <Subscribe source$={instance0(1)}>
          <Parent id={1} />
        </Subscribe>
      );
      expect((getByTestId('id') as TextLabel).Text).toBe('1');
      expect((getByTestId('value') as TextLabel).Text).toBe('1');

      const instanceTwoSubs = instance0(2).subscribe();
      rerender(
        <Subscribe source$={instance0(2)}>
          <Parent id={2} />
        </Subscribe>
      );
      expect((getByTestId('id') as TextLabel).Text).toBe('2');
      expect((getByTestId('value') as TextLabel).Text).toBe('2');
      instanceTwoSubs.unsubscribe();
    });

    it('lifts the effects of the source$ prop', () => {
      const subject0 = new Subject<number | SUSPENSE>();
      const test0 = state(subject0.pipe(sinkSuspense()));

      const { unmount } = render(<Subscribe source$={test0} />);

      expect(test0.getRefCount()).toBe(1);

      act(() => subject0.next(SUSPENSE));
      expect(test0.getRefCount()).toBe(1);

      act(() => subject0.next(1));
      expect(test0.getRefCount()).toBe(1);

      unmount();
    });
  });
  describe('Subscribe without source$', () => {
    it("subscribes to the provided observable and remains subscribed until it's unmounted", () => {
      let nSubscriptions = 0;
      const [useNumber] = bind(
        new Observable<number>(() => {
          nSubscriptions++;
          return () => {
            nSubscriptions--;
          };
        })
      );

      const Number: React.FC = () => <textlabel Text={`${useNumber()}`} />;
      const TestSubscribe: React.FC = () => (
        <Subscribe fallback={undefined}>
          <Number />
        </Subscribe>
      );

      expect(nSubscriptions).toBe(0);

      const { unmount } = render(<TestSubscribe />);

      expect(nSubscriptions).toBe(1);

      unmount();
      expect(nSubscriptions).toBe(0);
    });

    it("doesn't render its content until it has subscribed to a new source", () => {
      let nSubscriptions = 0;
      let errored = false;
      const [useInstance] = bind((id: number) => {
        if (id === 0) {
          return of(0);
        }
        return defer(() => {
          nSubscriptions++;
          return of(1);
        });
      });

      const Child = ({ id }: { id: number }) => {
        const value = useInstance(id);

        if (id !== 0 && nSubscriptions === 0) {
          errored = true;
        }

        return <textlabel Text={`${value}`} />;
      };
      const { rerender } = render(
        <Subscribe>
          <Child id={0} />
        </Subscribe>
      );
      expect(nSubscriptions).toBe(0);
      expect(errored).toBe(false);

      rerender(
        <Subscribe>
          <Child id={1} />
        </Subscribe>
      );
      expect(nSubscriptions).toBe(1);
      expect(errored).toBe(false);
    });

    it('prevents the issue of stale data when switching keys', () => {
      const [useInstance] = bind((id: number) => of(id));

      const Child = ({ id, initialValue }: { id: number; initialValue: number }) => {
        const [value] = useState(initialValue);

        return (
          <>
            <textlabel Tag={`data-testid="id"`} Text={`${id}`} />
            <textlabel Tag={`data-testid="value"`} Text={`${value}`} />
          </>
        );
      };

      const Parent = ({ id }: { id: number }) => {
        const value = useInstance(id);

        return <Child key={id} id={id} initialValue={value} />;
      };
      const { rerender, getByTestId } = render(
        <Subscribe>
          <Parent id={0} />
        </Subscribe>
      );

      rerender(
        <Subscribe>
          <Parent id={1} />
        </Subscribe>
      );
      expect((getByTestId('id') as TextLabel).Text).toBe('1');
      expect((getByTestId('value') as TextLabel).Text).toBe('1');
    });

    it("on StrictMode: it doesn't crash if the component immediately unmounts", () => {
      function App() {
        const [switched, setSwitched] = useState(false);

        useEffect(() => {
          setSwitched(true);
        }, []);

        return <>{switched ? <SwitchToComponent /> : <ProblematicComponent />}</>;
      }

      const ProblematicComponent = () => {
        return <Subscribe></Subscribe>;
      };
      const SwitchToComponent = () => {
        return <textlabel Text={'All good'} />;
      };

      let hasError = false;

      render(
        <TestErrorBoundary
          onError={() => {
            hasError = true;
          }}
        >
          <App />
        </TestErrorBoundary>
      );

      expect(hasError).toBe(false);
    });

    it('allows async errors to be caught in error boundaries with suspense, without using source$', async () => {
      const [useError] = bind(
        new Observable((obs) => {
          setTimeout(() => obs.error('controlled error'), 10);
        })
      );

      const ErrorComponent = () => {
        const value = useError();
        return <textlabel Text={`${value}`} />;
      };

      const errorCallback = jest.fn();
      const { unmount } = render(
        <TestErrorBoundary onError={errorCallback}>
          <Subscribe fallback={<textlabel Text={'Loading...'} />}>
            <ErrorComponent />
          </Subscribe>
        </TestErrorBoundary>
      );

      await act(async () => {
        await wait(100);
      });

      expect(errorCallback).toHaveBeenCalledWith('controlled error', expect.any(Object));
      unmount();
    });

    it.skip('propagates the EmptyObservable error if a stream completes synchronously', async () => {
      const globalErrors = jest.spyOn(jest['globalEnv' as never], 'error' as never);
      globalErrors.mockImplementation((v) => v);

      const [useEmpty] = bind(() => EMPTY);

      const ErrorComponent = () => {
        useEmpty();
        return undefined as never as React.ReactNode;
      };

      const errorCallback = jest.fn();
      const { unmount } = render(
        <TestErrorBoundary onError={errorCallback}>
          <Subscribe fallback={<textlabel Text={'Loading...'} />}>
            <ErrorComponent />
          </Subscribe>
        </TestErrorBoundary>
      );

      // Can't have NoSubscribersError
      // Can't have "Cannot update component (`%s`) while rendering a different component"
      globalErrors.mock.calls.forEach((args) => {
        const errorMessage = args[0];
        expect(errorMessage).never.toContain(`NoSubscribersError`);
        expect(errorMessage).never.toContain('Cannot update a component (`%s`) while rendering a different component');
      });
      globalErrors.mockRestore();

      // Must have EmptyObservableError
      expect((errorCallback.mock.calls as unknown[][]).size()).toBe(1);
      expect((errorCallback.mock.calls as unknown[][])[0][0]).toBeInstanceOf(EmptyObservableError);

      unmount();
    });

    it('lifts the effects of observables passed through context', () => {
      const subject0 = new Subject<number | SUSPENSE>();
      let innerSubs = 0;
      const test0 = state(
        defer(() => {
          innerSubs++;
          return subject0;
        }).pipe(sinkSuspense())
      );

      const Child = () => <textlabel Text={`${useStateObservable(test0)}`} />;

      const { unmount } = render(
        <Subscribe>
          <Child />
        </Subscribe>
      );

      expect(test0.getRefCount()).toBe(1);

      act(() => subject0.next(SUSPENSE));
      expect(test0.getRefCount()).toBe(1);

      act(() => subject0.next(1));
      expect(test0.getRefCount()).toBe(1);

      expect(innerSubs).toBe(1);

      unmount();
    });
  });

  /*
  describe('On SSR', () => {
    // Testing-library doesn't support SSR yet https://github.com/testing-library/react-testing-library/issues/561

    it('Renders the fallback', async () => {
      const stream = renderToPipeableStream(
        <Subscribe fallback={<textlabel Text={'Loading'} />}>
          <textlabel Text={'Content'} />
        </Subscribe>
      );
      const result = await lastValueFrom(pipeableStreamToObservable(stream));

      expect(result).toContain('<textlabel Text={'Loading'} />');
      expect(result).never.toContain('<textlabel Text={'Content'} />');
    });
  });
  */
});

describe('RemoveSubscribe', () => {
  it('prevents its children from using the parent Subscribe boundary', () => {
    const [useValue] = bind(NEVER);

    const ChildrenComponent = () => {
      const value = useValue();
      return <textlabel Text={`${value}`} />;
    };

    const errorCallback = jest.fn();
    render(
      <TestErrorBoundary onError={(e) => errorCallback(e.message)}>
        <Subscribe>
          <RemoveSubscribe>
            <ChildrenComponent />
          </RemoveSubscribe>
        </Subscribe>
      </TestErrorBoundary>
    );

    expect(errorCallback).toHaveBeenCalledWith('Missing Subscribe!');
  });
});
