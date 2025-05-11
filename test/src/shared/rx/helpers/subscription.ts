import { Error } from '@rbxts/luau-polyfill';
import { Subscription, TeardownLogic } from '@rbxts/rx';
import { typeAssertIs } from './type';

export function getRegisteredFinalizers(subscription: any): Exclude<TeardownLogic, void>[] {
  typeAssertIs<Subscription>(subscription);
  if ('_finalizers' in subscription) {
    // @ts-expect-error
    return subscription._finalizers ?? [];
  } else {
    throw new Error('Invalid Subscription');
  }
}
