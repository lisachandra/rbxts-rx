import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { Error, setTimeout } from '@rbxts/luau-polyfill';
import { Observable, UnsubscriptionError, Subscription, merge } from '@rbxts/rx';

/** @test {Subscription} */
describe('Subscription', () => {
  describe('add()', () => {
    it('should unsubscribe child subscriptions', () => {
      const main = new Subscription();

      let isCalled = false;
      const child = new Subscription(() => {
        isCalled = true;
      });
      main.add(child);
      main.unsubscribe();

      expect(isCalled).toEqual(true);
    });

    it('should unsubscribe child subscriptions if it has already been unsubscribed', () => {
      const main = new Subscription();
      main.unsubscribe();

      let isCalled = false;
      const child = new Subscription(() => {
        isCalled = true;
      });
      main.add(child);

      expect(isCalled).toEqual(true);
    });

    it('should unsubscribe a finalizer function that was passed', () => {
      let isCalled = false;
      const main = new Subscription();
      main.add(() => {
        isCalled = true;
      });
      main.unsubscribe();
      expect(isCalled).toBe(true);
    });

    it('should unsubscribe a finalizer function that was passed immediately if it has been unsubscribed', () => {
      let isCalled = false;
      const main = new Subscription();
      main.unsubscribe();
      main.add(() => {
        isCalled = true;
      });
      expect(isCalled).toBe(true);
    });

    it('should unsubscribe an Unsubscribable when unsubscribed', () => {
      let isCalled = false;
      const main = new Subscription();
      main.add({
        unsubscribe() {
          isCalled = true;
        },
      });
      main.unsubscribe();
      expect(isCalled).toBe(true);
    });

    it('should unsubscribe an Unsubscribable if it is already unsubscribed', () => {
      let isCalled = false;
      const main = new Subscription();
      main.unsubscribe();
      main.add({
        unsubscribe() {
          isCalled = true;
        },
      });
      expect(isCalled).toBe(true);
    });
  });

  describe('remove()', () => {
    it('should remove added Subscriptions', () => {
      let isCalled = false;
      const main = new Subscription();
      const child = new Subscription(() => {
        isCalled = true;
      });
      main.add(child);
      main.remove(child);
      main.unsubscribe();
      expect(isCalled).toBe(false);
    });

    it('should remove added functions', () => {
      let isCalled = false;
      const main = new Subscription();
      const finalizer = () => {
        isCalled = true;
      };
      main.add(finalizer);
      main.remove(finalizer);
      main.unsubscribe();
      expect(isCalled).toBe(false);
    });

    it('should remove added unsubscribables', () => {
      let isCalled = false;
      const main = new Subscription();
      const unsubscribable = {
        unsubscribe() {
          isCalled = true;
        },
      };
      main.add(unsubscribable);
      main.remove(unsubscribable);
      main.unsubscribe();
      expect(isCalled).toBe(false);
    });
  });

  describe('unsubscribe()', () => {
    it('should unsubscribe from all subscriptions, when some of them throw', (_, done) => {
      const finalizers: number[] = [];

      const source1 = new Observable(() => {
        return () => {
          finalizers.push(1);
        };
      });

      const source2 = new Observable(() => {
        return () => {
          finalizers.push(2);
          throw new Error('oops, I am a bad unsubscribe!');
        };
      });

      const source3 = new Observable(() => {
        return () => {
          finalizers.push(3);
        };
      });

      const subscription = merge(source1, source2, source3).subscribe();

      setTimeout(() => {
        expect(() => {
          subscription.unsubscribe();
        }).toThrow(UnsubscriptionError);
        expect(finalizers).toEqual([1, 2, 3]);
        done();
      });
    });

    it('should unsubscribe from all subscriptions, when adding a bad custom subscription to a subscription', (_, done) => {
      const finalizers: number[] = [];

      const sub = new Subscription();

      const source1 = new Observable(() => {
        return () => {
          finalizers.push(1);
        };
      });

      const source2 = new Observable(() => {
        return () => {
          finalizers.push(2);
          sub.add(<any>{
            unsubscribe: () => {
              expect(sub.closed).toBe(true);
              throw new Error('Who is your daddy, and what does he do?');
            },
          });
        };
      });

      const source3 = new Observable(() => {
        return () => {
          finalizers.push(3);
        };
      });

      sub.add(merge(source1, source2, source3).subscribe());

      setTimeout(() => {
        expect(() => {
          sub.unsubscribe();
        }).toThrow(UnsubscriptionError);
        expect(finalizers).toEqual([1, 2, 3]);
        done();
      });
    });

    it('should have idempotent unsubscription', () => {
      let count = 0;
      const subscription = new Subscription(() => ++count);
      expect(count).toEqual(0);

      subscription.unsubscribe();
      expect(count).toEqual(1);

      subscription.unsubscribe();
      expect(count).toEqual(1);
    });

    it('should unsubscribe from all parents', () => {
      // https://github.com/ReactiveX/rxjs/issues/6351
      const a = new Subscription(() => {
        /* noop */
      });
      const b = new Subscription(() => {
        /* noop */
      });
      const c = new Subscription(() => {
        /* noop */
      });
      const d = new Subscription(() => {
        /* noop */
      });
      a.add(d);
      b.add(d);
      c.add(d);
      // When d is added to the subscriptions, it's added as a finalizer. The
      // length is 1 because the finalizers passed to the ctors are stored in a
      // separate property.
      expect((a as any)._finalizers).toHaveLength(1);
      expect((b as any)._finalizers).toHaveLength(1);
      expect((c as any)._finalizers).toHaveLength(1);
      d.unsubscribe();
      // When d is unsubscribed, it should remove itself from each of its
      // parents.
      expect((a as any)._finalizers).toHaveLength(0);
      expect((b as any)._finalizers).toHaveLength(0);
      expect((c as any)._finalizers).toHaveLength(0);
    });
  });
});
