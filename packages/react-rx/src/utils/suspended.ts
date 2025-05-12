import { SUSPENSE } from '@rbxts/rx-state';
import { suspend } from './suspend';
import { OperatorFunction } from '@rbxts/rx';

/**
 * A RxJS pipeable operator that prepends a SUSPENSE on the source observable.
 */
export const suspended = <T>(): OperatorFunction<T, T | typeof SUSPENSE> => suspend;
