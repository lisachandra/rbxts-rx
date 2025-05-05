import { Symbol } from "@rbxts/luau-polyfill";

export function getSymbolIterator(): symbol {
  return Symbol("iterator");
}

export const iterator = getSymbolIterator();
