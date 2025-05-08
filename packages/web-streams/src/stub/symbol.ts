import { Symbol } from '@rbxts/luau-polyfill';

/*
const SymbolPolyfill: (description?: string) => symbol =
  typeof Symbol === 'function' && typeof Symbol.iterator === 'symbol' ? Symbol : (description) => `Symbol(${description})` as any as symbol;
*/
const SymbolPolyfill = Symbol.for;

export default SymbolPolyfill;
