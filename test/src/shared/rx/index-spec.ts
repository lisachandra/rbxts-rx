import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import * as index from '@rbxts/rx';

describe('index', () => {
  it('should export Observable', () => {
    expect(index.Observable).toBeDefined();
    expect(index.ConnectableObservable).toBeDefined();
    // Interfaces can be checked by creating a variable of that type
    let operator: index.Operator<any, any>;
  });

  it('should export the Subject types', () => {
    expect(index.Subject).toBeDefined();
    expect(index.BehaviorSubject).toBeDefined();
    expect(index.ReplaySubject).toBeDefined();
    expect(index.AsyncSubject).toBeDefined();
  });

  it('should export the schedulers', () => {
    expect(index.asapScheduler).toBeDefined();
    expect(index.asyncScheduler).toBeDefined();
    expect(index.queueScheduler).toBeDefined();
    expect(index.animationFrameScheduler).toBeDefined();
    expect(index.VirtualTimeScheduler).toBeDefined();
    expect(index.VirtualAction).toBeDefined();
  });

  it('should export Subscription', () => {
    expect(index.Subscription).toBeDefined();
    expect(index.Subscriber).toBeDefined();
  });

  it('should export Notification', () => {
    expect(index.Notification).toBeDefined();
  });

  it('should export the appropriate utilities', () => {
    expect(index.pipe).toBeDefined();
    expect(index.noop).toBeDefined();
    expect(index.identity).toBeDefined();
  });

  it('should export error types', () => {
    expect(index.ArgumentOutOfRangeError).toBeDefined();
    expect(index.EmptyError).toBeDefined();
    expect(index.ObjectUnsubscribedError).toBeDefined();
    expect(index.UnsubscriptionError).toBeDefined();
    expect(index.TimeoutError).toBeDefined();
  });

  it('should export constants', () => {
    expect(index.EMPTY).toBeDefined();
    expect(index.NEVER).toBeDefined();
  });

  it('should export static observable creator functions', () => {
    expect(index.bindCallback).toBeDefined();
    expect(index.bindNodeCallback).toBeDefined();
    expect(index.combineLatest).toBeDefined();
    expect(index.concat).toBeDefined();
    expect(index.defer).toBeDefined();
    expect(index.empty).toBeDefined();
    expect(index.forkJoin).toBeDefined();
    expect(index.from).toBeDefined();
    expect(index.fromEvent).toBeDefined();
    expect(index.fromEventPattern).toBeDefined();
    expect(index.generate).toBeDefined();
    expect(index.iif).toBeDefined();
    expect(index.interval).toBeDefined();
    expect(index.merge).toBeDefined();
    expect(index.of).toBeDefined();
    expect(index.onErrorResumeNext).toBeDefined();
    expect(index.pairs).toBeDefined();
    expect(index.race).toBeDefined();
    expect(index.range).toBeDefined();
    expect(index.throwError).toBeDefined();
    expect(index.timer).toBeDefined();
    expect(index.using).toBeDefined();
    expect(index.zip).toBeDefined();
  });

  it('should export all of the operators', () => {
    expect(index.audit).toBeDefined();
    expect(index.auditTime).toBeDefined();
    expect(index.buffer).toBeDefined();
    expect(index.bufferCount).toBeDefined();
    expect(index.bufferTime).toBeDefined();
    expect(index.bufferToggle).toBeDefined();
    expect(index.bufferWhen).toBeDefined();
    expect(index.catchError).toBeDefined();
    expect(index.combineAll).toBeDefined();
    expect(index.combineLatestAll).toBeDefined();
    expect(index.combineLatestWith).toBeDefined();
    expect(index.concatAll).toBeDefined();
    expect(index.concatMap).toBeDefined();
    expect(index.concatMapTo).toBeDefined();
    expect(index.concatWith).toBeDefined();
    expect(index.connect).toBeDefined();
    expect(index.count).toBeDefined();
    expect(index.debounce).toBeDefined();
    expect(index.debounceTime).toBeDefined();
    expect(index.defaultIfEmpty).toBeDefined();
    expect(index.delay).toBeDefined();
    expect(index.delayWhen).toBeDefined();
    expect(index.dematerialize).toBeDefined();
    expect(index.distinct).toBeDefined();
    expect(index.distinctUntilChanged).toBeDefined();
    expect(index.distinctUntilKeyChanged).toBeDefined();
    expect(index.elementAt).toBeDefined();
    expect(index.endWith).toBeDefined();
    expect(index.every).toBeDefined();
    expect(index.exhaust).toBeDefined();
    expect(index.exhaustAll).toBeDefined();
    expect(index.exhaustMap).toBeDefined();
    expect(index.expand).toBeDefined();
    expect(index.filter).toBeDefined();
    expect(index.finalize).toBeDefined();
    expect(index.find).toBeDefined();
    expect(index.findIndex).toBeDefined();
    expect(index.first).toBeDefined();
    expect(index.groupBy).toBeDefined();
    expect(index.ignoreElements).toBeDefined();
    expect(index.isEmpty).toBeDefined();
    expect(index.last).toBeDefined();
    expect(index.map).toBeDefined();
    expect(index.mapTo).toBeDefined();
    expect(index.materialize).toBeDefined();
    expect(index.max).toBeDefined();
    expect(index.mergeAll).toBeDefined();
    expect(index.flatMap).toBeDefined();
    expect(index.mergeMap).toBeDefined();
    expect(index.mergeMapTo).toBeDefined();
    expect(index.mergeScan).toBeDefined();
    expect(index.mergeWith).toBeDefined();
    expect(index.min).toBeDefined();
    expect(index.multicast).toBeDefined();
    expect(index.observeOn).toBeDefined();
    expect(index.pairwise).toBeDefined();
    expect(index.pluck).toBeDefined();
    expect(index.publish).toBeDefined();
    expect(index.publishBehavior).toBeDefined();
    expect(index.publishLast).toBeDefined();
    expect(index.publishReplay).toBeDefined();
    expect(index.raceWith).toBeDefined();
    expect(index.reduce).toBeDefined();
    expect(index.repeat).toBeDefined();
    expect(index.repeatWhen).toBeDefined();
    expect(index.retry).toBeDefined();
    expect(index.retryWhen).toBeDefined();
    expect(index.refCount).toBeDefined();
    expect(index.sample).toBeDefined();
    expect(index.sampleTime).toBeDefined();
    expect(index.scan).toBeDefined();
    expect(index.sequenceEqual).toBeDefined();
    expect(index.share).toBeDefined();
    expect(index.shareReplay).toBeDefined();
    expect(index.single).toBeDefined();
    expect(index.skip).toBeDefined();
    expect(index.skipLast).toBeDefined();
    expect(index.skipUntil).toBeDefined();
    expect(index.skipWhile).toBeDefined();
    expect(index.startWith).toBeDefined();
    expect(index.subscribeOn).toBeDefined();
    expect(index.switchAll).toBeDefined();
    expect(index.switchMap).toBeDefined();
    expect(index.switchMapTo).toBeDefined();
    expect(index.switchScan).toBeDefined();
    expect(index.take).toBeDefined();
    expect(index.takeLast).toBeDefined();
    expect(index.takeUntil).toBeDefined();
    expect(index.takeWhile).toBeDefined();
    expect(index.tap).toBeDefined();
    expect(index.throttle).toBeDefined();
    expect(index.throttleTime).toBeDefined();
    expect(index.throwIfEmpty).toBeDefined();
    expect(index.timeInterval).toBeDefined();
    expect(index.timeout).toBeDefined();
    expect(index.timeoutWith).toBeDefined();
    expect(index.timestamp).toBeDefined();
    expect(index.toArray).toBeDefined();
    expect(index.window).toBeDefined();
    expect(index.windowCount).toBeDefined();
    expect(index.windowTime).toBeDefined();
    expect(index.windowToggle).toBeDefined();
    expect(index.windowWhen).toBeDefined();
    expect(index.withLatestFrom).toBeDefined();
    expect(index.zipAll).toBeDefined();
    expect(index.zipWith).toBeDefined();
    expect(index.fromEvent).toBeDefined();
  });

  it('should expose configuration', () => {
    expect(index.config).toBeDefined();
  });
});
