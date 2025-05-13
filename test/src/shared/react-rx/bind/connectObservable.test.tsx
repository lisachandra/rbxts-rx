import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { Error, Array, Object, setTimeout, setInterval, clearTimeout, clearInterval } from '@rbxts/luau-polyfill';
import { act, act as componentAct, fireEvent, render, renderHook, screen, waitFor } from '@rbxts/react-testing-library';
import React, { FC, StrictMode, Suspense, useEffect, useState } from '@rbxts/react';
// import { renderToPipeableStream } from 'react-dom/server';
import { defer, EMPTY, from, lastValueFrom, merge, NEVER, Observable, of, Subject, throwError } from '@rbxts/rx';
import { catchError, delay, map, scan, startWith, switchMapTo } from '@rbxts/rx/out/operators';
import { bind, sinkSuspense, Subscribe, SUSPENSE, useStateObservable } from '@rbxts/react-rx';
// import { pipeableStreamToObservable } from '../test-helpers/pipeableStreamToObservable';
import { TestErrorBoundary } from '@rbxts/react-rx/out/test-helpers/TestErrorBoundary';
import { fireClickEvent } from '../helpers/fireEvent';
import RegExp from '@rbxts/regexp';

const wait = (ms: number) => new Promise((res) => setTimeout(res, ms, undefined as never));

