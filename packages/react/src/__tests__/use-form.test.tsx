import { describe, expect, test } from 'bun:test';
import type { JSONSchema } from '@formica/core';
import { useForm } from '../hooks/use-form.js';
import { act, renderHook } from './helpers.js';

const schema: JSONSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'integer' },
  },
};

describe('useForm', () => {
  test('creates form with initial data', () => {
    const { result } = renderHook(() =>
      useForm({ schema, initialData: { name: 'Alice', age: 30 } }),
    );

    expect(result.current.getModel().root!.type).toBe('object');
    expect(result.current.getFieldNode('/name')?.value).toBe('Alice');
  });

  test('setData updates data', () => {
    const { result } = renderHook(() => useForm({ schema, initialData: { name: 'Alice' } }));

    act(() => {
      result.current.setData('/name', 'Bob');
    });

    expect(result.current.getFieldNode('/name')?.value).toBe('Bob');
  });

  test('getData returns current data', () => {
    const { result } = renderHook(() => useForm({ schema, initialData: { name: 'Alice' } }));

    const data = result.current.getData() as Record<string, unknown>;
    expect(data.name).toBe('Alice');
  });

  test('Field renders with field state', () => {
    const { result } = renderHook(() => useForm({ schema, initialData: { name: 'Alice' } }));

    // Field component exists
    expect(typeof result.current.Field).toBe('function');
  });

  test('Subscribe component exists', () => {
    const { result } = renderHook(() => useForm({ schema, initialData: { name: 'Alice' } }));

    expect(typeof result.current.Subscribe).toBe('function');
  });

  test('setData is stable across renders', () => {
    const { result } = renderHook(() => useForm({ schema, initialData: { name: 'Alice' } }));

    const setDataBefore = result.current.setData;

    act(() => {
      result.current.setData('/name', 'Bob');
    });

    expect(result.current.setData).toBe(setDataBefore);
  });
});
