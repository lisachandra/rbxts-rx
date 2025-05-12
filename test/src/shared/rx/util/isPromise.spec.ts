import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { of } from '@rbxts/rx';

import { isPromise } from '@rbxts/rx/out/internal/util/isPromise';

describe('isPromise', () => {
  it('should return true for new Promise', () => {
    const o = new Promise<any>(() => undefined);
    expect(isPromise(o)).toBe(true);
  });

  it('should return true for a Promise that comes from an Observable', () => {
    const o: any = of(undefined).toPromise();
    expect(isPromise(o)).toBe(true);
  });

  it('should NOT return true for any Observable', () => {
    const o: any = of(undefined);

    expect(isPromise(o)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isPromise(undefined)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isPromise(undefined)).toBe(false);
  });

  it('should return false for a number', () => {
    expect(isPromise(1)).toBe(false);
  });

  it('should return false for a string', () => {
    expect(isPromise('1')).toBe(false);
  });
});
