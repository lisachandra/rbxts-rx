import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { intervalProvider } from '@rbxts/rx/out/internal/scheduler/intervalProvider';

describe('intervalProvider', () => {
  it('should be monkey patchable', () => {
    let setCalled = false;
    let clearCalled = false;

    intervalProvider.delegate = {
      setInterval: (() => {
        setCalled = true;
        return 0 as any;
      }) as any, // TypeScript complains about a __promisify__ property
      clearInterval: () => {
        clearCalled = true;
      },
    };

    const handle = intervalProvider.setInterval(() => {
      /* noop */
    });
    intervalProvider.clearInterval(handle);

    expect(setCalled).toBe(true);
    expect(clearCalled).toBe(true);
  });
});
