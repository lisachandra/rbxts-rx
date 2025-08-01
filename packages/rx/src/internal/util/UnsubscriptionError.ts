import { Error } from '@rbxts/luau-polyfill';
import { createErrorClass } from './createErrorClass';

export interface UnsubscriptionError extends Error {
  readonly errors: any[];
}

export interface UnsubscriptionErrorCtor {
  /**
   * @deprecated Internal implementation detail. Do not construct error instances.
   * Cannot be tagged as internal: https://github.com/ReactiveX/rxjs/issues/6269
   */
  new (errors: any[]): UnsubscriptionError;
}

/**
 * An error thrown when one or more errors have occurred during the
 * `unsubscribe` of a {@link Subscription}.
 */
export const UnsubscriptionError: UnsubscriptionErrorCtor = createErrorClass(
  (_super) =>
    function (this: any, errors: (Error | string)[]) {
      _super(this);
      this.message = errors
        ? `${errors.size()} errors occurred during unsubscription:
${errors.map((err, i) => `${i + 1}) ${err}`).join('\n  ')}`
        : '';
      this.name = 'UnsubscriptionError';
      this.errors = errors;
    }
);
