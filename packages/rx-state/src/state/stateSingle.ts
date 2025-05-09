import { Observable } from '@rbxts/rx';
import StateObservable from '../internal/state-observable';

export default function state<T>(observable: Observable<T>, defaultValue: T) {
  return new StateObservable<T>(observable, defaultValue);
}
