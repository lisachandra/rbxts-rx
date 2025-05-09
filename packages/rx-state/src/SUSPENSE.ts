import { Symbol } from '@rbxts/luau-polyfill';
import type { SUSPENSE as iSUSPENSE } from './types';
export const SUSPENSE: iSUSPENSE = Symbol.for('SUSPENSE') as any;
export type SUSPENSE = iSUSPENSE;
