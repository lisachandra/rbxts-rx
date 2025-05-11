import { Error } from '@rbxts/luau-polyfill';

interface MockReadableStreamDefaultController<R = any> {
  getDesiredSize(): number | null;
  enqueue(chunk: R): void;
  close(): void;
  error(e?: any): void;
}

interface MockUnderlyingSource<R = any> {
  start?(controller: MockReadableStreamDefaultController<R>): void | Promise<void>;
  pull?(controller: MockReadableStreamDefaultController<R>): void | Promise<void>;
  cancel?(reason?: any): void | Promise<void>;
}

class MockReadableStreamDefaultControllerImpl<R> implements MockReadableStreamDefaultController<R> {
  private stream: MockReadableStreamImpl<R>;

  constructor(stream: MockReadableStreamImpl<R>) {
    this.stream = stream;
  }

  getDesiredSize(): number | null {
    if (this.stream._state !== 'readable') return 0;
    // Simplified: returns 1 if a read is pending and the stream is open and queue empty, otherwise 0.
    // A more compliant version would use a high water mark.
    if (this.stream._pendingReadRequest && this.stream._queue.size() === 0) return 1;
    // If no pending read, but queue is empty, we might still want to pull to fill buffer.
    // For this mock, let's say HWM=1. So if queue is empty, desiredSize is 1.
    return this.stream._queue.size() === 0 ? 1 : 0;
  }

  enqueue(chunk: R): void {
    if (this.stream._state !== 'readable') {
      throw new Error('Controller cannot enqueue to a non-readable stream.');
    }
    this.stream._enqueue(chunk);
  }

  close(): void {
    if (this.stream._state !== 'readable') {
      return; // No-op if already closed/errored by controller action
    }
    this.stream._close();
  }

  error(e?: any): void {
    if (this.stream._state !== 'readable') {
      return; // No-op
    }
    this.stream._error(e);
  }
}

class MockReadableStreamDefaultReaderImpl<R> {
  private stream: MockReadableStreamImpl<R>;
  private _closedPromise: Promise<void>;
  private _resolveClosed!: () => void;
  private _rejectClosed!: (reason?: any) => void;
  private _isActive: boolean = true; // Tracks if the reader is still associated and usable

  constructor(stream: MockReadableStreamImpl<R>) {
    if (stream.locked) {
      throw new Error('ReadableStream is locked.');
    }
    this.stream = stream;
    this.stream.locked = true;
    this.stream._reader = this; // Associate this reader with the stream

    this._closedPromise = new Promise<void>((resolve, reject) => {
      this._resolveClosed = resolve;
      this._rejectClosed = reject;
    });
    // Register this reader with the stream so its closed promise can be settled
    this.stream._registerReader(this);
  }

  getClosed(): Promise<void> {
    return this._closedPromise;
  }

  _settleClosedPromise(isClosed: boolean, reason?: any): void {
    if (!this._isActive) return; // Avoid settling if already released/cancelled and handled
    if (isClosed) {
      this._resolveClosed();
    } else {
      this._rejectClosed(reason);
    }
    // Once settled, the promise doesn't change. _isActive reflects usability.
  }

  async read(): Promise<
    | {
        done: false;
        value: R;
      }
    | { done: true; value?: undefined }
  > {
    if (!this._isActive || !this.stream.locked || this.stream._reader !== this) {
      throw new Error('This reader has been released or is not the active reader for this stream.');
    }
    return this.stream._read();
  }

  releaseLock(): void {
    if (!this._isActive || !this.stream.locked || this.stream._reader !== this) {
      return; // No-op if not active or not locked by this reader
    }
    // The reader becomes inactive. Its stream association is broken by _releaseLock.
    this._isActive = false;
    this.stream._releaseLock();
    // Note: Spec behavior for reader.closed upon releaseLock is complex.
    // If stream is readable, it might reject. If stream is closed/errored, it reflects that.
    // For this mock, _settleClosedPromise is primarily driven by stream termination.
  }

  async cancel(reason?: any): Promise<void> {
    if (!this._isActive || !this.stream.locked || this.stream._reader !== this) {
      throw new Error('Cannot cancel a stream via an inactive or non-owning reader.');
    }
    this._isActive = false; // Cancelling makes the reader inactive
    return this.stream._cancel(reason); // Stream's cancel handles lock release & closed promise
  }
}

class MockReadableStreamImpl<R = any> {
  public locked = false;
  private _underlyingSource: MockUnderlyingSource<R>;
  private _controller!: MockReadableStreamDefaultControllerImpl<R>;
  _state: 'readable' | 'closed' | 'errored' = 'readable';
  private _storedError: any;
  _queue: R[] = [];
  _pendingReadRequest:
    | {
        resolve: (
          result:
            | {
                done: false;
                value: R;
              }
            | { done: true; value?: undefined }
        ) => void;
        reject: (reason?: any) => void;
      }
    | undefined;
  private _pulling = false;
  _reader: MockReadableStreamDefaultReaderImpl<R> | undefined = undefined;
  private _startedPromise: Promise<void>;

  constructor(underlyingSource: MockUnderlyingSource<R> = {}) {
    this._underlyingSource = underlyingSource;
    this._controller = new MockReadableStreamDefaultControllerImpl(this);

    // Call underlyingSource.start asynchronously
    this._startedPromise = Promise.resolve()
      .then(() => {
        if (this._underlyingSource['start' as never]) {
          return this._underlyingSource.start!(this._controller);
        }
      })
      .then(() => {
        // After start, if there's a need, pull.
        // A pull is typically needed if a read is pending or to fill buffer.
        this._callPullIfNeeded();
      })
      .catch((e) => {
        if (this._state === 'readable') {
          this._error(e); // Error the stream if start() fails
        }
      });
  }

