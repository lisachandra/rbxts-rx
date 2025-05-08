import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { of, EMPTY, throwError, config } from '@rbxts/rx';
import { Error } from '@rbxts/luau-polyfill';

/** @test {toPromise} */
describe('Observable.toPromise', () => {
  it('should convert an Observable to a promise of its last value', (_, done) => {
    of(1, 2, 3)
      .toPromise(Promise)
      .then((x) => {
        expect(x).toEqual(3);
        done();
      });
  });

  it('should convert an empty Observable to a promise of undefined', (_, done) => {
    EMPTY.toPromise(Promise).then((x) => {
      expect(x).toBeUndefined();
      done();
    });
  });

  it('should handle errors properly', (_, done) => {
    throwError(() => 'bad')
      .toPromise(Promise)
      .then(
        () => {
          done(new Error('should not be called'));
        },
        (err: any) => {
          expect(err).toEqual('bad');
          done();
        }
      );
  });

  it('should allow for global config via config.Promise', async () => {
    try {
      let wasCalled = false;
      function MyPromise(callback: Callback) {
        wasCalled = true;
        return new Promise(callback as any);
      }
      config.Promise = MyPromise as any;

      const x = await of(42).toPromise();
      expect(wasCalled).toBe(true);
      expect(x).toEqual(42);
    } finally {
      config.Promise = undefined;
    }
  });
});
