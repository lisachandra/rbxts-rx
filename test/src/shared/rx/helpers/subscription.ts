import { Error } from '@rbxts/luau-polyfill';
import { TeardownLogic } from '@rbxts/rx';

export function getRegisteredFinalizers(subscription: any): Exclude<TeardownLogic, void>[] {
  if ('_finalizers' in subscription) {
    return subscription._finalizers ?? [];
  } else {
    throw new Error('Invalid Subscription');
  }
}
