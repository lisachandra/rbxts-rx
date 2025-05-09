import { Observable } from '@rbxts/rx';
import type { withDefault as IWithDefault } from './types';
import { state } from './state';

export const withDefault: typeof IWithDefault =
  <D>(defaultValue: D) =>
  <T>(source: Observable<T>) =>
    state<D | T>(source, defaultValue);
