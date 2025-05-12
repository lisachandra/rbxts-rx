import { state as coreState, StateObservable } from '@rbxts/rx-state';
import React, { createElement, ReactElement } from '@rbxts/react';
import { useStateObservable } from './useStateObservable';
import { Object } from '@rbxts/luau-polyfill';
import { bind } from 'polyfill/bind';

declare module '@rbxts/rx-state' {
  interface StateObservable<T> extends ReactElement {}
}

export const state: typeof coreState = (...args: any[]): any => {
  const result = (coreState as Callback)(...(args as defined[]));

  if (typeIs(result, 'function')) {
    return (...args: defined[]) => enhanceState(result(...args));
  }
  return enhanceState(result);
};

const cache = new WeakMap<StateObservable<any>, React.ReactNode>();
function enhanceState<T>(state: StateObservable<T>) {
  if (!cache.has(state))
    cache.set(
      state,
      createElement(() => useStateObservable(state) as any, {})
    );

  const originalPipeState = bind(true, state.pipeState, state);
  return Object.assign(state, cache.get(state)!, {
    pipeState: (...operators: unknown[]) => enhanceState((originalPipeState as Callback)(...operators)),
  });
}
