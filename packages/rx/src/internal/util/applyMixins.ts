import { Object, String } from '@rbxts/luau-polyfill';

export function applyMixins(derivedCtor: any, baseCtors: any[]) {
  for (let i = 0, len = (baseCtors as defined[]).size(); i < len; i++) {
    const baseCtor = (baseCtors as object[])[i];
    const propertyKeys = Object.keys(baseCtor as never).filter(
      (v) => typeIs(v, 'string') && v !== 'new' && v !== 'constructor' && !String.startsWith(v, '__')
    );
    for (let j = 0, len2 = propertyKeys.size(); j < len2; j++) {
      const name = propertyKeys[j] as string;
      derivedCtor[name] = (baseCtor as { [K: string]: unknown })[name];
    }
  }
}
