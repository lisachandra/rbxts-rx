import { Object } from '@rbxts/luau-polyfill';

let nextHandle = 1;
// The promise needs to be created lazily otherwise it won't be patched by Zones
let resolved: Promise<any>;
const activeHandles: { [key: number]: any } = {};

/**
 * Finds the handle in the list of active handles, and removes it.
 * Returns `true` if found, `false` otherwise. Used both to clear
 * Immediate scheduled tasks, and to identify if a task should be scheduled.
 */
function findAndClearHandle(handle: number): boolean {
  if (handle in activeHandles) {
    delete activeHandles[handle];
    return true;
  }
  return false;
}

/**
 * Helper functions to schedule and unschedule microtasks.
 */
export const Immediate = {
  setImmediate(this: void, cb: () => void): number {
    const handle = nextHandle++;
    activeHandles[handle] = true;
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    if (!resolved) {
      resolved = Promise.resolve();
    }
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    resolved.then(() => findAndClearHandle(handle) && cb());
    return handle;
  },

  clearImmediate(this: void, handle: number): void {
    findAndClearHandle(handle);
  },
};

/**
 * Used for internal testing purposes only. Do not export from library.
 */
export const TestTools = {
  pending(this: void) {
    return Object.keys(activeHandles).size();
  },
};
