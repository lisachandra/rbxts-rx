import { expect } from '@rbxts/jest-globals';
import { Error, Array } from '@rbxts/luau-polyfill';

/*
function stringify(x: any): string {
  return JSON.stringify(x, function (key: string, value: any) {
    if (Array.isArray(value)) {
      return (
        '[' +
        value.map(function (i) {
          return '\n\t' + stringify(i);
        }) +
        '\n]'
      );
    }
    return value;
  })
    .replace(/\\"/g, '"')
    .replace(/\\t/g, '\t')
    .replace(/\\n/g, '\n');
}
*/

function deleteErrorNotificationStack(marble: unknown) {
  const { notification } = marble as never;
  if (notification) {
    const { kind, error: err } = notification;
    if (kind === 'E' && (err as unknown) instanceof Error) {
      (notification as { error: unknown }).error = { name: (err as Error).name, message: (err as Error).message };
    }
  }
  return marble;
}

function run(fn: Callback) {
  fn();
}

export function observableMatcher(actual: unknown, expected: unknown) {
  if (Array.isArray<defined>(actual) && Array.isArray<defined>(expected)) {
    run(() => {
      actual = (actual as defined[]).map(deleteErrorNotificationStack);
      expected = (expected as defined[]).map(deleteErrorNotificationStack);
    });

    expect(actual).toEqual(expected);
    /*
    const passed = _G.isEqual(actual, expected);
    if (passed) {
      return;
    }

    let message = '\nExpected \n';
    actual.forEach((x: any) => (message += `\t${stringify(x)}\n`));

    message += '\t\nto deep equal \n';
    expected.forEach((x: any) => (message += `\t${stringify(x)}\n`));

    assert(passed, message);
    */
  } else {
    expect(actual).toEqual(expected);
  }
}
