import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { NEVER } from '@rbxts/rx';
import { state, withDefault } from '@rbxts/rx-state';

describe('withDefault', () => {
  it('makes a default state observable', () => {
    const result = state(NEVER).pipeState(withDefault('test'));

    expect(result.getDefaultValue()).toBe('test');
  });
});
