import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { createFormStore } from '@formica/core';
import type { JSONSchema } from '@formica/core';
import { FormProvider, useFormStore } from '../context.js';
import { renderHook } from './helpers.js';

const schema: JSONSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
  },
};

describe('useFormStore', () => {
  test('throws when used outside FormProvider', () => {
    expect(() => renderHook(() => useFormStore())).toThrow(
      'useFormStore must be used within a <FormProvider>',
    );
  });

  test('returns store when inside FormProvider with schema', () => {
    const wrapper = ({ children }: { children?: React.ReactNode }) =>
      createElement(FormProvider, { schema, initialData: { name: 'Alice' } }, children);

    const { result } = renderHook(() => useFormStore(), { wrapper });
    expect(result.current).toBeDefined();
    expect(result.current.getModel().root!.type).toBe('object');
  });

  test('returns external store when provided', () => {
    const store = createFormStore(schema, { name: 'Bob' });
    const wrapper = ({ children }: { children?: React.ReactNode }) =>
      createElement(FormProvider, { store }, children);

    const { result } = renderHook(() => useFormStore(), { wrapper });
    expect(result.current).toBe(store);
  });

  test('store ref is stable across re-renders', () => {
    const wrapper = ({ children }: { children?: React.ReactNode }) =>
      createElement(FormProvider, { schema }, children);

    const { result, rerender } = renderHook(() => useFormStore(), { wrapper });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
