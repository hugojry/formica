import { useCallback } from 'react';
import { getByPath } from '@formica/core';
import type { FieldNode } from '@formica/core';
import { useFormStore } from '../context.js';
import { useField } from './use-field.js';

export interface UseFieldArrayReturn {
  node: FieldNode | undefined;
  items: FieldNode[];
  append: (value: unknown) => void;
  remove: (index: number) => void;
  move: (from: number, to: number) => void;
}

export function useFieldArray(path: string): UseFieldArrayReturn {
  const store = useFormStore();
  const { node } = useField(path);

  const items = node?.children ?? [];

  const append = useCallback(
    (value: unknown) => {
      const current = getByPath(store.getData(), path);
      const arr = Array.isArray(current) ? [...current, value] : [value];
      store.setData(path, arr);
    },
    [store, path],
  );

  const remove = useCallback(
    (index: number) => {
      const current = getByPath(store.getData(), path);
      if (!Array.isArray(current)) return;
      const arr = current.filter((_, i) => i !== index);
      store.setData(path, arr);
    },
    [store, path],
  );

  const move = useCallback(
    (from: number, to: number) => {
      const current = getByPath(store.getData(), path);
      if (!Array.isArray(current)) return;
      const arr = [...current];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      store.setData(path, arr);
    },
    [store, path],
  );

  return { node, items, append, remove, move };
}
