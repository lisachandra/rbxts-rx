import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { animationFrameProvider } from '@rbxts/rx/out/internal/scheduler/animationFrameProvider';

describe('animationFrameProvider', () => {
  it('should be monkey patchable', () => {
    let requestCalled = false;
    let cancelCalled = false;

    animationFrameProvider.delegate = {
      requestAnimationFrame: () => {
        requestCalled = true;
        return 0;
      },
      cancelAnimationFrame: () => {
        cancelCalled = true;
      },
    };

    const handle = animationFrameProvider.requestAnimationFrame(() => {
      /* noop */
    })!;
    animationFrameProvider.cancelAnimationFrame(handle);

    expect(requestCalled).toBe(true);
    expect(cancelCalled).toBe(true);
  });
});
