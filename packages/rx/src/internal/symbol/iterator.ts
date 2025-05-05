import { Symbol } from '@rbxts/luau-polyfill';

export function getSymbolIterator() {
  return Symbol('iterator');
}

export const symbolIterator: unique symbol = getSymbolIterator() as never;
