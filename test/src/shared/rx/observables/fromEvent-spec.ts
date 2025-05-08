import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { fromEvent, NEVER, timer } from '@rbxts/rx';
import { mapTo, take, concat } from '@rbxts/rx/out/operators';
import { TestScheduler } from '@rbxts/rx/out/testing';
import { observableMatcher } from '../helpers/observableMatcher';
import RegExp from '@rbxts/regexp';
import { Event, EventTarget } from '@rbxts/whatwg-event-target';
import { Error, Array } from '@rbxts/luau-polyfill';

type EventListenerOrEventListenerObject = EventTarget.EventListener<EventTarget<any, any>, Event>;

/** @test {fromEvent} */
describe('fromEvent', () => {
  let rxTestScheduler: TestScheduler;

  beforeEach(() => {
    rxTestScheduler = new TestScheduler(observableMatcher);
  });

  it('should create an observable of click on the element', () => {
    rxTestScheduler.run(({ expectObservable, time }) => {
      const delay1 = time('-----|     ');
      const delay2 = time('     --|   ');
      const expected = '   -----x-x---';

      const target = {
        addEventListener: (eventType: any, listener: any) => {
          timer(delay1, delay2).pipe(mapTo('ev'), take(2), concat(NEVER)).subscribe(listener);
        },
        removeEventListener: (): void => undefined,
        dispatchEvent: (): void => undefined,
      };
      const e1 = fromEvent(target as any, 'click');
      expectObservable(e1).toBe(expected, { x: 'ev' });
    });
  });

  it('should setup an event observable on objects with "on" and "off" ', () => {
    let onEventName;
    let onHandler;
    let offEventName;
    let offHandler;

    const obj = {
      on: (a: string, b: Callback) => {
        onEventName = a;
        onHandler = b;
      },
      off: (a: string, b: Callback) => {
        offEventName = a;
        offHandler = b;
      },
    };

    const subscription = fromEvent(obj, 'click').subscribe(() => {
      //noop
    });

    subscription.unsubscribe();

    expect(onEventName).toEqual('click');
    expect(type(onHandler)).toEqual('function');
    expect(offEventName).toEqual(onEventName);
    expect(offHandler).toEqual(onHandler);
  });

  it('should setup an event observable on objects with "addEventListener" and "removeEventListener" ', () => {
    let onEventName;
    let onHandler;
    let offEventName;
    let offHandler;

    const obj = {
      addEventListener: (a: string, b: EventListenerOrEventListenerObject, useCapture?: boolean) => {
        onEventName = a;
        onHandler = b;
      },
      removeEventListener: (a: string, b: EventListenerOrEventListenerObject, useCapture?: boolean) => {
        offEventName = a;
        offHandler = b;
      },
    };

    const subscription = fromEvent(<any>obj, 'click').subscribe(() => {
      //noop
    });

    subscription.unsubscribe();

    expect(onEventName).toEqual('click');
    expect(type(onHandler)).toEqual('function');
    expect(offEventName).toEqual(onEventName);
    expect(offHandler).toEqual(onHandler);
  });

  it('should setup an event observable on objects with "addListener" and "removeListener" returning event emitter', () => {
    let onEventName;
    let onHandler;
    let offEventName;
    let offHandler;

    const obj = {
      addListener(a: string | symbol, b: (...args: any[]) => void) {
        onEventName = a;
        onHandler = b;
        return this;
      },
      removeListener(a: string | symbol, b: (...args: any[]) => void) {
        offEventName = a;
        offHandler = b;
        return this;
      },
    };

    const subscription = fromEvent(obj, 'click').subscribe(() => {
      //noop
    });

    subscription.unsubscribe();

    expect(onEventName).toEqual('click');
    expect(type(onHandler)).toEqual('function');
    expect(offEventName).toEqual(onEventName);
    expect(offHandler).toEqual(onHandler);
  });

  it('should setup an event observable on objects with "addListener" and "removeListener" returning nothing', () => {
    let onEventName;
    let onHandler;
    let offEventName;
    let offHandler;

    const obj = {
      addListener(a: string, b: (...args: any[]) => any, context?: any): { context: any } {
        onEventName = a;
        onHandler = b;
        return { context: '' };
      },
      removeListener(a: string, b: (...args: any[]) => void) {
        offEventName = a;
        offHandler = b;
      },
    };

    const subscription = fromEvent(obj, 'click').subscribe(() => {
      //noop
    });

    subscription.unsubscribe();

    expect(onEventName).toEqual('click');
    expect(type(onHandler)).toEqual('function');
    expect(offEventName).toEqual(onEventName);
    expect(offHandler).toEqual(onHandler);
  });

  it('should setup an event observable on objects with "addListener" and "removeListener" and "length" ', () => {
    let onEventName;
    let onHandler;
    let offEventName;
    let offHandler;

    const obj = {
      addListener: (a: string, b: Callback) => {
        onEventName = a;
        onHandler = b;
      },
      removeListener: (a: string, b: Callback) => {
        offEventName = a;
        offHandler = b;
      },
      length: 1,
    };

    const subscription = fromEvent(obj, 'click').subscribe(() => {
      //noop
    });

    subscription.unsubscribe();

    expect(onEventName).toEqual('click');
    expect(type(onHandler)).toEqual('function');
    expect(offEventName).toEqual(onEventName);
    expect(offHandler).toEqual(onHandler);
  });

  it('should throw if passed an invalid event target', () => {
    const obj = {
      addListener: () => {
        //noop
      },
    };
    expect(() => {
      fromEvent(obj as any, 'click');
    }).toThrow(RegExp('Invalid event target'));
  });

  it('should pass through options to addEventListener and removeEventListener', () => {
    let onOptions;
    let offOptions;
    const expectedOptions = { capture: true, passive: true };

    const obj = {
      addEventListener: (a: string, b: EventListenerOrEventListenerObject, c?: any) => {
        onOptions = c;
      },
      removeEventListener: (a: string, b: EventListenerOrEventListenerObject, c?: any) => {
        offOptions = c;
      },
    };

    const subscription = fromEvent(<any>obj, 'click', expectedOptions).subscribe(() => {
      //noop
    });

    subscription.unsubscribe();

    expect(onOptions).toEqual(expectedOptions);
    expect(offOptions).toEqual(expectedOptions);
  });

  it('should pass through events that occur', (_, done) => {
    let send: any;
    const obj = {
      on: (name: string, handler: Callback) => {
        send = handler;
      },
      off: () => {
        //noop
      },
    };

    fromEvent(obj, 'click')
      .pipe(take(1))
      .subscribe({
        next: (e: any) => {
          expect(e).toEqual('test');
        },
        error: (err: any) => {
          done(new Error('should not be called'));
        },
        complete: () => {
          done();
        },
      });

    send('test');
  });

  it('should pass through events that occur and use the selector if provided', (_, done) => {
    let send: any;
    const obj = {
      on: (name: string, handler: Callback) => {
        send = handler;
      },
      off: () => {
        //noop
      },
    };

    function selector(x: string) {
      return x + '!';
    }

    fromEvent(obj, 'click', selector)
      .pipe(take(1))
      .subscribe({
        next: (e: any) => {
          expect(e).toEqual('test!');
        },
        error: (err: any) => {
          done(new Error('should not be called'));
        },
        complete: () => {
          done();
        },
      });

    send('test');
  });

  it('should not fail if no event arguments are passed and the selector does not return', (_, done) => {
    let send: any;
    const obj = {
      on: (name: string, handler: Callback) => {
        send = handler;
      },
      off: () => {
        //noop
      },
    };

    function selector() {
      //noop
    }

    fromEvent(obj, 'click', selector)
      .pipe(take(1))
      .subscribe({
        next: (e: any) => {
          expect(e).never.toBeDefined();
        },
        error: (err: any) => {
          done(new Error('should not be called'));
        },
        complete: () => {
          done();
        },
      });

    send();
  });

  it('should return a value from the selector if no event arguments are passed', (_, done) => {
    let send: any;
    const obj = {
      on: (name: string, handler: Callback) => {
        send = handler;
      },
      off: () => {
        //noop
      },
    };

    function selector() {
      return 'no arguments';
    }

    fromEvent(obj, 'click', selector)
      .pipe(take(1))
      .subscribe({
        next: (e: any) => {
          expect(e).toEqual('no arguments');
        },
        error: (err: any) => {
          done(new Error('should not be called'));
        },
        complete: () => {
          done();
        },
      });

    send();
  });

  it('should pass multiple arguments to selector from event emitter', (_, done) => {
    let send: any;
    const obj = {
      on: (name: string, handler: Callback) => {
        send = handler;
      },
      off: () => {
        //noop
      },
    };

    function selector(x: number, y: number, z: number) {
      return Array.slice([x, y, z]);
    }

    fromEvent(obj, 'click', selector)
      .pipe(take(1))
      .subscribe({
        next: (e: any) => {
          expect(e).toEqual([1, 2, 3]);
        },
        error: (err: any) => {
          done(new Error('should not be called'));
        },
        complete: () => {
          done();
        },
      });

    send(1, 2, 3);
  });

  it('should emit multiple arguments from event as an array', (_, done) => {
    let send: any;
    const obj = {
      on: (name: string, handler: Callback) => {
        send = handler;
      },
      off: () => {
        //noop
      },
    };

    fromEvent(obj, 'click')
      .pipe(take(1))
      .subscribe({
        next: (e: any) => {
          expect(e).toEqual([1, 2, 3]);
        },
        error: (err: any) => {
          done(new Error('should not be called'));
        },
        complete: () => {
          done();
        },
      });

    send(1, 2, 3);
  });

  it('should not throw an exception calling toString on obj with a undefined prototype', (_, done) => {
    // NOTE: Can not test with Object.create(undefined) or `class Foo extends undefined`
    // due to TypeScript bug. https://github.com/Microsoft/TypeScript/issues/1108
    class NullProtoEventTarget {
      on() {
        /*noop*/
      }
      off() {
        /*noop*/
      }
    }
    // NullProtoEventTarget.prototype.toString = undefined!;
    const obj: NullProtoEventTarget = new NullProtoEventTarget();

    expect(() => {
      fromEvent(obj, 'foo').subscribe();
      done();
    }).never.toThrowError();
  });

  it('should handle adding events to an arraylike of targets', () => {
    const nodeList = {
      [0]: {
        addEventListener(...args: any[]) {
          this._addEventListenerArgs = args;
        },
        removeEventListener(...args: any[]) {
          this._removeEventListenerArgs = args;
        },
        _addEventListenerArgs: undefined as any,
        _removeEventListenerArgs: undefined as any,
      },
      [1]: {
        addEventListener(...args: any[]) {
          this._addEventListenerArgs = args;
        },
        removeEventListener(...args: any[]) {
          this._removeEventListenerArgs = args;
        },
        _addEventListenerArgs: undefined as any,
        _removeEventListenerArgs: undefined as any,
      },
    };

    const options = {};

    const subscription = fromEvent(nodeList as never as ArrayLike<ValueOf<typeof nodeList>>, 'click', options).subscribe();

    expect(nodeList[0]._addEventListenerArgs[0]).toEqual('click');
    expect(type(nodeList[0]._addEventListenerArgs[1])).toBe('function');
    expect(nodeList[0]._addEventListenerArgs[2]).toEqual(options);

    expect(nodeList[1]._addEventListenerArgs[0]).toEqual('click');
    expect(type(nodeList[1]._addEventListenerArgs[1])).toBe('function');
    expect(nodeList[1]._addEventListenerArgs[2]).toEqual(options);

    expect(nodeList[0]._removeEventListenerArgs).toBeUndefined();
    expect(nodeList[1]._removeEventListenerArgs).toBeUndefined();

    subscription.unsubscribe();

    expect(nodeList[0]._removeEventListenerArgs).toEqual(nodeList[0]._addEventListenerArgs);
    expect(nodeList[1]._removeEventListenerArgs).toEqual(nodeList[1]._addEventListenerArgs);
  });
});
