import { describe, expect, test } from 'bun:test';
import type { JSONSchema } from '@formica/core';
import { createFormStore } from '@formica/core';
import { useField } from '../hooks/use-field.js';
import { act, renderHook } from './helpers.js';

const schema: JSONSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'integer' },
    address: {
      type: 'object',
      properties: {
        street: { type: 'string' },
        city: { type: 'string' },
      },
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
    },
  },
};

describe('useField', () => {
  test('returns correct node for path', () => {
    const store = createFormStore(schema, { name: 'Alice', age: 30 });
    const { result } = renderHook(() => useField('/name', store));

    expect(result.current.node?.value).toBe('Alice');
    expect(result.current.node?.path).toBe('/name');
  });

  test('returns undefined for missing path', () => {
    const store = createFormStore(schema, { name: 'Alice' });
    const { result } = renderHook(() => useField('/nonexistent', store));

    expect(result.current.node).toBeUndefined();
  });

  test('re-renders when own path changes', () => {
    const store = createFormStore(schema, { name: 'Alice', age: 30 });
    const { result } = renderHook(() => useField('/name', store));

    act(() => {
      store.setData('/name', 'Bob');
    });

    expect(result.current.node?.value).toBe('Bob');
  });

  test('onChange wires to setData', () => {
    const store = createFormStore(schema, { name: 'Alice' });
    const { result } = renderHook(() => useField('/name', store));

    act(() => {
      result.current.onChange('Carol');
    });

    expect(store.getModel().index.get('/name')?.value).toBe('Carol');
    expect(result.current.node?.value).toBe('Carol');
  });
});

describe('useField — selective re-rendering', () => {
  test('does not re-render when a sibling field changes', () => {
    const store = createFormStore(schema, { name: 'Alice', age: 30 });
    const { result, renderCount } = renderHook(() => useField('/name', store));

    const initialRenders = renderCount.current;
    expect(result.current.node?.value).toBe('Alice');

    act(() => {
      store.setData('/age', 31);
    });

    expect(renderCount.current).toBe(initialRenders);
    expect(result.current.node?.value).toBe('Alice');
  });

  test('does not re-render when a deeply nested unrelated field changes', () => {
    const store = createFormStore(schema, {
      name: 'Alice',
      address: { street: '123 Main', city: 'Springfield' },
    });
    const { result, renderCount } = renderHook(() => useField('/name', store));

    const initialRenders = renderCount.current;

    act(() => {
      store.setData('/address/city', 'Shelbyville');
    });

    expect(renderCount.current).toBe(initialRenders);
    expect(result.current.node?.value).toBe('Alice');
  });

  test('does not re-render when an array sibling is mutated', () => {
    const store = createFormStore(schema, {
      name: 'Alice',
      tags: ['a', 'b'],
    });
    const { result, renderCount } = renderHook(() => useField('/name', store));

    const initialRenders = renderCount.current;

    act(() => {
      store.setData('/tags', ['a', 'b', 'c']);
    });

    expect(renderCount.current).toBe(initialRenders);
    expect(result.current.node?.value).toBe('Alice');
  });

  test('re-renders only the affected field among multiple subscribers', () => {
    const store = createFormStore(schema, { name: 'Alice', age: 30 });

    const nameHook = renderHook(() => useField('/name', store));
    const ageHook = renderHook(() => useField('/age', store));

    const nameRenders = nameHook.renderCount.current;
    const ageRenders = ageHook.renderCount.current;

    act(() => {
      store.setData('/name', 'Bob');
    });

    expect(nameHook.renderCount.current).toBe(nameRenders + 1);
    expect(nameHook.result.current.node?.value).toBe('Bob');

    expect(ageHook.renderCount.current).toBe(ageRenders);
    expect(ageHook.result.current.node?.value).toBe(30);
  });

  test('does not re-render when value is set to the same identity', () => {
    const store = createFormStore(schema, { name: 'Alice' });
    const { renderCount } = renderHook(() => useField('/name', store));

    const initialRenders = renderCount.current;

    act(() => {
      store.setData('/name', 'Alice');
    });

    expect(renderCount.current).toBe(initialRenders);
  });

  test('re-renders when a direct child changes', () => {
    const store = createFormStore(schema, {
      address: { street: '123 Main', city: 'Springfield' },
    });
    const { result, renderCount } = renderHook(() => useField('/address', store));

    const initialRenders = renderCount.current;

    act(() => {
      store.setData('/address/city', 'Shelbyville');
    });

    expect(renderCount.current).toBe(initialRenders + 1);
    const addressValue = result.current.node?.value as Record<string, unknown>;
    expect(addressValue.city).toBe('Shelbyville');
  });

  test('re-renders when a deeply nested descendant changes', () => {
    const deepSchema: JSONSchema = {
      type: 'object',
      properties: {
        level1: {
          type: 'object',
          properties: {
            level2: {
              type: 'object',
              properties: {
                level3: { type: 'string' },
              },
            },
          },
        },
      },
    };
    const store = createFormStore(deepSchema, {
      level1: { level2: { level3: 'deep' } },
    });
    const { result, renderCount } = renderHook(() => useField('/level1', store));

    const initialRenders = renderCount.current;

    act(() => {
      store.setData('/level1/level2/level3', 'deeper');
    });

    expect(renderCount.current).toBe(initialRenders + 1);
    const l1 = result.current.node?.value as any;
    expect(l1.level2.level3).toBe('deeper');
  });

  test('re-renders when an array item descendant changes', () => {
    const store = createFormStore(schema, {
      tags: ['a', 'b', 'c'],
    });
    const { result, renderCount } = renderHook(() => useField('/tags', store));

    const initialRenders = renderCount.current;

    act(() => {
      store.setData('/tags/1', 'B');
    });

    expect(renderCount.current).toBe(initialRenders + 1);
    const tags = result.current.node?.value as string[];
    expect(tags[1]).toBe('B');
  });

  test('multiple rapid changes to unrelated fields do not cause re-renders', () => {
    const store = createFormStore(schema, {
      name: 'Alice',
      age: 30,
      tags: ['a'],
    });
    const { renderCount } = renderHook(() => useField('/name', store));

    const initialRenders = renderCount.current;

    act(() => {
      store.setData('/age', 31);
      store.setData('/age', 32);
      store.setData('/age', 33);
      store.setData('/tags', ['a', 'b']);
    });

    expect(renderCount.current).toBe(initialRenders);
  });
});
