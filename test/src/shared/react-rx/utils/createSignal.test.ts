import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { Error, Array, Object, setTimeout, setInterval, clearTimeout, clearInterval } from '@rbxts/luau-polyfill';
import { createSignal, createListener } from '@rbxts/react-rx/out/utils';

describe('createSignal', () => {
  it('receives an "event creator" and it returns a tuple with an observable and its corresponding event-emitter', () => {
    const [fooBar0, onFooBar] = createSignal((foo: number, bar: string) => ({
      foo,
      bar,
    }));
    let receivedValue;
    fooBar0.subscribe((val) => {
      receivedValue = val;
    });
    expect(receivedValue).toBe(undefined);
    onFooBar(0, '1');
    expect(receivedValue).toEqual({ foo: 0, bar: '1' });
  });
  it('returns a tuple with a typed observable and its corresponding event-emitter when no "event creator" is provided', () => {
    const [foo0, onFoo] = createSignal<string>();
    let receivedValue;
    foo0.subscribe((val) => {
      receivedValue = val;
    });
    expect(receivedValue).toBe(undefined);
    onFoo('foo');
    expect(receivedValue).toEqual('foo');
  });
  it('returns a tuple with a void observable and its corresponding event-emitter when no "event creator" and no type is provided', () => {
    const [clicks0, onClick] = createListener();
    let count = 0;
    clicks0.subscribe(() => {
      count++;
    });
    expect(count).toBe(0);
    onClick();
    expect(count).toBe(1);
  });
});
