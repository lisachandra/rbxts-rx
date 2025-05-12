import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { Observable, isObservable } from '@rbxts/rx';

describe('isObservable', () => {
  it('should return true for RxJS Observable', () => {
    const o = new Observable<any>();
    expect(isObservable(o)).toBe(true);
  });

  it('should return true for an observable that comes from another RxJS 5+ library', () => {
    const o: any = {
      lift() {
        /* noop */
      },
      subscribe() {
        /* noop */
      },
    };

    expect(isObservable(o)).toBe(true);
  });

  it('should NOT return true for any old subscribable', () => {
    const o: any = {
      subscribe() {
        /* noop */
      },
    };

    expect(isObservable(o)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isObservable(undefined)).toBe(false);
  });

  it('should return false for a number', () => {
    expect(isObservable(1)).toBe(false);
  });
});
