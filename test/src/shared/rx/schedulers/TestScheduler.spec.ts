import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { hot, cold, expectObservable, expectSubscriptions, time } from '../helpers/marble-testing';
import { TestScheduler } from '@rbxts/rx/out/testing';
import { Observable, NEVER, EMPTY, Subject, of, merge, animationFrameScheduler, asapScheduler, asyncScheduler, interval } from '@rbxts/rx';
import { delay, debounceTime, concatMap, mergeMap, mapTo, take } from '@rbxts/rx/out/operators';
import { nextNotification, COMPLETE_NOTIFICATION, errorNotification } from '@rbxts/rx/out/internal/NotificationFactories';
import { animationFrameProvider } from '@rbxts/rx/out/internal/scheduler/animationFrameProvider';
import { immediateProvider } from '@rbxts/rx/out/internal/scheduler/immediateProvider';
import { intervalProvider } from '@rbxts/rx/out/internal/scheduler/intervalProvider';
import { timeoutProvider } from '@rbxts/rx/out/internal/scheduler/timeoutProvider';
import { Error } from '@rbxts/luau-polyfill';
import { observableMatcher } from '../helpers/observableMatcher';

/** @test {TestScheduler} */
describe('TestScheduler', () => {
  it('should exist', () => {
    expect(TestScheduler).toBeDefined();
    // expect(type(TestScheduler)).toBe('function');
  });

  it('should have frameTimeFactor set initially', () => {
    expect(TestScheduler.frameTimeFactor).toEqual(10);
  });

  describe('parseMarbles()', () => {
    it('should parse a marble string into a series of notifications and types', () => {
      const result = TestScheduler.parseMarbles('-------a---b---|', { a: 'A', b: 'B' });
      expect(result).toEqual([
        { frame: 70, notification: nextNotification('A') },
        { frame: 110, notification: nextNotification('B') },
        { frame: 150, notification: COMPLETE_NOTIFICATION },
      ]);
    });

    it('should parse a marble string, allowing spaces too', () => {
      const result = TestScheduler.parseMarbles('--a--b--|   ', { a: 'A', b: 'B' });
      expect(result).toEqual([
        { frame: 20, notification: nextNotification('A') },
        { frame: 50, notification: nextNotification('B') },
        { frame: 80, notification: COMPLETE_NOTIFICATION },
      ]);
    });

    it('should parse a marble string with a subscription point', () => {
      const result = TestScheduler.parseMarbles('---^---a---b---|', { a: 'A', b: 'B' });
      expect(result).toEqual([
        { frame: 40, notification: nextNotification('A') },
        { frame: 80, notification: nextNotification('B') },
        { frame: 120, notification: COMPLETE_NOTIFICATION },
      ]);
    });

    it('should parse a marble string with an error', () => {
      const result = TestScheduler.parseMarbles('-------a---b---#', { a: 'A', b: 'B' }, 'omg error!');
      expect(result).toEqual([
        { frame: 70, notification: nextNotification('A') },
        { frame: 110, notification: nextNotification('B') },
        { frame: 150, notification: errorNotification('omg error!') },
      ]);
    });

    it('should default in the letter for the value if no value hash was passed', () => {
      const result = TestScheduler.parseMarbles('--a--b--c--');
      expect(result).toEqual([
        { frame: 20, notification: nextNotification('a') },
        { frame: 50, notification: nextNotification('b') },
        { frame: 80, notification: nextNotification('c') },
      ]);
    });

    it('should handle grouped values', () => {
      const result = TestScheduler.parseMarbles('---(abc)---');
      expect(result).toEqual([
        { frame: 30, notification: nextNotification('a') },
        { frame: 30, notification: nextNotification('b') },
        { frame: 30, notification: nextNotification('c') },
      ]);
    });

    it('should ignore whitespace when runMode=true', () => {
      const runMode = true;
      const result = TestScheduler.parseMarbles('  -a - b -    c |       ', { a: 'A', b: 'B', c: 'C' }, undefined, undefined, runMode);
      expect(result).toEqual([
        { frame: 10, notification: nextNotification('A') },
        { frame: 30, notification: nextNotification('B') },
        { frame: 50, notification: nextNotification('C') },
        { frame: 60, notification: COMPLETE_NOTIFICATION },
      ]);
    });

    it('should support time progression syntax when runMode=true', () => {
      const runMode = true;
      const result = TestScheduler.parseMarbles('10.2ms a 1.2s b 1m c|', { a: 'A', b: 'B', c: 'C' }, undefined, undefined, runMode);
      expect(result).toEqual([
        { frame: 10.2, notification: nextNotification('A') },
        { frame: 10.2 + 10 + 1.2 * 1000, notification: nextNotification('B') },
        { frame: 10.2 + 10 + 1.2 * 1000 + 10 + 1000 * 60, notification: nextNotification('C') },
        { frame: 10.2 + 10 + 1.2 * 1000 + 10 + 1000 * 60 + 10, notification: COMPLETE_NOTIFICATION },
      ]);
    });

    it('should support emoji characters', () => {
      const result = TestScheduler.parseMarbles('--🙈--🙉--🙊--|');
      expect(result).toEqual([
        { frame: 20, notification: nextNotification('🙈') },
        { frame: 50, notification: nextNotification('🙉') },
        { frame: 80, notification: nextNotification('🙊') },
        { frame: 110, notification: COMPLETE_NOTIFICATION },
      ]);
    });
  });

  describe('parseMarblesAsSubscriptions()', () => {
    it('should parse a subscription marble string into a subscriptionLog', () => {
      const result = TestScheduler.parseMarblesAsSubscriptions('---^---!-');
      expect(result.subscribedFrame).toEqual(30);
      expect(result.unsubscribedFrame).toEqual(70);
    });

    it('should parse a subscription marble string with an unsubscription', () => {
      const result = TestScheduler.parseMarblesAsSubscriptions('---^-');
      expect(result.subscribedFrame).toEqual(30);
      expect(result.unsubscribedFrame).toEqual(math.huge);
    });

    it('should parse a subscription marble string with a synchronous unsubscription', () => {
      const result = TestScheduler.parseMarblesAsSubscriptions('---(^!)-');
      expect(result.subscribedFrame).toEqual(30);
      expect(result.unsubscribedFrame).toEqual(30);
    });

    it('should ignore whitespace when runMode=true', () => {
      const runMode = true;
      const result = TestScheduler.parseMarblesAsSubscriptions('  - -  - -  ^ -   - !  -- -      ', runMode);
      expect(result.subscribedFrame).toEqual(40);
      expect(result.unsubscribedFrame).toEqual(70);
    });

    it('should support time progression syntax when runMode=true', () => {
      const runMode = true;
      const result = TestScheduler.parseMarblesAsSubscriptions('10.2ms ^ 1.2s - 1m !', runMode);
      expect(result.subscribedFrame).toEqual(10.2);
      expect(result.unsubscribedFrame).toEqual(10.2 + 10 + 1.2 * 1000 + 10 + 1000 * 60);
    });

    it('should throw if found more than one subscription point', () => {
      expect(() => TestScheduler.parseMarblesAsSubscriptions('---^-^-!-')).toThrow();
    });

    it('should throw if found more than one unsubscription point', () => {
      expect(() => TestScheduler.parseMarblesAsSubscriptions('---^---!-!')).toThrow();
    });
  });

  describe('createTime()', () => {
    it('should parse a simple time marble string to a number', () => {
      const scheduler = new TestScheduler(undefined!);
      const time = scheduler.createTime('-----|');
      expect(time).toEqual(50);
    });

    it('should progress time with whitespace', () => {
      const scheduler = new TestScheduler(undefined!);
      const time = scheduler.createTime('     |');
      //                                 -----|
      expect(time).toEqual(50);
    });

    it('should progress time with mix of whitespace and dashes', () => {
      const scheduler = new TestScheduler(undefined!);
      const time = scheduler.createTime('  --|');
      expect(time).toEqual(40);
    });

    it('should throw if not given good marble input', () => {
      const scheduler = new TestScheduler(undefined!);
      expect(() => {
        scheduler.createTime('-a-b-#');
      }).toThrow();
    });
  });

  describe('createColdObservable()', () => {
    it('should create a cold observable', () => {
      const expected = ['A', 'B'];
      const scheduler = new TestScheduler(undefined!);
      const source = scheduler.createColdObservable('--a---b--|', { a: 'A', b: 'B' });
      expect(source).toBeInstanceOf(Observable);
      source.subscribe((x) => {
        expect(x).toEqual(expected.shift());
      });
      scheduler.flush();
      expect(expected.size()).toEqual(0);
    });
  });

  describe('createHotObservable()', () => {
    it('should create a hot observable', () => {
      const expected = ['A', 'B'];
      const scheduler = new TestScheduler(undefined!);
      const source = scheduler.createHotObservable('--a---b--|', { a: 'A', b: 'B' });
      expect(source).toBeInstanceOf(Subject);
      source.subscribe((x) => {
        expect(x).toEqual(expected.shift());
      });
      scheduler.flush();
      expect(expected.size()).toEqual(0);
    });
  });

  describe('jasmine helpers', () => {
    beforeEach(() => {
      _G.rxTestScheduler = new TestScheduler(observableMatcher);
    });

    afterEach(() => {
      _G.rxTestScheduler?.flush();
      delete _G.rxTestScheduler;
    });

    describe('rxTestScheduler', () => {
      it('should exist', () => {
        expect(_G.rxTestScheduler).toBeInstanceOf(TestScheduler);
      });
    });

    describe('cold()', () => {
      it('should exist', () => {
        expect(cold).toBeDefined();
        expect(type(cold)).toBe('function');
      });

      it('should create a cold observable', () => {
        const expected = [1, 2];
        const source = cold('-a-b-|', { a: 1, b: 2 });
        source.subscribe({
          next: (x: number) => {
            expect(x).toEqual(expected.shift());
          },
          complete: () => {
            expect(expected.size()).toEqual(0);
          },
        });
        expectObservable(source).toBe('-a-b-|', { a: 1, b: 2 });
      });
    });

    describe('hot()', () => {
      it('should exist', () => {
        expect(hot).toBeDefined();
        expect(type(hot)).toBe('function');
      });

      it('should create a hot observable', () => {
        const source = hot('---^-a-b-|', { a: 1, b: 2 });
        expect(source).toBeInstanceOf(Subject);
        expectObservable(source).toBe('--a-b-|', { a: 1, b: 2 });
      });
    });

    describe('time()', () => {
      it('should exist', () => {
        expect(time).toBeDefined();
        expect(type(time)).toBe('function');
      });

      it('should parse a simple time marble string to a number', () => {
        expect(time('-----|')).toEqual(50);
      });
    });

    describe('expectObservable()', () => {
      it('should exist', () => {
        expect(expectObservable).toBeDefined();
        expect(type(expectObservable)).toBe('function');
      });

      it('should return an object with a toBe function', () => {
        expect(type(expectObservable(of(1)).toBe)).toBe('function');
      });

      it('should append to flushTests array', () => {
        expectObservable(EMPTY);
        // @ts-expect-error
        expect(_G.rxTestScheduler!.flushTests.size()).toEqual(1);
      });

      it('should handle empty', () => {
        expectObservable(EMPTY).toBe('|', {});
      });

      it('should handle never', () => {
        expectObservable(NEVER).toBe('-', {});
        expectObservable(NEVER).toBe('---', {});
      });

      it('should accept an unsubscription marble diagram', () => {
        const source = hot('---^-a-b-|');
        const unsubscribe = '---!';
        const expected = '--a';
        expectObservable(source, unsubscribe).toBe(expected);
      });

      it('should accept a subscription marble diagram', () => {
        const source = hot('-a-b-c|');
        const subscribe = '---^';
        const expected = '---b-c|';
        expectObservable(source, subscribe).toBe(expected);
      });
    });

    describe('expectSubscriptions()', () => {
      it('should exist', () => {
        expect(expectSubscriptions).toBeDefined();
        expect(type(expectSubscriptions)).toBe('function');
      });

      it('should return an object with a toBe function', () => {
        expect(type(expectSubscriptions([]).toBe)).toBe('function');
      });

      it('should append to flushTests array', () => {
        expectSubscriptions([]);
        // @ts-expect-error
        expect(_G.rxTestScheduler.flushTests.size()).toEqual(1);
      });

      it('should assert subscriptions of a cold observable', () => {
        const source = cold('---a---b-|');
        const subs = '^--------!';
        expectSubscriptions(source.subscriptions).toBe(subs);
        source.subscribe();
      });

      it('should support empty subscription marbles', () => {
        const source = cold('---a---b-|');
        const subs = '----------';
        expectSubscriptions(source.subscriptions).toBe(subs);
      });

      it('should support empty subscription marbles within arrays', () => {
        const source = cold('---a---b-|');
        const subs = ['----------'];
        expectSubscriptions(source.subscriptions).toBe(subs);
      });
    });

    describe('end-to-end helper tests', () => {
      it('should be awesome', () => {
        const values = { a: 1, b: 2 };
        const myObservable = cold('---a---b--|', values);
        const subs = '^---------!';
        expectObservable(myObservable).toBe('---a---b--|', values);
        expectSubscriptions(myObservable.subscriptions).toBe(subs);
      });

      it('should support testing metastreams', () => {
        const x = cold('-a-b|');
        const y = cold('-c-d|');
        const myObservable = hot('---x---y----|', { x: x, y: y });
        const expected = '---x---y----|';
        const expectedx = cold('-a-b|');
        const expectedy = cold('-c-d|');
        expectObservable(myObservable).toBe(expected, { x: expectedx, y: expectedy });
      });
    });
  });

  describe('TestScheduler.run()', () => {
    const assertDeepEquals = (actual: any, expected: any) => {
      expect(actual).toEqual(expected);
    };

    describe('marble diagrams', () => {
      it('should ignore whitespace', () => {
        const testScheduler = new TestScheduler(assertDeepEquals);

        testScheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
          const input = cold('  -a - b -    c |       ');
          const output = input.pipe(concatMap((d) => of(d).pipe(delay(10))));
          const expected = '     -- 9ms a 9ms b 9ms (c|) ';

          expectObservable(output).toBe(expected);
          expectSubscriptions(input.subscriptions).toBe('  ^- - - - - !');
        });
      });

      it('should support time progression syntax', () => {
        const testScheduler = new TestScheduler(assertDeepEquals);

        testScheduler.run(({ cold, hot, flush, expectObservable, expectSubscriptions }) => {
          const output = cold('10.2ms a 1.2s b 1m c|');
          const expected = '   10.2ms a 1.2s b 1m c|';

          expectObservable(output).toBe(expected);
        });
      });
    });

    it('should provide the correct helpers', () => {
      const testScheduler = new TestScheduler(assertDeepEquals);

      testScheduler.run(({ cold, hot, flush, expectObservable, expectSubscriptions }) => {
        expect(type(cold)).toBe('function');
        expect(type(hot)).toBe('function');
        expect(type(flush)).toBe('function');
        expect(type(expectObservable)).toBe('function');
        expect(type(expectSubscriptions)).toBe('function');

        const obs1 = cold('-a-c-e|');
        const obs2 = hot(' ^-b-d-f|');
        const output = merge(obs1, obs2);
        const expected = ' -abcdef|';

        expectObservable(output).toBe(expected);
        expectObservable(output).toEqual(cold(expected));
        // There are two subscriptions to each of these, because we merged
        // them together, then we subscribed to the merged result once
        // to check `toBe` and another time to check `toEqual`.
        expectSubscriptions(obs1.subscriptions).toBe(['^-----!', '^-----!']);
        expectSubscriptions(obs2.subscriptions).toBe(['^------!', '^------!']);
      });
    });

    it('should have each frame represent a single virtual millisecond', () => {
      const testScheduler = new TestScheduler(assertDeepEquals);

      testScheduler.run(({ cold, expectObservable }) => {
        const output = cold('-a-b-c--------|').pipe(debounceTime(5));
        const expected = '   ------ 4ms c---|';
        expectObservable(output).toBe(expected);
      });
    });

    it('should have no maximum frame count', () => {
      const testScheduler = new TestScheduler(assertDeepEquals);

      testScheduler.run(({ cold, expectObservable }) => {
        const output = cold('-a|').pipe(delay(1000 * 10));
        const expected = '   - 10s (a|)';
        expectObservable(output).toBe(expected);
      });
    });

    it('should make operators that use AsyncScheduler automatically use TestScheduler for actual scheduling', () => {
      const testScheduler = new TestScheduler(assertDeepEquals);

      testScheduler.run(({ cold, expectObservable }) => {
        const output = cold('-a-b-c--------|').pipe(debounceTime(5));
        const expected = '   ----------c---|';
        expectObservable(output).toBe(expected);
      });
    });

    it('should flush automatically', () => {
      const testScheduler = new TestScheduler((actual, expected) => {
        expect(actual).toEqual(expected);
      });
      testScheduler.run(({ cold, expectObservable }) => {
        const output = cold('-a-b-c|').pipe(concatMap((d) => of(d).pipe(delay(10))));
        const expected = '   -- 9ms a 9ms b 9ms (c|)';
        expectObservable(output).toBe(expected);

        expect(testScheduler['flushTests'].size()).toEqual(1);
        expect(testScheduler['actions'].size()).toEqual(1);
      });

      expect(testScheduler['flushTests'].size()).toEqual(0);
      expect(testScheduler['actions'].size()).toEqual(0);
    });

    it('should support explicit flushing', () => {
      const testScheduler = new TestScheduler(assertDeepEquals);

      testScheduler.run(({ cold, expectObservable, flush }) => {
        const output = cold('-a-b-c|').pipe(concatMap((d) => of(d).pipe(delay(10))));
        const expected = '   -- 9ms a 9ms b 9ms (c|)';
        expectObservable(output).toBe(expected);

        expect(testScheduler['flushTests'].size()).toEqual(1);
        expect(testScheduler['actions'].size()).toEqual(1);

        flush();

        expect(testScheduler['flushTests'].size()).toEqual(0);
        expect(testScheduler['actions'].size()).toEqual(0);
      });

      expect(testScheduler['flushTests'].size()).toEqual(0);
      expect(testScheduler['actions'].size()).toEqual(0);
    });

    it('should pass-through return values, e.g. Promises', (_, done) => {
      const testScheduler = new TestScheduler(assertDeepEquals);

      testScheduler
        .run(() => {
          return Promise.resolve('foo');
        })
        .then((value) => {
          expect(value).toEqual('foo');
          done();
        });
    });

    it('should restore changes upon thrown errors', () => {
      const testScheduler = new TestScheduler(assertDeepEquals);

      const frameTimeFactor = TestScheduler['frameTimeFactor'];
      const maxFrames = testScheduler.maxFrames;
      const runMode = testScheduler['runMode'];

      try {
        testScheduler.run(() => {
          throw new Error('kaboom!');
        });
      } catch {
        /* empty */
      }

      expect(TestScheduler['frameTimeFactor']).toEqual(frameTimeFactor);
      expect(testScheduler.maxFrames).toEqual(maxFrames);
      expect(testScheduler['runMode']).toEqual(runMode);
    });

    it('should flush expectations correctly', () => {
      expect(() => {
        const testScheduler = new TestScheduler(assertDeepEquals);
        testScheduler.run(({ cold, expectObservable, flush }) => {
          expectObservable(cold('-x')).toBe('-x');
          expectObservable(cold('-y')).toBe('-y');
          const expectation = expectObservable(cold('-z'));
          flush();
          expectation.toBe('-q');
        });
      }).toThrow();
    });

    describe('animate', () => {
      it('should throw if animate() is not called when needed', () => {
        const testScheduler = new TestScheduler(assertDeepEquals);
        expect(() =>
          testScheduler.run(() => {
            animationFrameProvider.schedule(() => {
              /* pointless lint rule */
            });
          })
        ).toThrow();
      });

      it('should throw if animate() is called more than once', () => {
        const testScheduler = new TestScheduler(assertDeepEquals);
        expect(() =>
          testScheduler.run(({ animate }) => {
            animate('--x');
            animate('--x');
          })
        ).toThrow();
      });

      it('should throw if animate() completes', () => {
        const testScheduler = new TestScheduler(assertDeepEquals);
        expect(() =>
          testScheduler.run(({ animate }) => {
            animate('--|');
          })
        ).toThrow();
      });

      it('should throw if animate() errors', () => {
        const testScheduler = new TestScheduler(assertDeepEquals);
        expect(() =>
          testScheduler.run(({ animate }) => {
            animate('--#');
          })
        ).toThrow();
      });

      it('should schedule async requests within animate()', () => {
        const testScheduler = new TestScheduler(assertDeepEquals);
        testScheduler.run(({ animate }) => {
          animate('--x');

          const values: string[] = [];

          testScheduler.schedule(() => {
            animationFrameProvider.schedule(function (t) { values.push(`a@${t}`) } );
            expect(values).toEqual([]);
          }, 0);
          testScheduler.schedule(() => {
            animationFrameProvider.schedule(function (t) { values.push(`b@${t}`) } );
            expect(values).toEqual([]);
          }, 1);
          testScheduler.schedule(() => {
            expect(values).toEqual(['a@2', 'b@2']);
          }, 2);
        });
      });

      it('should schedule sync requests within animate()', () => {
        const testScheduler = new TestScheduler(assertDeepEquals);
        testScheduler.run(({ animate }) => {
          animate('--x');

          const values: string[] = [];

          testScheduler.schedule(() => {
            animationFrameProvider.schedule(function (t) { values.push(`a@${t}`) } );
            animationFrameProvider.schedule(function (t) { values.push(`b@${t}`) } );
            expect(values).toEqual([]);
          }, 1);
          testScheduler.schedule(() => {
            expect(values).toEqual(['a@2', 'b@2']);
          }, 2);
        });
      });

      it('should support request cancellation within animate()', () => {
        const testScheduler = new TestScheduler(assertDeepEquals);
        testScheduler.run(({ animate }) => {
          animate('--x');

          const values: string[] = [];

          testScheduler.schedule(() => {
            const subscription = animationFrameProvider.schedule(function (t) { values.push(`a@${t}`) } );
            animationFrameProvider.schedule(function (t) { values.push(`b@${t}`) } );
            subscription.unsubscribe();
            expect(values).toEqual([]);
          }, 1);
          testScheduler.schedule(() => {
            expect(values).toEqual(['b@2']);
          }, 2);
        });
      });
    });

    describe('immediate and interval', () => {
      it('should schedule immediates', () => {
        const testScheduler = new TestScheduler(assertDeepEquals);
        testScheduler.run(() => {
          const values: string[] = [];
          const { setImmediate } = immediateProvider;
          setImmediate(() => {
            values.push(`a@${testScheduler.now()}`);
          });
          expect(values).toEqual([]);
          testScheduler.schedule(() => {
            expect(values).toEqual(['a@0']);
          }, 10);
        });
      });

      it('should support clearing immediates', () => {
        const testScheduler = new TestScheduler(assertDeepEquals);
        testScheduler.run(() => {
          const values: string[] = [];
          const { setImmediate, clearImmediate } = immediateProvider;
          const handle = setImmediate(() => {
            values.push(`a@${testScheduler.now()}`);
          });
          expect(values).toEqual([]);
          clearImmediate(handle);
          testScheduler.schedule(() => {
            expect(values).toEqual([]);
          }, 10);
        });
      });

      it('should schedule intervals', () => {
        const testScheduler = new TestScheduler(assertDeepEquals);
        testScheduler.run(() => {
          const values: string[] = [];
          const { setInterval, clearInterval } = intervalProvider;
          const handle = setInterval(() => {
            values.push(`a@${testScheduler.now()}`);
            clearInterval(handle);
          }, 1);
          expect(values).toEqual([]);
          testScheduler.schedule(() => {
            expect(values).toEqual(['a@1']);
          }, 10);
        });
      });

      it('should reschedule intervals until cleared', () => {
        const testScheduler = new TestScheduler(assertDeepEquals);
        testScheduler.run(() => {
          const values: string[] = [];
          const { setInterval, clearInterval } = intervalProvider;
          const handle = setInterval(() => {
            if (testScheduler.now() <= 3) {
              values.push(`a@${testScheduler.now()}`);
            } else {
              clearInterval(handle);
            }
          }, 1);
          expect(values).toEqual([]);
          testScheduler.schedule(() => {
            expect(values).toEqual(['a@1', 'a@2', 'a@3']);
          }, 10);
        });
      });

      it('should schedule timeouts', () => {
        const testScheduler = new TestScheduler(assertDeepEquals);
        testScheduler.run(() => {
          const values: string[] = [];
          const { setTimeout } = timeoutProvider;
          setTimeout(() => {
            values.push(`a@${testScheduler.now()}`);
          }, 1);
          expect(values).toEqual([]);
          testScheduler.schedule(() => {
            expect(values).toEqual(['a@1']);
          }, 10);
        });
      });

      it('should schedule immediates before intervals and timeouts', () => {
        const testScheduler = new TestScheduler(assertDeepEquals);
        testScheduler.run(() => {
          const values: string[] = [];
          const { setImmediate } = immediateProvider;
          const { setInterval, clearInterval } = intervalProvider;
          const { setTimeout } = timeoutProvider;
          const handle = setInterval(() => {
            values.push(`a@${testScheduler.now()}`);
            clearInterval(handle);
          }, 0);
          setTimeout(() => {
            values.push(`b@${testScheduler.now()}`);
          }, 0);
          setImmediate(() => {
            values.push(`c@${testScheduler.now()}`);
          });
          expect(values).toEqual([]);
          testScheduler.schedule(() => {
            expect(values).toEqual(['c@0', 'a@0', 'b@0']);
          }, 10);
        });
      });
    });

    describe('schedulers', () => {
      it('should support animationFrame, async and asap schedulers', () => {
        const testScheduler = new TestScheduler(assertDeepEquals);
        testScheduler.run(({ animate, cold, expectObservable, time }) => {
          animate('            ---------x');
          const mapped = cold('--m-------');
          const tb = time('      -----|  ');
          const expected = '   --(dc)-b-a';
          const result = mapped.pipe(
            mergeMap(() =>
              merge(
                of('a').pipe(delay(0, animationFrameScheduler)),
                of('b').pipe(delay(tb, asyncScheduler)),
                of('c').pipe(delay(0, asyncScheduler)),
                of('d').pipe(delay(0, asapScheduler))
              )
            )
          );
          expectObservable(result).toBe(expected);
        });
      });

      it('should emit asap notifications before async notifications', () => {
        const testScheduler = new TestScheduler(assertDeepEquals);
        testScheduler.run(({ cold, expectObservable }) => {
          const mapped = cold('--ab------');
          const expected = '   ---(ba)---';
          const result = mapped.pipe(
            mergeMap((value) => (value === 'a' ? of(value).pipe(delay(1, asyncScheduler)) : of(value).pipe(delay(0, asapScheduler))))
          );
          expectObservable(result).toBe(expected);
        });
      });

      it('should support intervals with zero duration', () => {
        const testScheduler = new TestScheduler(assertDeepEquals);
        testScheduler.run(({ cold, expectObservable }) => {
          const mapped = cold('--m-------');
          const expected = '   --(bbbaaa)';
          const result = mapped.pipe(
            mergeMap(() =>
              merge(interval(0, asyncScheduler).pipe(mapTo('a'), take(3)), interval(0, asapScheduler).pipe(mapTo('b'), take(3)))
            )
          );
          expectObservable(result).toBe(expected);
        });
      });
    });

    describe('time', () => {
      it('should parse a simple time marble string to a number', () => {
        const testScheduler = new TestScheduler(assertDeepEquals);

        testScheduler.run(({ time }) => {
          const t = time('--|');
          expect(t).toEqual(2);
        });
      });

      it('should ignore whitespace', () => {
        const testScheduler = new TestScheduler(assertDeepEquals);

        testScheduler.run(({ time }) => {
          const t = time('  --|');
          expect(t).toEqual(2);
        });
      });

      it('should throw if not given good marble input', () => {
        const testScheduler = new TestScheduler(assertDeepEquals);

        testScheduler.run(({ time }) => {
          expect(() => {
            time('-a-b-#');
          }).toThrow();
        });
      });
    });
  });
});
