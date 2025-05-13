import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { Error, Array, Object, setTimeout, setInterval, clearTimeout, clearInterval } from '@rbxts/luau-polyfill';
import { render, screen } from '@rbxts/react-testing-library';
import React, { createContext, useContext } from '@rbxts/react';
import { of } from '@rbxts/rx';
import { contextBinder } from '@rbxts/react-rx/out/utils/index';

describe('contextBinder', () => {
  it('bounds the provided context into the first args of the hook', () => {
    const idContext = createContext<string>('id1');
    const countContext = createContext<number>(3);
    const useId = () => useContext(idContext);
    const useCount = () => useContext(countContext);
    const idCountBind = contextBinder(useId, useCount);

    const [useSomething] = idCountBind(
      (id: string, count: number, append: string) => of(Array.concat(table.create(count, id), append).join('-')),
      ''
    );

    const Result: React.FC = () => <textlabel Text={`Result ${useSomething('bar')}`} />;

    const Component: React.FC<{ id: string; count: number }> = ({ id, count }) => {
      return (
        <idContext.Provider value={id}>
          <countContext.Provider value={count}>
            <Result />
          </countContext.Provider>
        </idContext.Provider>
      );
    };

    render(<Component id="foo" count={4} />);

    expect(screen.queryByText('Result foo-foo-foo-foo-bar')).never.toBeNull();
  });

  it('the returned function matches the signature of the original one', () => {
    const idContext = createContext<string>('id1');
    const countContext = createContext<number>(3);
    const useId = () => useContext(idContext);
    const useCount = () => useContext(countContext);
    const idCountBind = contextBinder(useId, useCount);

    const [, getSomething0] = idCountBind(
      (id: string, count: number, append: string) => of(Array.concat(table.create(count, id), append).join('-')),
      ''
    );

    let value = '';
    getSomething0('foo', 4, 'bar').subscribe((v) => {
      value = v;
    });

    expect(value).toBe('foo-foo-foo-foo-bar');
  });
});
