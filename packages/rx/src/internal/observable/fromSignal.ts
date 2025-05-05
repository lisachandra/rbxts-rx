import { Observable } from 'internal/Observable';
import { SignalLike, ConnectionLike } from 'internal/types';

const connect = (signal: SignalLike, callback: Callback): ConnectionLike => {
  if (typeIs(signal, 'RBXScriptSignal')) {
    // With deferred events, a "hard disconnect" is necessary to avoid causing
    // state updates after a component unmounts. Use 'Connected' to check if
    // the connection is still valid before invoking the callback.
    // https://devforum.roblox.com/t/deferred-engine-events/2276564/99
    const connection = signal.Connect((...args: unknown[]) => {
      if (connection.Connected) {
        return callback(...args);
      }
    });
    return connection;
  } else if ('Connect' in signal) {
    return signal.Connect(callback);
  } else if ('connect' in signal) {
    return signal.connect(callback);
  } else if ('subscribe' in signal) {
    return signal.subscribe(callback);
  } else {
    throw 'Event-like object does not have a supported connect method.';
  }
};

const disconnect = (connection: ConnectionLike) => {
  if (typeIs(connection, 'function')) {
    connection();
  } else if (typeIs(connection, 'RBXScriptConnection') || 'Disconnect' in connection) {
    connection.Disconnect();
  } else if ('disconnect' in connection) {
    connection.disconnect();
  } else {
    throw 'Connection-like object does not have a supported disconnect method.';
  }
};

export function fromSignal<T extends SignalLike<C>, C extends Callback>(signal: T): Observable<Parameters<C>> {
  return new Observable((subscriber) => {
    const connection = connect(signal, (...args: any[]) => {
      subscriber.next(args as Parameters<C>);
    });
    return () => disconnect(connection);
  });
}
