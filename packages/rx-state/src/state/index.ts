import type { state as IState } from '../types';
import { EMPTY_VALUE } from '../internal/empty-value';
import stateFactory from './stateFactory';
import stateSingle from './stateSingle';

export const state: typeof IState = (...args: defined[]) =>
  (typeIs(args[0], 'function') ? (stateFactory as Callback) : stateSingle)(args[0], args.size() > 1 ? args[1] : EMPTY_VALUE);
