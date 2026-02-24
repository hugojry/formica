import { describe, expect, test } from 'bun:test';
import type { JSONSchema } from '@formica/core';
import { createFormStore } from '@formica/core';
import { createElement } from 'react';
import { FormProvider } from '../context.js';
import { useForm } from '../hooks/use-form.js';
import { act, renderHook } from './helpers.js';

const schema: JSONSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'integer' },
  },
};

function createWrapper(store: ReturnType<typeof createFormStore>) {
  return ({ children }: { children?: React.ReactNode }) =>
    createElement(FormProvider, { store }, children);
}

describe('useForm', () => {
  test('returns initial model', () => {
    const store = createFormStore(schema, { name: 'Alice', age: 30 });
    const { result } = renderHook(() => useForm(), {
      wrapper: createWrapper(store),
    });

    expect(result.current.model.root!.type).toBe('object');
    expect(result.current.model.index.get('/name')?.value).toBe('Alice');
  });

  test('re-renders on setData', () => {
    const store = createFormStore(schema, { name: 'Alice' });
    const { result } = renderHook(() => useForm(), {
      wrapper: createWrapper(store),
    });

    const modelBefore = result.current.model;

    act(() => {
      store.setData('/name', 'Bob');
    });

    expect(result.current.model.index.get('/name')?.value).toBe('Bob');
    expect(result.current.model).not.toBe(modelBefore);
  });

  test('setData is stable across renders', () => {
    const store = createFormStore(schema, { name: 'Alice' });
    const { result } = renderHook(() => useForm(), {
      wrapper: createWrapper(store),
    });

    const setDataBefore = result.current.setData;

    act(() => {
      store.setData('/name', 'Bob');
    });

    expect(result.current.setData).toBe(setDataBefore);
  });
});
