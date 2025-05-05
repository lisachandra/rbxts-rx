import { isValidDate } from 'internal/util/isDate';
import { TimestampProvider } from '../types';

interface DateTimestampProvider extends TimestampProvider {
  delegate: TimestampProvider | undefined;
}

export const dateTimestampProvider: DateTimestampProvider = {
  now() {
    // Use the variable rather than `this` so that the function can be called
    // without being bound to the provider.
    const now = (dateTimestampProvider.delegate || DateTime).now();
    return isValidDate(now) ? now.UnixTimestampMillis : now;
  },
  delegate: undefined,
};
