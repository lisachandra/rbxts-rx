import { is } from 'internal/polyfill/type';
import { ReadableStreamLike } from '../types';
import { isFunction } from './isFunction';

// @ts-expect-error
export function* readableStreamLikeToAsyncGenerator<T>(readableStream: ReadableStreamLike<T>): AsyncGenerator<T> {
  const reader = readableStream.getReader();
  try {
    while (true) {
      const { value, done } = reader.read().expect();
      if (done) {
        return;
      }
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

export function isReadableStreamLike<T>(obj: any): obj is ReadableStreamLike<T> {
  // We don't want to use instanceof checks because they would return
  // false for instances from another Realm, like an <iframe>.
  return typeIs(obj, 'table') && is<{ [K: string]: unknown }>(obj) && isFunction(obj?.getReader);
}
