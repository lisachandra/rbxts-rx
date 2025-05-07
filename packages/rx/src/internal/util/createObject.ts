export function createObject(keys: string[], values: unknown[]) {
  // eslint-disable-next-line no-sequences
  return keys.reduce((result: { [K: string]: unknown }, key, i) => ((result[key] = values[i]), result), {} as any);
}
