import { FrameRequestCallback, requestAnimationFrame, cancelAnimationFrame } from 'internal/polyfill/animationFrame';
import { Subscription } from '../Subscription';

interface AnimationFrameProvider {
  schedule(callback: FrameRequestCallback): Subscription;
  requestAnimationFrame: requestAnimationFrame;
  cancelAnimationFrame: cancelAnimationFrame;
  delegate:
    | {
        requestAnimationFrame: requestAnimationFrame;
        cancelAnimationFrame: cancelAnimationFrame;
      }
    | undefined;
}

export const animationFrameProvider: AnimationFrameProvider = {
  // When accessing the delegate, use the variable rather than `this` so that
  // the functions can be called without being bound to the provider.
  schedule(callback) {
    let request: requestAnimationFrame | undefined = undefined;
    let cancel: cancelAnimationFrame | undefined = undefined;
    const { delegate } = animationFrameProvider;
    if (delegate) {
      request = delegate.requestAnimationFrame;
      cancel = delegate.cancelAnimationFrame;
    }
    const handle = request?.((timestamp) => {
      // Clear the cancel function. The request has been fulfilled, so
      // attempting to cancel the request upon unsubscription would be
      // pointless.
      cancel = undefined;
      callback(timestamp);
    });
    return new Subscription(() => cancel?.(handle!));
  },
  requestAnimationFrame(this: void, ...args) {
    const { delegate } = animationFrameProvider;
    return delegate?.requestAnimationFrame?.(...args);
  },
  cancelAnimationFrame(this: void, ...args) {
    const { delegate } = animationFrameProvider;
    return delegate?.cancelAnimationFrame?.(...args);
  },
  delegate: undefined,
};
