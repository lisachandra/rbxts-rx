import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { Error, Array, Object, setTimeout, setInterval, clearTimeout, clearInterval } from '@rbxts/luau-polyfill';
import { asapScheduler, map, observeOn, of, Subject } from '@rbxts/rx';
import { TestScheduler } from '@rbxts/rx/out/testing';
import { KeyChanges, toKeySet } from '@rbxts/react-rx/out/utils';

const scheduler = () =>
  new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected);
  });

describe('toKeySet', () => {
  it('transforms key changes to a Set', () => {
    scheduler().run(({ expectObservable, cold }) => {
      const expectedStr = '                     xe--f-g--h#';
      const source0 = cold<KeyChanges<string>>('-a--b-c--d#', {
        a: {
          type: 'add',
          keys: ['a', 'b'],
        },
        b: {
          type: 'remove',
          keys: ['b', 'c'],
        },
        c: {
          type: 'add',
          keys: ['c'],
        },
        d: {
          type: 'remove',
          keys: ['a'],
        },
      });

      const result0 = source0.pipe(
        toKeySet(),
        map((s) => Object.keys(s))
      );

      expectObservable(result0).toBe(expectedStr, {
        x: [],
        e: ['a', 'b'],
        f: ['a'],
        g: ['a', 'c'],
        h: ['c'],
      });
    });
  });

  it('emits synchronously on the first subscribe if it receives a synchronous change', () => {
    const emissions: string[][] = [];
    of<KeyChanges<string>>({
      type: 'add',
      keys: ['a', 'b'],
    })
      .pipe(toKeySet())
      .subscribe((next0) => emissions.push(Object.keys(next0)));

    expect(emissions.size()).toBe(1);
    expect(emissions[0]).toEqual(['a', 'b']);
  });

  it("emits synchronously an empty Set if it doesn't receive a synchronous change", () => {
    const emissions: string[][] = [];
    of<KeyChanges<string>>({
      type: 'add',
      keys: ['a', 'b'],
    })
      .pipe(observeOn(asapScheduler), toKeySet())
      .subscribe((next0) => emissions.push(Object.keys(next0)));

    expect(emissions.size()).toBe(1);
    expect(emissions[0]).toEqual([]);
  });

  it('resets the Set after unsubscribing', () => {
    const input0 = new Subject<KeyChanges<string>>();
    const result0 = input0.pipe(toKeySet());

    let emissions: string[][] = [];
    let sub = result0.subscribe((v) => emissions.push(Object.keys(v)));
    input0.next({
      type: 'add',
      keys: ['a'],
    });
    expect(emissions.size()).toBe(2); // [0] is initial empty []
    expect(emissions[1]).toEqual(['a']);
    sub.unsubscribe();

    emissions = [];
    sub = result0.subscribe((v) => emissions.push(Object.keys(v)));
    input0.next({
      type: 'add',
      keys: ['b'],
    });
    expect(emissions.size()).toBe(2); // [0] is initial empty []
    expect(emissions[1]).toEqual(['b']);
    sub.unsubscribe();
  });
});
