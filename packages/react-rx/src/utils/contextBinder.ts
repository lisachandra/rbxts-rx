import { Observable } from '@rbxts/rx';
import { SUSPENSE } from '@rbxts/rx-state';
import { bind } from 'bind';

type SubstractTuples<A1, A2> = A2 extends [unknown, ...infer Rest2]
  ? A1 extends [unknown, ...infer Rest1]
    ? SubstractTuples<Rest1, Rest2>
    : []
  : A1;

const execSelf = <T>(fn: () => T) => fn();
const luaUnpack: Callback = getfenv(0)['unpack' as never];

/**
 * Returns a version of bind where its hook will have the first parameters bound
 * the results of the provided functions
 *
 * @param {...React.Context} context - The React.Context that should be bound to the hook.
 */
export function contextBinder<
  A extends (() => any)[],
  OT extends {
    [K in keyof A]: A[K] extends () => infer V ? V : unknown;
  },
>(
  ...args: A
): <AA extends any[], T, ARGS extends [...OT, ...AA]>(
  getObservable: (...args: ARGS) => Observable<T>,
  defaultValue?: T | undefined
) => [(...args: SubstractTuples<ARGS, OT>) => Exclude<T, typeof SUSPENSE>, (...args: ARGS) => Observable<T>];
export function contextBinder(...args: any[]) {
  const useArgs = () => (args as never as defined[]).map(execSelf as never);
  return function (...argument: any[]) {
    const [hook, getter] = bind(luaUnpack(argument));
    return [(...args: any[]) => (hook as Callback)(...[...useArgs(), ...(args as unknown[])]), getter];
  } as any;
}
