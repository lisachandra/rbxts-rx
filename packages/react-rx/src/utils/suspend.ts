import { ObservableInput, from, Observable } from '@rbxts/rx';
import { defaultStart } from './internal-utils';
import { SUSPENSE } from '@rbxts/rx-state';

/**
 * A RxJS creation operator that prepends a SUSPENSE on the source observable.
 *
 * @param source Source observable
 */
export const suspend: <T>(source$: ObservableInput<T>) => Observable<T | typeof SUSPENSE> = <T>(source: ObservableInput<T>) =>
  defaultStart(SUSPENSE)(from(source)) as any;
