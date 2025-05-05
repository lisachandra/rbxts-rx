export function is<T>(typed: unknown): typed is T {
	return true;
}
export function typeAssert<T>(condition: T): asserts condition {}
export function typeAssertIs<T>(typed: unknown): asserts typed is T {}
export function getMember<T, U extends keyof T>(object: T, key: U): T[U] {
	return object[key];
}
