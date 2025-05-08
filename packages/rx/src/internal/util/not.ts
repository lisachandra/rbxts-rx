export function Not<T>(pred: (value: T, index: number) => boolean): (value: T, index: number) => boolean {
  return (value: T, index: number) => !pred(value, index);
}
