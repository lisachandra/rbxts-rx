import { Observable } from '@rbxts/rx';
import StateObservable from '../internal/state-observable';
import { Array } from '@rbxts/luau-polyfill';
import { typeAssertIs } from 'polyfill/type';

function cloneProps<T>(internal: StateObservable<T>, external: StateObservable<T>) {
  external.getValue = internal.getValue;
  external.getRefCount = internal.getRefCount;
  external.pipeState = internal.pipeState;
  typeAssertIs<{ getDefaultValue?: unknown }>(internal);
  typeAssertIs<{ getDefaultValue?: unknown }>(internal);
  if (internal.getDefaultValue) {
    external.getDefaultValue = internal.getDefaultValue;
  }
}

export default function connectFactoryObservable<A extends [], O>(
  getObservable: (...args: A) => Observable<O>,
  defaultValue: O | ((...args: A) => O)
) {
  const cache = new NestedMap<A, StateObservable<O>>();
  const getDefaultValue = (typeIs(defaultValue, 'function') ? defaultValue : () => defaultValue) as (...args: A) => O;

  const getSharedObservables = (input: A): StateObservable<O> => {
    for (let i = input.size() - 1; input[i] === undefined && i > -1; i--) {
      Array.splice(input, -1);
    }
    const keys = [input.size(), ...input] as any as A;
    const cachedVal = cache.get(keys);

    if (cachedVal !== undefined) {
      return cachedVal;
    }

    const sharedObservable = new StateObservable(getObservable(...input), getDefaultValue(...input), () => {
      cache.delete(keys);
    });

    const publicShared = new Observable<O>(function (subscriber) {
      const inCache = cache.get(keys);
      let source: StateObservable<O> = sharedObservable;

      if (!inCache) {
        cache.set(keys, result);
      } else if (inCache !== publicShared) {
        source = inCache;
        cloneProps(source, publicShared);
      }

      return source.subscribe(subscriber);
    }) as StateObservable<O>;
    cloneProps(sharedObservable, publicShared);

    const result: StateObservable<O> = publicShared;

    cache.set(keys, result);
    return result;
  };

  return (...input: A) => getSharedObservables(input);
}

class NestedMap<K extends [], V extends object> {
  private root: Map<K, any>;
  constructor() {
    this.root = new Map();
  }

  get(keys: K[]): V | undefined {
    let current = this.root;
    for (let i = 0; i < keys.size(); i++) {
      current = current.get(keys[i]);
      if (!current) return undefined;
    }
    return current as V;
  }

  set(keys: K[], value: V): void {
    let current: Map<K, any> = this.root;
    let i;
    for (i = 0; i < keys.size() - 1; i++) {
      let nextCurrent: Map<K, any> = current.get(keys[i]) as never;
      if (!nextCurrent) {
        nextCurrent = new Map<K, any>();
        current.set(keys[i], nextCurrent);
      }
      current = nextCurrent;
    }
    current.set(keys[i], value);
  }

  delete(keys: K[]): void {
    const maps: Map<K, any>[] = [this.root];
    let current: Map<K, any> = this.root;

    for (let i = 0; i < keys.size(); i++) {
      maps.push((current = current.get(keys[i]) as never));
    }

    let mapIdx = maps.size() - 1;
    maps[mapIdx].delete(keys[mapIdx]);

    while (--mapIdx > -1 && (maps[mapIdx].get(keys[mapIdx]) as Map<K, any>).size() === 0) {
      maps[mapIdx].delete(keys[mapIdx]);
    }
  }
}
