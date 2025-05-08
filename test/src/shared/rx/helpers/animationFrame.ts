import { clearTimeout, setTimeout, Timeout } from '@rbxts/luau-polyfill';

let lastTime = 0;

export const requestAnimationFrame = (callback: Callback, element: any) => {
  const currTime = DateTime.now().UnixTimestampMillis;
  const timeToCall = math.max(0, 16 - (currTime - lastTime));
  const id = setTimeout(() => {
    callback(currTime + timeToCall);
  }, timeToCall);
  lastTime = currTime + timeToCall;
  return id;
};

export const cancelAnimationFrame = (id: Timeout) => {
  clearTimeout(id);
};
