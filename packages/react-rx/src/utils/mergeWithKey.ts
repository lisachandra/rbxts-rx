import { Array, Object } from '@rbxts/luau-polyfill';
import { merge, Observable, ObservableInput, from, SchedulerLike } from '@rbxts/rx';
import { map } from '@rbxts/rx/out/operators';

/**
 * Emits the values from all the streams of the provided object, in a result
 * which provides the key of the stream of that emission.
 *
 * @param input object of streams
 */
export const mergeWithKey: <
  O extends { [P in keyof any]: ObservableInput<any> },
  OT extends {
    [K in keyof O]: O[K] extends ObservableInput<infer V> ? { type: K; payload: V } : unknown;
  },
>(
  x: O,
  concurrent?: number,
  scheduler?: SchedulerLike
) => Observable<OT[keyof O]> = (input, ...optionalArgs) =>
  merge<any[]>(
    ...(Array.concat(
      Object.entries(input).map(([kind, stream]) => from(stream as never).pipe(map((payload) => ({ type: kind, payload }) as any)) as any),
      optionalArgs
    ) as SchedulerLike[])
  );
