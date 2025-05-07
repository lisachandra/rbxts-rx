import { is } from 'internal/polyfill/type';
import { SchedulerLike } from '../types';
import { isFunction } from './isFunction';
import { isScheduler } from './isScheduler';

function last<T>(arr: T[]): T | undefined {
  return arr[arr.size() - 1];
}

export function popResultSelector(args: any[]): ((...args: unknown[]) => unknown) | undefined {
  return isFunction(last(args)) && is<never[]>(args) ? args.pop() : undefined;
}

export function popScheduler(args: any[]): SchedulerLike | undefined {
  return isScheduler(last(args)) && is<never[]>(args) ? args.pop() : undefined;
}

export function popNumber(args: any[], defaultValue: number): number {
  return typeIs(last(args), 'number') && is<never[]>(args) ? args.pop()! : defaultValue;
}
