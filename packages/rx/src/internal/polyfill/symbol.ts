import { Symbol } from '@rbxts/luau-polyfill';

declare global {
  interface SymbolConstructor {
    readonly observable: symbol;
  }
}

export = Symbol as never as SymbolConstructor;
