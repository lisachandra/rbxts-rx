import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { Error, ErrorConstructor } from '@rbxts/luau-polyfill';
import { createErrorClass } from '@rbxts/rx/out/internal/util/createErrorClass';

describe('createErrorClass', () => {
  it('should create a class that subclasses error and has the right properties', () => {
    interface MySpecialError extends Error {
      arg1: number;
      arg2: string;
    }
    interface MySpecialErrorCtor {
      new (arg1: number, arg2: string): MySpecialError;
    }

    const MySpecialError: MySpecialErrorCtor = createErrorClass(
      (_super) =>
        function (this: any, arg1: number, arg2: string) {
          _super(this);
          this.message = 'Super special error!';
          this.arg1 = arg1;
          this.arg2 = arg2;
        }
    );

    expect(type(MySpecialError)).toBe('function');
    const err = new MySpecialError(123, 'Test');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(MySpecialError);
    // expect(err.constructor).toEqual(MySpecialError);
    expect(type(err.stack)).toBe('string');
    expect(err.message).toEqual('Super special error!');
    expect(err.arg1).toEqual(123);
    expect(err.arg2).toEqual('Test');
  });
});
