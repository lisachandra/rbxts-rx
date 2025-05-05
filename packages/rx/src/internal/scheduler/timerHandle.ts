import { setInterval, setTimeout } from '@rbxts/luau-polyfill';

export type TimerHandle = number | ReturnType<typeof setTimeout | typeof setInterval>;
