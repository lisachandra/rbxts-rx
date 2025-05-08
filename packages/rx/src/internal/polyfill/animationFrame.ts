export type cancelAnimationFrame = (handle: number) => void;
export type requestAnimationFrame = (callback: FrameRequestCallback) => number | undefined;
export interface FrameRequestCallback {
  (time: number): void;
}
