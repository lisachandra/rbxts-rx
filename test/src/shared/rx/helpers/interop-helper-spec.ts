import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { Observable, of, Subscriber, observable as symbolObservable } from '@rbxts/rx';
import { asInteropObservable, asInteropSubscriber } from './interop-helper';

describe('interop helper', () => {
  it('should simulate interop observables', () => {
    const observable: any = asInteropObservable(of(42));
    expect(observable).never.toBeInstanceOf(Observable);
    expect(type(observable[symbolObservable])).toBe('function');
  });

  it('should simulate interop subscribers', () => {
    const subscriber: any = asInteropSubscriber(new Subscriber());
    expect(subscriber).never.toBeInstanceOf(Subscriber);
  });
});
