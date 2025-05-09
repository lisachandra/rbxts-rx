import type { StatePromise as IStatePromise } from './types';

export class StatePromise<T> extends Promise<T> implements IStatePromise<T> {
  constructor(cb: (res: (value: T) => void, rej: any) => void) {
    super(cb);
  }
}
