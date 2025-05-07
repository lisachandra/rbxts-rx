import { clearTimeout, setTimeout } from '@rbxts/luau-polyfill';
import type { TimerHandle } from './timerHandle';
type SetTimeoutFunction = (handler: () => void, timeout?: number, ...args: any[]) => TimerHandle;
type ClearTimeoutFunction = (handle: TimerHandle) => void;

interface TimeoutProvider {
  setTimeout: SetTimeoutFunction;
  clearTimeout: ClearTimeoutFunction;
  delegate:
    | {
        setTimeout: SetTimeoutFunction;
        clearTimeout: ClearTimeoutFunction;
      }
    | undefined;
}

export const timeoutProvider: TimeoutProvider = {
  // When accessing the delegate, use the variable rather than `this` so that
  // the functions can be called without being bound to the provider.
  setTimeout(this: void, handler: () => void, timeout?: number, ...args: unknown[]) {
    const { delegate } = timeoutProvider;
    if (delegate?.setTimeout) {
      return delegate.setTimeout(handler, timeout, ...args);
    }
    return setTimeout<any[]>(handler, timeout, ...args);
  },
  clearTimeout(this: void, handle) {
    const { delegate } = timeoutProvider;
    return (delegate?.clearTimeout || clearTimeout)(handle as any);
  },
  delegate: undefined,
};
