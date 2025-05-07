import { is } from 'internal/polyfill/type';
import { SchedulerLike } from '../types';
import { isFunction } from './isFunction';

export function isScheduler(value: unknown): value is SchedulerLike {
  return typeIs(value, 'table') && is<{ [K: string]: unknown }>(value) && isFunction(value.schedule);
}
