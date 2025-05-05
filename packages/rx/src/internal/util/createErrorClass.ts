import { Error, Object } from "@rbxts/luau-polyfill";

/**
 * Used to create Error subclasses until the community moves away from ES5.
 *
 * This is because compiling from TypeScript down to ES5 has issues with subclassing Errors
 * as well as other built-in types: https://github.com/Microsoft/TypeScript/issues/12123
 *
 * @param createImpl A factory function to create the actual constructor implementation. The returned
 * function should be a named function that calls `_super` internally.
 */
export function createErrorClass<T>(createImpl: (_super: any) => any): T {
  const _super = (instance: any) => {
    const err = new Error()
    Object.assign(instance, err)
    setmetatable(instance, Error as never)
  };

  const ctorFunc = createImpl(_super);

  class ErrorSubclass {
    constructor(...args: any[]) {
      ctorFunc(this, ...args)
    }
  }

  return ErrorSubclass as T;
}
