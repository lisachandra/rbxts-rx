import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { Notification, Subscriber } from '@rbxts/rx';
import { TestScheduler } from '@rbxts/rx/out/testing';
import { observableMatcher } from './helpers/observableMatcher';

/** @test {Notification} */
describe('Notification', () => {
  let rxTestScheduler: TestScheduler;
  beforeEach(() => {
    rxTestScheduler = new TestScheduler(observableMatcher);
  });

  it('should exist', () => {
    expect(Notification).toBeDefined();
    expect(type(Notification)).toBe('function');
  });

  it('should not allow convert to observable if given kind is unknown', () => {
    const n = new Notification('x' as any);
    expect(() => n.toObservable()).toThrow();
  });

  describe('createNext', () => {
    it('should return a Notification', () => {
      const n = Notification.createNext('test');
      expect(n instanceof Notification).toBe(true);
      expect(n.value).toEqual('test');
      expect(n.kind).toEqual('N');
      expect(type(n.error)).toBe('nil');
      expect(n.hasValue).toBe(true);
    });
  });

  describe('createError', () => {
    it('should return a Notification', () => {
      const n = Notification.createError('test');
      expect(n instanceof Notification).toBe(true);
      expect(type(n.value)).toBe('nil');
      expect(n.kind).toEqual('E');
      expect(n.error).toEqual('test');
      expect(n.hasValue).toBe(false);
    });
  });

  describe('createComplete', () => {
    it('should return a Notification', () => {
      const n = Notification.createComplete();
      expect(n instanceof Notification).toBe(true);
      expect(type(n.value)).toBe('nil');
      expect(n.kind).toEqual('C');
      expect(type(n.error)).toBe('nil');
      expect(n.hasValue).toBe(false);
    });
  });

  describe('toObservable', () => {
    it('should create observable from a next Notification', () => {
      rxTestScheduler.run(({ expectObservable }) => {
        const value = 'a';
        const next0 = Notification.createNext(value);
        expectObservable(next0.toObservable()).toBe('(a|)');
      });
    });

    it('should create observable from a complete Notification', () => {
      rxTestScheduler.run(({ expectObservable }) => {
        const complete = Notification.createComplete();
        expectObservable(complete.toObservable()).toBe('|');
      });
    });

    it('should create observable from a error Notification', () => {
      rxTestScheduler.run(({ expectObservable }) => {
        const err = Notification.createError('error');
        expectObservable(err.toObservable()).toBe('#');
      });
    });
  });

  describe('static reference', () => {
    it('should create new next Notification with value', () => {
      const value = 'a';
      const first = Notification.createNext(value);
      const second = Notification.createNext(value);

      expect(first).never.toEqual(second);
    });

    it('should create new error Notification', () => {
      const first = Notification.createError();
      const second = Notification.createError();

      expect(first).never.toEqual(second);
    });

    it('should return static complete Notification reference', () => {
      const first = Notification.createComplete();
      const second = Notification.createComplete();

      expect(first).toEqual(second);
    });
  });

  describe('do', () => {
    it('should invoke on next', () => {
      const n = Notification.createNext('a');
      let invoked = false;
      n.do(
        () => {
          invoked = true;
        },
        () => {
          throw 'should not be called';
        },
        () => {
          throw 'should not be called';
        }
      );

      expect(invoked).toBe(true);
    });

    it('should invoke on error', () => {
      const n = Notification.createError();
      let invoked = false;
      n.do(
        () => {
          throw 'should not be called';
        },
        () => {
          invoked = true;
        },
        () => {
          throw 'should not be called';
        }
      );

      expect(invoked).toBe(true);
    });

    it('should invoke on complete', () => {
      const n = Notification.createComplete();
      let invoked = false;
      n.do(
        () => {
          throw 'should not be called';
        },
        () => {
          throw 'should not be called';
        },
        () => {
          invoked = true;
        }
      );

      expect(invoked).toBe(true);
    });
  });

  describe('accept', () => {
    it('should accept observer for next Notification', () => {
      const value = 'a';
      let observed = false;
      const n = Notification.createNext(value);
      const observer = Subscriber.create(
        (x?: string) => {
          expect(x).toEqual(value);
          observed = true;
        },
        () => {
          throw 'should not be called';
        },
        () => {
          throw 'should not be called';
        }
      );

      n.accept(observer);
      expect(observed).toBe(true);
    });

    it('should accept observer for error Notification', () => {
      let observed = false;
      const n = Notification.createError();
      const observer = Subscriber.create(
        () => {
          throw 'should not be called';
        },
        () => {
          observed = true;
        },
        () => {
          throw 'should not be called';
        }
      );

      n.accept(observer);
      expect(observed).toBe(true);
    });

    it('should accept observer for complete Notification', () => {
      let observed = false;
      const n = Notification.createComplete();
      const observer = Subscriber.create(
        () => {
          throw 'should not be called';
        },
        () => {
          throw 'should not be called';
        },
        () => {
          observed = true;
        }
      );

      n.accept(observer);
      expect(observed).toBe(true);
    });

    it('should accept function for next Notification', () => {
      const value = 'a';
      let observed = false;
      const n = Notification.createNext(value);

      n.accept(
        (x: string) => {
          expect(x).toEqual(value);
          observed = true;
        },
        () => {
          throw 'should not be called';
        },
        () => {
          throw 'should not be called';
        }
      );
      expect(observed).toBe(true);
    });

    it('should accept function for error Notification', () => {
      let observed = false;
      const err = 'error';
      const n = Notification.createError(err);

      n.accept(
        () => {
          throw 'should not be called';
        },
        (err: any) => {
          expect(err).toEqual(err);
          observed = true;
        },
        () => {
          throw 'should not be called';
        }
      );
      expect(observed).toBe(true);
    });

    it('should accept function for complete Notification', () => {
      let observed = false;
      const n = Notification.createComplete();

      n.accept(
        () => {
          throw 'should not be called';
        },
        () => {
          throw 'should not be called';
        },
        () => {
          observed = true;
        }
      );
      expect(observed).toBe(true);
    });
  });

  describe('observe', () => {
    it('should observe for next Notification', () => {
      const value = 'a';
      let observed = false;
      const n = Notification.createNext(value);
      const observer = Subscriber.create(
        (x?: string) => {
          expect(x).toEqual(value);
          observed = true;
        },
        () => {
          throw 'should not be called';
        },
        () => {
          throw 'should not be called';
        }
      );

      n.observe(observer);
      expect(observed).toBe(true);
    });

    it('should observe for error Notification', () => {
      let observed = false;
      const n = Notification.createError();
      const observer = Subscriber.create(
        () => {
          throw 'should not be called';
        },
        () => {
          observed = true;
        },
        () => {
          throw 'should not be called';
        }
      );

      n.observe(observer);
      expect(observed).toBe(true);
    });

    it('should observe for complete Notification', () => {
      let observed = false;
      const n = Notification.createComplete();
      const observer = Subscriber.create(
        () => {
          throw 'should not be called';
        },
        () => {
          throw 'should not be called';
        },
        () => {
          observed = true;
        }
      );

      n.observe(observer);
      expect(observed).toBe(true);
    });
  });
});
