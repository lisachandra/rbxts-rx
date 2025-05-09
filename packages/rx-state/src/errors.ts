import { Error } from '@rbxts/luau-polyfill';
import type { NoSubscribersError as INoSubscribersError, EmptyObservableError as IEmptyObservableError } from './types';

export class NoSubscribersError extends Error implements INoSubscribersError {
  constructor() {
    super();
    this.name = 'NoSubscribersError';
  }
}

export class EmptyObservableError extends Error implements IEmptyObservableError {
  constructor() {
    super();
    this.name = 'EmptyObservableError';
  }
}
