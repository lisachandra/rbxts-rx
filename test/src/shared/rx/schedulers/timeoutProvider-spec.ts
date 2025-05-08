import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { timeoutProvider } from '@rbxts/rx/out/internal/scheduler/timeoutProvider';

describe('timeoutProvider', () => {
  it('should be monkey patchable', () => {
    let setCalled = false;
    let clearCalled = false;

    timeoutProvider.delegate = {
      setTimeout: (() => {
        setCalled = true;
        return 0 as any;
      }) as any,
      clearTimeout: () => {
        clearCalled = true;
      },
    };

    const handle = timeoutProvider.setTimeout(() => {
      /* noop */
    });
    timeoutProvider.clearTimeout(handle);

    expect(setCalled).toBe(true);
    expect(clearCalled).toBe(true);
  });
});
