import './setup.js';
import { describe, expect, test } from 'bun:test';
import type { JSONSchema } from '@formica/core';
import { getByPath } from '@formica/core';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { FormApi } from '../hooks/use-form.js';
import { useForm } from '../hooks/use-form.js';
import { act } from './helpers.js';

const schema: JSONSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['personal', 'business'] },
    name: { type: 'string' },
    age: { type: 'integer' },
    tags: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  if: { properties: { type: { const: 'business' } } },
  then: { properties: { company: { type: 'string' } } },
};

describe('Field — cascade prevention', () => {
  test('child Fields do not re-execute render prop when parent container re-renders', () => {
    let nameRenderCount = 0;
    let ageRenderCount = 0;
    let rootRenderCount = 0;
    let formApi: ReturnType<typeof useForm> | null = null;

    function App() {
      const form = useForm({
        schema,
        initialData: { type: 'personal', name: 'Alice', age: 30 },
      });
      formApi = form;
      const { Field } = form;

      return createElement(
        Field,
        { path: '' },
        () => {
          rootRenderCount++;
          return createElement(
            'div',
            null,
            createElement(Field, { path: '/name' }, ({ value }) => {
              nameRenderCount++;
              return createElement('span', null, String(value));
            }),
            createElement(Field, { path: '/age' }, ({ value }) => {
              ageRenderCount++;
              return createElement('span', null, String(value));
            }),
          );
        },
      );
    }

    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: ReturnType<typeof createRoot>;

    act(() => {
      root = createRoot(container);
      root.render(createElement(App));
    });

    // Initial render: everyone renders once
    expect(rootRenderCount).toBe(1);
    expect(nameRenderCount).toBe(1);
    expect(ageRenderCount).toBe(1);

    // Trigger a container-level change (conditional schema change)
    // This causes the root '' node to change, re-rendering the root Field's render prop.
    // But /name and /age nodes should NOT change, so their render props should NOT re-execute.
    act(() => {
      formApi!.setData('/type', 'business');
    });

    // Root re-renders because its node changed (new children set from conditional)
    expect(rootRenderCount).toBe(2);
    // Child fields should NOT re-execute their render props — their nodes didn't change
    expect(nameRenderCount).toBe(1);
    expect(ageRenderCount).toBe(1);

    // Verify data is still accessible
    expect(formApi!.getFieldNode('/name')?.value).toBe('Alice');

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  test('child Field re-renders when its own value changes', () => {
    let nameRenderCount = 0;
    let ageRenderCount = 0;
    let formApi: ReturnType<typeof useForm> | null = null;

    function App() {
      const form = useForm({
        schema,
        initialData: { type: 'personal', name: 'Alice', age: 30 },
      });
      formApi = form;
      const { Field } = form;

      return createElement(
        Field,
        { path: '' },
        () =>
          createElement(
            'div',
            null,
            createElement(Field, { path: '/name' }, ({ value }) => {
              nameRenderCount++;
              return createElement('span', null, String(value));
            }),
            createElement(Field, { path: '/age' }, ({ value }) => {
              ageRenderCount++;
              return createElement('span', null, String(value));
            }),
          ),
      );
    }

    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: ReturnType<typeof createRoot>;

    act(() => {
      root = createRoot(container);
      root.render(createElement(App));
    });

    expect(nameRenderCount).toBe(1);
    expect(ageRenderCount).toBe(1);

    // Change name — only /name should re-render
    act(() => {
      formApi!.setData('/name', 'Bob');
    });

    expect(nameRenderCount).toBe(2);
    expect(ageRenderCount).toBe(1);

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  test('array item Fields reflect correct values after removing the first element', () => {
    const renderedValues: string[] = [];
    let formApi: FormApi | null = null;

    function App() {
      const form = useForm({
        schema,
        initialData: { tags: ['a', 'b', 'c'] },
      });
      formApi = form;
      const { Field } = form;

      return createElement(Field, { path: '/tags' }, ({ node }) =>
        createElement(
          'div',
          null,
          node.children.map((item: { path: string }, i: number) =>
            createElement(Field, { key: item.path, path: item.path }, ({ value }) => {
              renderedValues.push(`${item.path}=${value}`);
              return createElement(
                'div',
                null,
                createElement('span', null, String(value)),
                createElement('button', {
                  'data-index': i,
                  onClick: () => {
                    const currentArr = getByPath(form.getData(), '/tags') as unknown[];
                    const arr = currentArr.filter((_: unknown, idx: number) => idx !== i);
                    form.setData('/tags', arr);
                  },
                }),
              );
            }),
          ),
        ),
      );
    }

    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: ReturnType<typeof createRoot>;

    act(() => {
      root = createRoot(container);
      root.render(createElement(App));
    });

    // Verify initial render
    expect(container.querySelectorAll('span').length).toBe(3);
    expect(container.querySelectorAll('span')[0]!.textContent).toBe('a');
    expect(container.querySelectorAll('span')[1]!.textContent).toBe('b');
    expect(container.querySelectorAll('span')[2]!.textContent).toBe('c');

    // Click remove on the first item (index 0)
    act(() => {
      const currentArr = getByPath(formApi!.getData(), '/tags') as unknown[];
      const arr = currentArr.filter((_: unknown, idx: number) => idx !== 0);
      formApi!.setData('/tags', arr);
    });

    // After removing 'a', should show ['b', 'c']
    expect(container.querySelectorAll('span').length).toBe(2);
    expect(container.querySelectorAll('span')[0]!.textContent).toBe('b');
    expect(container.querySelectorAll('span')[1]!.textContent).toBe('c');

    // Verify underlying data
    expect(formApi!.getData()).toEqual({ tags: ['b', 'c'] });

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
