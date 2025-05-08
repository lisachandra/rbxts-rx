import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { defer, of } from '@rbxts/rx';
import { mergeMap } from '@rbxts/rx/out/operators';
import { TestScheduler } from '@rbxts/rx/out/testing';
import { observableMatcher } from '../helpers/observableMatcher';
import { Error } from '@rbxts/luau-polyfill';

/** @test {defer} */
describe('defer', () => {
  let rxTestScheduler: TestScheduler;

  beforeEach(() => {
    rxTestScheduler = new TestScheduler(observableMatcher);
  });

  it('should defer the creation of a simple Observable', () => {
    rxTestScheduler.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
      const expected = '-a--b--c--|';
      const e1 = defer(() => cold('-a--b--c--|'));
      expectObservable(e1).toBe(expected);
    });
  });

  it('should create an observable from the provided observable factory', () => {
    rxTestScheduler.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
      const source = hot('--a--b--c--|');
      const sourceSubs = '^----------!';
      const expected = '  --a--b--c--|';

      const e1 = defer(() => source);

      expectObservable(e1).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    });
  });

  it('should create an observable from completed', () => {
    rxTestScheduler.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
      const source = hot('|');
      const sourceSubs = '(^!)';
      const expected = '  |';

      const e1 = defer(() => source);

      expectObservable(e1).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    });
  });

  it('should accept factory returns promise resolves', (_, done) => {
    const expected = 42;
    const e1 = defer(() => {
      return new Promise<number>((resolve: any) => {
        resolve(expected);
      });
    });

    e1.subscribe({
      next: (x: number) => {
        expect(x).toEqual(expected);
        done();
      },
      error: (x: any) => {
        done(new Error('should not be called'));
      },
    });
  });

  it('should accept factory returns promise rejects', (_, done) => {
    const expected = 42;
    const e1 = defer(() => {
      return new Promise<number>((resolve: any, reject: any) => {
        reject(expected);
      });
    });

    e1.subscribe({
      next: (x: number) => {
        done(new Error('should not be called'));
      },
      error: (x: any) => {
        expect(x).toEqual(expected);
        done();
      },
      complete: () => {
        done(new Error('should not be called'));
      },
    });
  });

  it('should create an observable from error', () => {
    rxTestScheduler.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
      const source = hot('#');
      const sourceSubs = '(^!)';
      const expected = '  #';

      const e1 = defer(() => source);

      expectObservable(e1).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    });
  });

  it('should create an observable when factory does not throw', () => {
    rxTestScheduler.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
      const e1 = defer(() => {
        if (1 !== math.huge) {
          throw 'error';
        }
        return of();
      });
      const expected = '#';

      expectObservable(e1).toBe(expected);
    });
  });

  it('should error when factory throws', (_, done) => {
    const e1 = defer(() => {
      // eslint-disable-next-line no-constant-condition
      if (1 + 2 === 3) {
        throw 'error';
      }
      return of();
    });
    e1.subscribe({
      error: () => done(),
    });
  });

  it('should allow unsubscribing early and explicitly', () => {
    rxTestScheduler.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
      const source = hot('--a--b--c--|');
      const sourceSubs = '^-----!     ';
      const expected = '  --a--b-     ';
      const unsub = '     ------!     ';

      const e1 = defer(() => source);

      expectObservable(e1, unsub).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    });
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    rxTestScheduler.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
      const source = hot('--a--b--c--|');
      const sourceSubs = '^-----!     ';
      const expected = '  --a--b-     ';
      const unsub = '     ------!     ';

      const e1 = defer(() =>
        source.pipe(
          mergeMap((x: string) => of(x)),
          mergeMap((x: string) => of(x))
        )
      );

      expectObservable(e1, unsub).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    });
  });
});
