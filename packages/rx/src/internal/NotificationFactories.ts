import type { CompleteNotification, NextNotification, ErrorNotification } from './types';

/**
 * Ensures that all notifications created internally have the same "shape" in v8.
 *
 * TODO: This is only exported to support a crazy legacy test in `groupBy`.
 * @internal
 */
export function createNotification(kind: 'N' | 'E' | 'C', value: any, err: any) {
  return {
    kind,
    value,
    error: err,
  };
}

/**
 * A completion object optimized for memory use and created to be the
 * same "shape" as other notifications in v8.
 * @internal
 */
export const COMPLETE_NOTIFICATION = (() => createNotification('C', undefined, undefined) as CompleteNotification)();

/**
 * Internal use only. Creates an optimized error notification that is the same "shape"
 * as other notifications.
 * @internal
 */
export function errorNotification(err: any): ErrorNotification {
  return createNotification('E', undefined, err) as any;
}

/**
 * Internal use only. Creates an optimized next notification that is the same "shape"
 * as other notifications.
 * @internal
 */
export function nextNotification<T>(value: T) {
  return createNotification('N', value, undefined) as NextNotification<T>;
}