describe('connectObservable', () => {
  /*
  const originalError = jest['globalEnv' as never]['error'] as typeof error;
  const errorSpy = jest.spyOn(jest['globalEnv' as never], 'error' as never);

  beforeAll(() => {
    errorSpy.mockImplementation(((...args: never[]) => {
      if (
        typeIs(args[0], 'string') &&
        (RegExp('Warning.*not wrapped in act').test(args[0]) ||
          RegExp("Uncaught 'controlled error'").test(args[0]) ||
          RegExp('Missing subscription').test(args[0]) ||
          RegExp('Empty observable').test(args[0]) ||
          RegExp('using the error boundary .* TestErrorBoundary').test(args[0]))
      ) {
        return;
      }
      originalError(...args);
    }) as never);
  });

  afterAll(() => {
    errorSpy.mockRestore();
  });
  */

  it("sets the initial state synchronously if it's available", async () => {
    const observable0 = of(1);
    const [useLatestNumber, latestNumber0] = bind(observable0);
    const subs = latestNumber0.subscribe();

    const { result } = renderHook(() => useLatestNumber());
    expect(result.current).toEqual(1);
    subs.unsubscribe();
  });

  it("suspends the component when the observable hasn't emitted yet.", async () => {
    const source0 = of(1).pipe(delay(100));
    const [, delayedNumber0] = bind(source0);
    const sub = delayedNumber0.subscribe();
    const Result: React.FC = () => <textlabel Text={`Result ${useStateObservable(delayedNumber0)}`} />;
    const TestSuspense: React.FC = () => {
      return (
        <Suspense fallback={<textlabel Text={'Waiting'} />}>
          <Result />
        </Suspense>
      );
    };

    render(<TestSuspense />);

    expect(screen.queryByText('Result')).toBeNull();
    expect(screen.queryByText('Waiting')).never.toBeNull();

    await wait(110);

    await waitFor(
      () => {
        expect(screen.queryByText('Result 1')).never.toBeNull();
        expect(screen.queryByText('Waiting')).toBeNull();
      },
      { timeout: 2000 }
    );
    sub.unsubscribe();
  });

  it('suspends the component when the observable starts emitting suspense', async () => {
    const source0 = of(1).pipe(delay(100), startWith(SUSPENSE));
    const [useDelayedNumber, delayedNumber0] = bind(source0);
    const sub = delayedNumber0.subscribe();
    const Result: React.FC = () => <textlabel Text={`Result ${useDelayedNumber()}`} />;
    const TestSuspense: React.FC = () => {
      return (
        <Suspense fallback={<textlabel Text={'Waiting'} />}>
          <Result />
        </Suspense>
      );
    };

    render(<TestSuspense />);

    expect(screen.queryByText('Result')).toBeNull();
    expect(screen.queryByText('Waiting')).never.toBeNull();

    await wait(110);

    await waitFor(
      () => {
        expect(screen.queryByText('Result 1')).never.toBeNull();
        expect(screen.queryByText('Waiting')).toBeNull();
      },
      { timeout: 2000 }
    );
    sub.unsubscribe();
  });

  it('updates with the last emitted value', async () => {
    const numberStream = new Subject<number>();
    const [useNumber] = bind(numberStream, 1);
    const { result } = renderHook(() => useNumber());
    expect(result.current).toBe(1);

    act(() => {
      numberStream.next(2);
    });
    expect(result.current).toBe(2);
  });

  it('updates more than one component', async () => {
    const value = new Subject<number>();
    const [useValue] = bind(value, 0);
    const { result: result1, unmount: unmount1 } = renderHook(() => useValue());
    const { result: result2, unmount: unmount2 } = renderHook(() => useValue());
    const { result: result3, unmount: unmount3 } = renderHook(() => useValue());
    const { result: result4, unmount: unmount4 } = renderHook(() => useValue());

    expect(result1.current).toBe(0);
    expect(result2.current).toBe(0);
    expect(result3.current).toBe(0);
    expect(result4.current).toBe(0);

    act(() => {
      value.next(1);
    });

    expect(result1.current).toBe(1);
    expect(result2.current).toBe(1);
    expect(result3.current).toBe(1);
    expect(result4.current).toBe(1);

    unmount1();
    unmount2();
    unmount3();
    unmount4();

    await act(async () => {
      await wait(260);
    });

    const { result: result2_1 } = renderHook(() => useValue());
    const { result: result2_2 } = renderHook(() => useValue());
    const { result: result2_3 } = renderHook(() => useValue());
    const { result: result2_4 } = renderHook(() => useValue());

    expect(result2_1.current).toBe(0);
    expect(result2_2.current).toBe(0);
    expect(result2_3.current).toBe(0);
    expect(result2_4.current).toBe(0);
  });

  it('allows React to batch synchronous updates', async () => {
    const numberStream = new Subject<number>();
    const stringStream = new Subject<string>();
    const [useNumber] = bind(numberStream, 1);
    const [useString] = bind(stringStream, 'a');

    const BatchComponent: FC<{ onUpdate: () => void }> = ({ onUpdate }) => {
      const num = useNumber();
      const str = useString();
      useEffect(onUpdate);
      return (
        <>
          <textlabel Text={`${num}`} />
          <textlabel Text={`${str}`} />
        </>
      );
    };

    const updates = jest.fn();
    render(<BatchComponent onUpdate={updates} />);
    expect(updates).toHaveBeenCalledTimes(1);

    componentAct(() => {
      numberStream.next(2);
      numberStream.next(3);
      stringStream.next('b');
    });
    expect(updates).toHaveBeenCalledTimes(2);
  });

  it('shares the source subscription until there are no more subscribers', async () => {
    let nInitCount = 0;
    const observable0 = defer(() => {
      nInitCount += 1;
      return from([1, 2, 3, 4, 5]);
    });

    const [useLatestNumber, latestNumber0] = bind(observable0);
    let subs = latestNumber0.subscribe();
    const { unmount } = renderHook(() => useLatestNumber());
    const { unmount: unmount2 } = renderHook(() => useLatestNumber());
    const { unmount: unmount3 } = renderHook(() => useLatestNumber());
    expect(nInitCount).toBe(1);
    unmount();
    unmount2();
    unmount3();

    const { unmount: unmount4 } = renderHook(() => useLatestNumber());
    expect(nInitCount).toBe(1);
    unmount4();

    subs.unsubscribe();
    subs = latestNumber0.subscribe();
    renderHook(() => useLatestNumber());
    expect(nInitCount).toBe(2);
  });

  it('suspends the component when the observable emits SUSPENSE', async () => {
    const subject0 = new Subject<void>();
    const source0 = subject0.pipe(
      scan((a) => a + 1, 0),
      map((x) => {
        if (x === 1) {
          return SUSPENSE;
        }
        return x;
      }),
      startWith(0)
    );
    const [useDelayedNumber, delayedNumber0] = bind(source0);
    const Result: React.FC = () => <textlabel Text={`Result ${useDelayedNumber()}`} />;
    const TestSuspense: React.FC = () => {
      return (
        <>
          <textbutton Event={{ Activated: () => subject0.next() }} Text={'Next'} />
          <Subscribe source$={delayedNumber0} fallback={<textlabel Text={'Waiting'} />}>
            <Result />
          </Subscribe>
        </>
      );
    };

    render(<TestSuspense />);

    expect(screen.queryByText('Result 0')).never.toBeNull();
    expect(screen.queryByText('Waiting')).toBeNull();

    fireClickEvent(screen.getByText<TextButton>(RegExp('Next', 'i')));

    expect(screen.queryByText('Waiting')).never.toBeNull();

    fireClickEvent(screen.getByText<TextButton>(RegExp('Next', 'i')));

    expect(screen.queryByText('Result 2')).never.toBeNull();
    expect(screen.queryByText('Waiting')).toBeNull();
  });

  it('keeps in suspense if more than two SUSPENSE are emitted in succesion', async () => {
    const subject0 = new Subject<void>();
    const source0 = subject0.pipe(
      scan((a) => a + 1, 0),
      map((x) => {
        if (x <= 2) {
          return SUSPENSE;
        }
        return x;
      }),
      startWith(0)
    );
    const [useDelayedNumber, delayedNumber0] = bind(source0);
    const Result: React.FC = () => <textlabel Text={`Result ${useDelayedNumber()}`} />;
    const TestSuspense: React.FC = () => {
      return (
        <>
          <textbutton Event={{ Activated: () => subject0.next() }} Text={'Next'} />
          <Subscribe source$={delayedNumber0} fallback={<textlabel Text={'Waiting'} />}>
            <Result />
          </Subscribe>
        </>
      );
    };

    render(<TestSuspense />);

    expect(screen.queryByText('Result 0')).never.toBeNull();
    expect(screen.queryByText('Waiting')).toBeNull();

    fireClickEvent(screen.getByText<TextButton>(RegExp('Next', 'i')));

    expect(screen.queryByText('Waiting')).never.toBeNull();

    fireClickEvent(screen.getByText<TextButton>(RegExp('Next', 'i')));

    expect(screen.queryByText('Waiting')).never.toBeNull();

    fireClickEvent(screen.getByText<TextButton>(RegExp('Next', 'i')));

    expect(screen.queryByText('Result 3')).never.toBeNull();
    expect(screen.queryByText('Waiting')).toBeNull();
  });

  it("doesn't enter suspense if the observable emits a promise", async () => {
    const subject0 = new Subject<Promise<any>>();
    const [usePromise, promise0] = bind(subject0, undefined);
    const Result: React.FC = () => {
      const value = usePromise();
      return <textlabel Text={`${value === undefined ? 'default' : value instanceof Promise ? 'promise' : 'wtf?'}`} />;
    };

    const TestSuspense: React.FC = () => {
      return (
        <>
          <Subscribe source$={promise0} fallback={<textlabel Text={'Waiting'} />}>
            <Result />
          </Subscribe>
        </>
      );
    };

    render(<TestSuspense />);

    expect(screen.queryByText('Waiting')).toBeNull();
    expect(screen.queryByText('default')).never.toBeNull();

    act(() => subject0.next(new Promise(() => {})));

    expect(screen.queryByText('Waiting')).toBeNull();
    expect(screen.queryByText('promise')).never.toBeNull();
  });

  it('correctly unsubscribes when the Subscribe component gets unmounted', async () => {
    const subject0 = new Subject<void>();
    const [useNumber, number0] = bind(subject0.pipe(scan((a) => a + 1, 0)));

    const Result: React.FC = () => <textlabel Text={`Result ${useNumber()}`} />;
    const TestSuspense: React.FC = () => {
      const [key, setKey] = useState(1);
      return (
        <>
          <textbutton Event={{ Activated: () => setKey((x) => x + 1) }} Text={'NextKey'} />
          <textbutton Event={{ Activated: () => subject0.next() }} Text={'NextVal'} />
          <Subscribe key={key} source$={number0} fallback={<textlabel Text={'Waiting'} />}>
            <Result />
          </Subscribe>
        </>
      );
    };

    render(<TestSuspense />);

    expect(screen.queryByText('Result 0')).toBeNull();
    expect(screen.queryByText('Waiting')).never.toBeNull();

    fireClickEvent(screen.getByText<TextButton>(RegExp('NextVal', 'i')));

    await wait(10);

    await waitFor(() => {
      expect(screen.queryByText('Waiting')).toBeNull();
      expect(screen.queryByText('Result 1')).never.toBeNull();
    });

    fireClickEvent(screen.getByText<TextButton>(RegExp('NextVal', 'i')));

    await waitFor(() => {
      expect(screen.queryByText('Result 2')).never.toBeNull();
      expect(screen.queryByText('Waiting')).toBeNull();
    });

    fireClickEvent(screen.getByText<TextButton>(RegExp('NextKey', 'i')));

    await wait(10);

    expect(screen.queryByText('Waiting')).never.toBeNull();

    fireClickEvent(screen.getByText<TextButton>(RegExp('NextVal', 'i')));

    await wait(10);

    await waitFor(() => {
      expect(screen.queryByText('Result 1')).never.toBeNull();
      expect(screen.queryByText('Waiting')).toBeNull();
    });

    fireClickEvent(screen.getByText<TextButton>(RegExp('NextVal', 'i')));

    await waitFor(() => {
      expect(screen.queryByText('Result 2')).never.toBeNull();
      expect(screen.queryByText('Waiting')).toBeNull();
    });
  });

  it('allows errors to be caught in error boundaries', () => {
    const errStream = new Subject<any>();
    const [useError] = bind(errStream, 1);

    const ErrorComponent = () => {
      const value = useError();
      return <textlabel Text={`${value}`} />;
    };

    const errorCallback = jest.fn();
    render(
      <TestErrorBoundary onError={errorCallback}>
        <ErrorComponent />
      </TestErrorBoundary>
    );

    componentAct(() => {
      errStream.error('controlled error');
    });

    expect(errorCallback).toHaveBeenCalledWith('controlled error', expect.any(Object));
  });

  it('allows sync errors to be caught in error boundaries with suspense, using source$', () => {
    const errStream = new Observable<any>((observer) => observer.error('controlled error'));
    const [useError, errStream0] = bind(errStream);

    const ErrorComponent = () => {
      const value = useError();
      return <textlabel Text={`${value}`} />;
    };

    const errorCallback = jest.fn();
    const { unmount } = render(
      <TestErrorBoundary onError={errorCallback}>
        <Subscribe source$={errStream0} fallback={<textlabel Text={'Loading...'} />}>
          <ErrorComponent />
        </Subscribe>
      </TestErrorBoundary>
    );

    expect(errorCallback).toHaveBeenCalledWith('controlled error', expect.any(Object));
    unmount();
  });

  it('allows sync errors to be caught in error boundaries with suspense, without using source$', () => {
    const errStream = new Observable<any>((observer) => observer.error('controlled error'));
    const [useError] = bind(errStream);

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

    expect(errorCallback).toHaveBeenCalledWith('controlled error', expect.any(Object));
    unmount();
  });

  it('allows sync errors to be caught in error boundaries when there is a default value', () => {
    const errStream = new Observable<any>((observer) => observer.error('controlled error'));
    const [useError, errStream0] = bind(errStream, 0);

    const ErrorComponent = () => {
      const value = useError();
      return <textlabel Text={`${value}`} />;
    };

    const errorCallback = jest.fn();
    const { unmount } = render(
      <TestErrorBoundary onError={errorCallback}>
        <Subscribe source$={errStream0} fallback={<textlabel Text={'Loading...'} />}>
          <ErrorComponent />
        </Subscribe>
      </TestErrorBoundary>
    );

    expect(errorCallback).toHaveBeenCalledWith('controlled error', expect.any(Object));
    unmount();
  });

  it('allows async errors to be caught in error boundaries with suspense', async () => {
    const errStream = new Subject<any>();
    const [useError, errStream0] = bind(errStream);
    const errStream0WithoutErrors = errStream0.pipe(catchError(() => NEVER));

    const ErrorComponent = () => {
      const value = useError();
      return <textlabel Text={`${value}`} />;
    };

    const errorCallback = jest.fn();
    const { unmount } = render(
      <TestErrorBoundary onError={errorCallback}>
        <Subscribe source$={errStream0WithoutErrors} fallback={<textlabel Text={'Loading...'} />}>
          <ErrorComponent />
        </Subscribe>
      </TestErrorBoundary>
    );

    await componentAct(async () => {
      errStream.error('controlled error');
      await wait(50);
    });

    expect(errorCallback).toHaveBeenCalledWith('controlled error', expect.any(Object));
    unmount();
  });

  it('allows to retry the errored observable after a grace period of time', async () => {
    const errStream = new Subject<string>();
    const nextStream = new Subject<string>();
    const [useError, error0] = bind(
      merge(
        errStream.pipe(
          map((x) => {
            throw x;
          })
        ),
        nextStream
      )
    );

    const ErrorComponent = () => {
      const value = useError();
      return <textlabel Text={`${value}`} />;
    };

    const errorCallback = jest.fn();
    const { unmount } = render(
      <TestErrorBoundary onError={errorCallback}>
        <Subscribe source$={error0} fallback={<textlabel Text={'Loading...'} />}>
          <ErrorComponent />
        </Subscribe>
      </TestErrorBoundary>
    );

    expect(screen.queryByText('Loading...')).never.toBeNull();
    expect(screen.queryByText('ALL GOOD')).toBeNull();

    await componentAct(async () => {
      errStream.next('controlled error');
      await wait(50);
    });

    expect(screen.queryByText('Loading...')).toBeNull();
    expect(screen.queryByText('ALL GOOD')).toBeNull();
    expect(errorCallback).toHaveBeenCalledWith('controlled error', expect.any(Object));
    unmount();

    errorCallback.mockReset();
    await componentAct(async () => {
      await wait(200);
    });

    render(
      <TestErrorBoundary onError={errorCallback}>
        <Subscribe source$={error0} fallback={<textlabel Text={'Loading...'} />}>
          <ErrorComponent />
        </Subscribe>
      </TestErrorBoundary>
    );
    expect(screen.queryByText('Loading...')).never.toBeNull();

    await componentAct(async () => {
      nextStream.next('ALL GOOD');
      await wait(50);
    });

    expect(errorCallback).never.toHaveBeenCalledWith('controlled error', expect.any(Object));
    expect(screen.queryByText('ALL GOOD')).never.toBeNull();
  });

  it("doesn't throw errors on components that will get unmounted on the next cycle", () => {
    const valueStream = new Subject<number>();
    const [useValue] = bind(valueStream, 1);
    const [useError] = bind(valueStream.pipe(switchMapTo(throwError('error'))), 1);

    const ErrorComponent: FC = () => {
      const value = useError();

      return <textlabel Text={`${value}`} />;
    };

    const Container: FC = () => {
      const value = useValue();

      return value === 1 ? <ErrorComponent /> : <textlabel Text={'Nothing to show here'} />;
    };

    const errorCallback = jest.fn();
    render(
      <TestErrorBoundary onError={errorCallback}>
        <Container />
      </TestErrorBoundary>
    );

    componentAct(() => {
      valueStream.next(2);
    });

    expect(errorCallback).never.toHaveBeenCalled();
  });

  it('supports streams that emit functions', () => {
    const values0 = new Subject<number>();

    const [useFunction, function0] = bind(
      values0.pipe(
        startWith(0),
        map((value) => () => value)
      )
    );
    const subscription = function0.subscribe();

    const { result, rerender } = renderHook(() => useFunction());

    expect(result.current()).toBe(0);

    values0.next(1);
    rerender();

    expect(result.current()).toBe(1);

    subscription.unsubscribe();
  });

  it('should throw an error when the stream does not have a subscription', () => {
    const [useValue] = bind(of('Hello'));
    const errorCallback = jest.fn();

    const Component: FC = () => <textlabel Text={`${useValue()}`} />;
    render(
      <StrictMode>
        <TestErrorBoundary onError={errorCallback}>
          <Suspense fallback={<textlabel Text={'Loading...'} />}>
            <Component />
          </Suspense>
        </TestErrorBoundary>
      </StrictMode>
    );

    expect(errorCallback).toHaveBeenCalled();
  });

  it('should throw an error if the stream completes without emitting while on SUSPENSE', async () => {
    const subject = new Subject<any>();
    const [useValue, value0] = bind(subject);
    const errorCallback = jest.fn();

    const Component: FC = () => <textlabel Text={`${useValue()}`} />;
    render(
      <StrictMode>
        <TestErrorBoundary onError={errorCallback}>
          <Subscribe source$={value0} fallback={<textlabel Text={'Loading...'} />}>
            <Component />
          </Subscribe>
        </TestErrorBoundary>
      </StrictMode>
    );

    expect(errorCallback).never.toHaveBeenCalled();
    expect(screen.queryByText('Loading...')).never.toBeNull();

    await componentAct(async () => {
      subject.complete();
      await wait(100);
    });

    expect(screen.queryByText('Loading...')).toBeNull();
    expect(errorCallback).toHaveBeenCalled();
  });

  it('the defaultValue can be undefined', () => {
    const number0 = new Subject<number>();
    const [useNumber] = bind(number0, undefined);

    const { result, unmount } = renderHook(() => useNumber());

    expect(result.current).toBe(undefined);

    act(() => {
      number0.next(5);
    });

    expect(result.current).toBe(5);

    unmount();
  });

  it("if the observable hasn't emitted and a defaultValue is provided, it does not start suspense", () => {
    const number0 = new Subject<number>();
    const [useNumber] = bind(number0, 0);

    const { result, unmount } = renderHook(() => useNumber());

    expect(result.current).toBe(0);

    act(() => {
      number0.next(5);
    });

    expect(result.current).toBe(5);

    unmount();
  });

  it('when a defaultValue is provided, the first subscription happens once the component is mounted', () => {
    let nTopSubscriptions = 0;

    const [useNTopSubscriptions] = bind(
      defer(() => of(++nTopSubscriptions)),
      1
    );

    const { result, rerender, unmount } = renderHook(() => useNTopSubscriptions());

    expect(result.current).toBe(1);

    act(() => {
      rerender();
    });

    expect(result.current).toBe(1);
    expect(nTopSubscriptions).toBe(1);

    unmount();
  });

  it("when a defaultValue is provided, the resulting observable should emmit the defaultValue first if the source doesn't synchronously emmit anything", () => {
    let value = 0;
    let [, result0] = bind<number>(NEVER, 10);
    result0.subscribe((v) => {
      value = v;
    });
    expect(value).toBe(10);

    value = 0;
    [, result0] = bind(EMPTY, 10);
    result0.subscribe((v) => {
      value = v;
    });

    value = 0;
    [, result0] = bind(of(5), 10);
    result0.subscribe((v) => {
      value += v;
    });
    expect(value).toBe(5);
  });

  it('enters suspense when the observable emits an effect', async () => {
    const subject0 = new Subject<number | SUSPENSE>();
    const [useValue] = bind(subject0.pipe(sinkSuspense()));
    const Result: React.FC = () => <textlabel Text={`Result ${useValue()}`} />;

    const TestSuspense: React.FC = () => {
      return (
        <Subscribe fallback={<textlabel Text={'Waiting'} />}>
          <Result />
        </Subscribe>
      );
    };

    const { queryByText } = render(<TestSuspense />);

    await act(async () => {
      subject0.next(0);
    });

    expect(queryByText('Result 0')).never.toBeNull();
    expect(queryByText('Waiting')).toBeNull();

    act(() => {
      subject0.next(SUSPENSE);
    });

    expect(queryByText('Waiting')).never.toBeNull();

    act(() => {
      subject0.next(1);
    });

    expect(queryByText('Result 1')).never.toBeNull();
    expect(queryByText('Waiting')).toBeNull();
  });

  it('ignores effects while waiting for the first value', async () => {
    const subject0 = new Subject<number | SUSPENSE>();
    const [useValue] = bind(subject0.pipe(sinkSuspense()));
    const Result: React.FC = () => <textlabel Text={`Result ${useValue()}`} />;

    const TestSuspense: React.FC = () => {
      return (
        <Subscribe fallback={<textlabel Text={'Waiting'} />}>
          <Result />
        </Subscribe>
      );
    };

    const { queryByText } = render(<TestSuspense />);

    expect(queryByText('Waiting')).never.toBeNull();

    await act(async () => {
      subject0.next(SUSPENSE);
    });
    expect(queryByText('Waiting')).never.toBeNull();

    await act(async () => {
      subject0.next(SUSPENSE);
      await wait(10);
      subject0.next(SUSPENSE);
    });
    expect(queryByText('Waiting')).never.toBeNull();

    await act(async () => {
      subject0.next(1);
    });
    expect(queryByText('Result 1')).never.toBeNull();
    expect(queryByText('Waiting')).toBeNull();
  });

  it('ignores effects after entering suspense', async () => {
    const subject0 = new Subject<number | SUSPENSE>();
    const [useValue] = bind(subject0.pipe(sinkSuspense()));
    const Result: React.FC = () => <textlabel Text={`Result ${useValue()}`} />;

    const TestSuspense: React.FC = () => {
      return (
        <Subscribe fallback={<textlabel Text={'Waiting'} />}>
          <Result />
        </Subscribe>
      );
    };

    const { queryByText } = render(<TestSuspense />);

    await act(async () => {
      subject0.next(0);
    });

    expect(queryByText('Result 0')).never.toBeNull();
    expect(queryByText('Waiting')).toBeNull();

    await act(async () => {
      subject0.next(SUSPENSE);
    });
    expect(queryByText('Waiting')).never.toBeNull();

    await act(async () => {
      subject0.next(SUSPENSE);
      await wait(10);
      subject0.next(SUSPENSE);
    });
    expect(queryByText('Waiting')).never.toBeNull();

    await act(async () => {
      subject0.next(1);
    });
    expect(queryByText('Result 1')).never.toBeNull();
    expect(queryByText('Waiting')).toBeNull();
  });

  it('emits the default value when an effect is received', () => {
    const subject0 = new Subject<number | SUSPENSE>();
    const [useValue] = bind(subject0.pipe(sinkSuspense()), 10);
    const Result: React.FC = () => <textlabel Text={`Result ${useValue()}`} />;

    const { queryByText } = render(<Result />);

    expect(queryByText('Result 10')).never.toBeNull();

    act(() => {
      subject0.next(5);
    });
    expect(queryByText('Result 5')).never.toBeNull();

    act(() => {
      subject0.next(SUSPENSE);
    });
    expect(queryByText('Result 10')).never.toBeNull();
  });

  /*
  describe('The hook on SSR', () => {
    // Testing-library doesn't support SSR yet https://github.com/testing-library/react-testing-library/issues/561

    it('returns the value if the state observable has a subscription', async () => {
      const [useState, state0] = bind(of(5));
      state0.subscribe();
      const Component = () => {
        const value = useState();
        return <textlabel Text={Value: {value}} />;
      };
      const stream = renderToPipeableStream(<Component />);
      const result = await lastValueFrom(pipeableStreamToObservable(stream));

      // Sigh...
      expect(result).toEqual('<textlabel Text={'Value: <!-- -->5'} />');
    });

    it("throws Missing Subscribe if the state observable doesn't have a subscription nor a default value", async () => {
      const [useState] = bind(of(5));
      const Component = () => {
        const value = useState();
        return <textlabel Text={Value: {value}} />;
      };
      const stream = renderToPipeableStream(<Component />);
      try {
        await lastValueFrom(pipeableStreamToObservable(stream));
      } catch (ex: any) {
        expect(ex.message).to.equal('Missing Subscribe!');
      }
      expect.assertions(1);
    });

    it("returns the default value if the observable didn't emit yet", async () => {
      const [useState] = bind(of(5), 3);
      const Component = () => {
        const value = useState();
        return <textlabel Text={Value: {value}} />;
      };
      const stream = renderToPipeableStream(<Component />);
      const result = await lastValueFrom(pipeableStreamToObservable(stream));

      expect(result).toEqual('<textlabel Text={'Value: <!-- -->3'} />');
    });
  });
  */
});
