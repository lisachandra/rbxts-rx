export function createObject(keys: string[], values: any[]) {
  // eslint-disable-next-line no-sequences
  return keys.reduce((result, key, i) => ((result[key] = values[i]), result), {} as any);
}
