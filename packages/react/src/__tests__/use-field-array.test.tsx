import { describe, expect, test } from 'bun:test';
import type { JSONSchema } from '@formica/core';
import { createFormStore } from '@formica/core';
import { useFieldArray } from '../hooks/use-field-array.js';
import { act, renderHook } from './helpers.js';

const schema: JSONSchema = {
  type: 'object',
  properties: {
    tags: {
      type: 'array',
      items: { type: 'string' },
    },
  },
};

describe('useFieldArray', () => {
  test('items returns children', () => {
    const store = createFormStore(schema, { tags: ['a', 'b', 'c'] });
    const { result } = renderHook(() => useFieldArray('/tags', store));

    expect(result.current.items).toHaveLength(3);
    expect(result.current.items[0]?.value).toBe('a');
    expect(result.current.items[2]?.value).toBe('c');
  });

  test('append adds to array', () => {
    const store = createFormStore(schema, { tags: ['a'] });
    const { result } = renderHook(() => useFieldArray('/tags', store));

    act(() => {
      result.current.append('b');
    });

    expect(result.current.items).toHaveLength(2);
    expect(result.current.items[1]?.value).toBe('b');
  });

  test('insert adds at index', () => {
    const store = createFormStore(schema, { tags: ['a', 'c'] });
    const { result } = renderHook(() => useFieldArray('/tags', store));

    act(() => {
      result.current.insert(1, 'b');
    });

    expect(result.current.items).toHaveLength(3);
    expect(result.current.items[0]?.value).toBe('a');
    expect(result.current.items[1]?.value).toBe('b');
    expect(result.current.items[2]?.value).toBe('c');
  });

  test('remove removes from array', () => {
    const store = createFormStore(schema, { tags: ['a', 'b', 'c'] });
    const { result } = renderHook(() => useFieldArray('/tags', store));

    act(() => {
      result.current.remove(1);
    });

    expect(result.current.items).toHaveLength(2);
    expect(result.current.items[0]?.value).toBe('a');
    expect(result.current.items[1]?.value).toBe('c');
  });

  test('replace replaces at index', () => {
    const store = createFormStore(schema, { tags: ['a', 'b', 'c'] });
    const { result } = renderHook(() => useFieldArray('/tags', store));

    act(() => {
      result.current.replace(1, 'B');
    });

    expect(result.current.items).toHaveLength(3);
    expect(result.current.items[1]?.value).toBe('B');
  });

  test('move reorders items', () => {
    const store = createFormStore(schema, { tags: ['a', 'b', 'c'] });
    const { result } = renderHook(() => useFieldArray('/tags', store));

    act(() => {
      result.current.move(0, 2);
    });

    expect(result.current.items).toHaveLength(3);
    expect(result.current.items[0]?.value).toBe('b');
    expect(result.current.items[1]?.value).toBe('c');
    expect(result.current.items[2]?.value).toBe('a');
  });

  test('swap exchanges two items', () => {
    const store = createFormStore(schema, { tags: ['a', 'b', 'c'] });
    const { result } = renderHook(() => useFieldArray('/tags', store));

    act(() => {
      result.current.swap(0, 2);
    });

    expect(result.current.items).toHaveLength(3);
    expect(result.current.items[0]?.value).toBe('c');
    expect(result.current.items[1]?.value).toBe('b');
    expect(result.current.items[2]?.value).toBe('a');
  });

  test('clear empties the array', () => {
    const store = createFormStore(schema, { tags: ['a', 'b', 'c'] });
    const { result } = renderHook(() => useFieldArray('/tags', store));

    act(() => {
      result.current.clear();
    });

    expect(result.current.items).toHaveLength(0);
  });

  test('works on initially empty array', () => {
    const store = createFormStore(schema, { tags: [] });
    const { result } = renderHook(() => useFieldArray('/tags', store));

    expect(result.current.items).toHaveLength(0);

    act(() => {
      result.current.append('first');
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]?.value).toBe('first');
  });
});
