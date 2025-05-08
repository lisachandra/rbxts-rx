import { Number } from '@rbxts/luau-polyfill';

/*
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isInteger#Polyfill
const NumberIsInteger: typeof Number.isInteger = Number.isInteger || function (value) {
  return typeof value === 'number'
    && isFinite(value)
    && Math.floor(value) === value;
};
*/

export default Number.isInteger;
