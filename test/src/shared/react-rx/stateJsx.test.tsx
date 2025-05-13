import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { Error, Array, Object, setTimeout, setInterval, clearTimeout, clearInterval } from '@rbxts/luau-polyfill';
import { render, screen, act } from '@rbxts/react-testing-library';
import React, { Suspense } from '@rbxts/react';
import { map, Subject } from '@rbxts/rx';

import { state } from '@rbxts/react-rx';

describe('stateJsx', () => {
  it('is possible to use StateObservables as JSX elements', async () => {
    const subject = new Subject<string>();
    const state0 = state(subject);
    const subscription = state0.subscribe();

    render(<Suspense fallback={<textlabel Text="Waiting" />}>{state0}</Suspense>);

    expect(screen.queryByText('Result')).toBeNull();
    expect(screen.queryByText('Waiting')).never.toBeNull();

    await act(() => {
      subject.next('Result');
      return Promise.resolve();
    });

    expect(screen.queryByText('Result')).never.toBeNull();
    expect(screen.queryByText('Waiting')).toBeNull();
    subscription.unsubscribe();
  });

  it('is possible to use factory StateObservables as JSX elements', async () => {
    const subject = new Subject<string>();
    const state0 = state((value: string) => subject.pipe(map((x) => value + x)));

    const subscription = state0('hello ').subscribe();

    render(<Suspense fallback={<textlabel Text="Waiting" />}>{state0('hello ')}</Suspense>);

    expect(screen.queryByText('hello world!')).toBeNull();
    expect(screen.queryByText('Waiting')).never.toBeNull();

    await act(() => {
      subject.next('world!');
      return Promise.resolve();
    });

    expect(screen.queryByText('hello world!')).never.toBeNull();
    expect(screen.queryByText('Waiting')).toBeNull();
    subscription.unsubscribe();
  });

  it('enhances the result of a pipeState to be used as a JSX element', async () => {
    const subject = new Subject<string>();
    const state0 = state(subject);

    const derivedState0 = state0.pipeState(map((v) => `derived ${v}`));
    const derivedTwiceState0 = derivedState0.pipeState(map((v) => `${v} again`));
    const subscription = derivedTwiceState0.subscribe();

    render(
      <Suspense fallback={<textlabel Text="Waiting" />}>
        <textlabel Text={`${derivedState0}, ${derivedTwiceState0}`} />
      </Suspense>
    );

    expect(screen.queryByText('Waiting')).never.toBeNull();

    await act(() => {
      subject.next('Result');
      return Promise.resolve();
    });

    expect(screen.queryByText('derived Result, derived Result again')).never.toBeNull();
    expect(screen.queryByText('Waiting')).toBeNull();
    subscription.unsubscribe();
  });
});
