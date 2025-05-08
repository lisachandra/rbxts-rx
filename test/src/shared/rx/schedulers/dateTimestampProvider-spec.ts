import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { dateTimestampProvider } from '@rbxts/rx/out/internal/scheduler/dateTimestampProvider';

describe('dateTimestampProvider', () => {
  it('should be monkey patchable', () => {
    let nowCalled = false;

    dateTimestampProvider.delegate = {
      now() {
        nowCalled = true;
        return 0;
      },
    };

    dateTimestampProvider.now();

    expect(nowCalled).toBe(true);
  });
});