  getReader(): MockReadableStreamDefaultReaderImpl<R> {
    if (this.locked) {
      throw new Error('ReadableStream is locked.');
    }
    // A new reader is created each time.
    return new MockReadableStreamDefaultReaderImpl(this);
  }

  _registerReader(reader: MockReadableStreamDefaultReaderImpl<R>): void {
    // If stream is already settled, settle reader's closed promise immediately
    if (this._state === 'closed') {
      reader._settleClosedPromise(true);
    } else if (this._state === 'errored') {
      reader._settleClosedPromise(false, this._storedError);
    }
    // Otherwise, it will be settled when the stream transitions state (_close, _error, _cancel)
  }

  _enqueue(chunk: R): void {
    // This is called by the controller. Controller already checks _state.
    if (this._pendingReadRequest) {
      const pending = this._pendingReadRequest;
      this._pendingReadRequest = undefined;
      pending.resolve({ value: chunk, done: false });
    } else {
      (this._queue as defined[]).push(chunk as defined);
    }
    // After enqueue, a pull might not be immediately needed if queue has items.
    // _callPullIfNeeded will be invoked by read() if queue becomes empty.
  }

  _close(): void {
    // Called by controller. Controller checks _state.
    this._state = 'closed';
    if (this._pendingReadRequest) {
      const pending = this._pendingReadRequest;
      this._pendingReadRequest = undefined;
      pending.resolve({ value: undefined, done: true });
    }
    // Settle the active reader's closed promise, if any
    if (this._reader) {
      this._reader._settleClosedPromise(true);
    }
  }

  _error(e?: any): void {
    // Called by controller. Controller checks _state.
    this._state = 'errored';
    this._storedError = e;
    if (this._pendingReadRequest) {
      const pending = this._pendingReadRequest;
      this._pendingReadRequest = undefined;
      pending.reject(e);
    }
    // Settle the active reader's closed promise, if any
    if (this._reader) {
      this._reader._settleClosedPromise(false, e);
    }
  }

  async _read(): Promise<
    | {
        done: false;
        value: R;
      }
    | { done: true; value?: undefined }
  > {
    await this._startedPromise; // Ensure stream start logic has completed

    if (this._queue.size() > 0) {
      const chunk = (this._queue as defined[]).shift()!;
      this._callPullIfNeeded(); // May need to pull more after consuming from queue
      return { value: chunk as R, done: false };
    }
    if (this._state === 'closed') {
      return { value: undefined, done: true };
    }
    if (this._state === 'errored') {
      throw this._storedError; // Should reject the promise
    }
    // State is 'readable' and queue is empty, wait for data
    return new Promise((resolve, reject) => {
      this._pendingReadRequest = { resolve, reject };
      this._callPullIfNeeded(); // Request more data
    });
  }

  _callPullIfNeeded(): void {
    // Only pull if readable, not already pulling, and desiredSize > 0 (simplified)
    if (this._underlyingSource.pull && this._state === 'readable' && !this._pulling && (this._controller.getDesiredSize() ?? 0) > 0) {
      this._pulling = true;
      // Ensure pull is called asynchronously and errors are caught
      Promise.resolve()
        .then(() => this._underlyingSource.pull!(this._controller))
        .catch((e) => {
          if (this._state === 'readable') this._error(e);
        })
        .finally(() => {
          this._pulling = false;
          // If a read is still pending and pull didn't satisfy it,
          // and desiredSize is still > 0, another pull might be scheduled.
          // This simplified model relies on read() re-triggering pull if necessary.
        });
    }
  }

  async _cancel(reason?: any): Promise<void> {
    await this._startedPromise;

    if (this._state === 'closed' || this._state === 'errored') {
      return;
    }

    const readerToSettle = this._reader; // Capture current reader

    // Mark stream as closing/cancelling
    this._state = 'closed'; // Tentatively closed; underlying cancel might error it
    this._queue = []; // Clear queue

    if (this._pendingReadRequest) {
      this._pendingReadRequest.resolve({ value: undefined, done: true });
      this._pendingReadRequest = undefined;
    }

    // Release lock *before* calling underlyingSource.cancel
    if (this.locked) {
      this._releaseLock(); // This also clears this._reader
    }

    try {
      if (this._underlyingSource['cancel' as never]) {
        await Promise.resolve(this._underlyingSource.cancel!(reason));
      }
      // If cancel succeeds, stream is confirmed closed. Settle reader's promise.
      if (readerToSettle) readerToSettle._settleClosedPromise(true);
    } catch (e: unknown) {
      // If cancel fails, stream becomes errored.
      this._state = 'errored';
      this._storedError = e;
      if (readerToSettle) readerToSettle._settleClosedPromise(false, e);
      throw e; // Promise returned by reader.cancel() should reject.
    }
  }

  _releaseLock(): void {
    if (!this.locked) return;
    this.locked = false;
    // Disassociate the reader that held the lock
    const formerReader = this._reader;
    this._reader = undefined;

    // If the stream is still readable when lock is released, spec says
    // the former reader's 'closed' promise should be rejected with a Error.
    // This handles cases where a reader is explicitly released while stream is fine.
    if (formerReader && this._state === 'readable') {
      formerReader._settleClosedPromise(false, new Error('Reader released.'));
    }
    // If stream was closed/errored, reader's promise is already (or will be) settled accordingly.
  }
}

export const ReadableStream = MockReadableStreamImpl;
