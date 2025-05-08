import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import * as index from '@rbxts/rx/out/testing';

describe('index', () => {
  it('should export TestScheduler', () => {
    expect(index.TestScheduler).toBeDefined();
  });
});
