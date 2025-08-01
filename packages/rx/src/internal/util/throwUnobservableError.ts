import { Error } from '@rbxts/luau-polyfill';

/**
 * Creates the TypeError to throw if an invalid object is passed to `from` or `scheduled`.
 * @param input The object that was passed.
 */
export function createInvalidObservableTypeError(input: unknown) {
  // TODO: We should create error codes that can be looked up, so this can be less verbose.
  return new Error(
    `You provided ${
      input !== undefined && typeIs(input, 'table') ? 'an invalid object' : `'${input}'`
    } where a stream was expected. You can provide an Observable, Promise, ReadableStream, Array, AsyncIterable, or Iterable.`
  );
}
