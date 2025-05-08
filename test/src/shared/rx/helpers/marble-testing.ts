import { Observable } from '@rbxts/rx';
import { SubscriptionLog } from '@rbxts/rx/out/internal/testing/SubscriptionLog';
import { ColdObservable } from '@rbxts/rx/out/internal/testing/ColdObservable';
import { HotObservable } from '@rbxts/rx/out/internal/testing/HotObservable';
import { observableToBeFn, subscriptionLogsToBeFn, TestScheduler } from '@rbxts/rx/out/internal/testing/TestScheduler';

declare global {
  interface _G {
    rxTestScheduler?: TestScheduler;
  }
}

export function hot<V>(marbles: string, values?: { [index: string]: V }, err?: any): HotObservable<V>;
export function hot<V>(marbles: string, values?: { [index: string]: V }, err?: any): HotObservable<any> {
  if (!_G.rxTestScheduler) {
    throw 'tried to use hot() in async test';
  }
  return _G.rxTestScheduler.createHotObservable(marbles, values, err);
}

export function cold(marbles: string, values?: void, error?: any): ColdObservable<string>;
export function cold<V>(marbles: string, values?: { [index: string]: V }, error?: any): ColdObservable<V>;
export function cold(marbles: string, values?: any, err?: any): ColdObservable<any> {
  if (!_G.rxTestScheduler) {
    throw 'tried to use cold() in async test';
  }
  return _G.rxTestScheduler.createColdObservable(marbles, values, err);
}

export function expectObservable(
  observable: Observable<any>,
  unsubscriptionMarbles: string | undefined = undefined
): { toBe: observableToBeFn } {
  if (!_G.rxTestScheduler) {
    throw 'tried to use expectObservable() in async test';
  }
  return _G.rxTestScheduler.expectObservable(observable, unsubscriptionMarbles);
}

export function expectSubscriptions(actualSubscriptionLogs: SubscriptionLog[]): { toBe: subscriptionLogsToBeFn } {
  if (!_G.rxTestScheduler) {
    throw 'tried to use expectSubscriptions() in async test';
  }
  return _G.rxTestScheduler.expectSubscriptions(actualSubscriptionLogs);
}

export function time(marbles: string): number {
  if (!_G.rxTestScheduler) {
    throw 'tried to use time() in async test';
  }
  return _G.rxTestScheduler.createTime(marbles);
}
