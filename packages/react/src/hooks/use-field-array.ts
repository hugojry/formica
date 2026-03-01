import type { FieldNode, FormStore } from '@formica/core';
import { getByPath } from '@formica/core';
import { useCallback } from 'react';
import { useField } from './use-field.js';

export interface UseFieldArrayReturn {
  node: FieldNode | undefined;
  items: FieldNode[];
  append: (value: unknown) => void;
  insert: (index: number, value: unknown) => void;
  remove: (index: number) => void;
  replace: (index: number, value: unknown) => void;
  move: (from: number, to: number) => void;
  swap: (indexA: number, indexB: number) => void;
  clear: () => void;
}

export function useFieldArray(path: string, store: FormStore): UseFieldArrayReturn {
  const { node } = useField(path, store);

  const items = node?.children ?? [];

  const append = useCallback(
    (value: unknown) => {
      const current = getByPath(store.getData(), path);
      const arr = Array.isArray(current) ? [...current, value] : [value];
      store.setData(path, arr);
    },
    [store, path],
  );

  const insert = useCallback(
    (index: number, value: unknown) => {
      const current = getByPath(store.getData(), path);
      if (!Array.isArray(current)) return;
      const arr = [...current];
      arr.splice(index, 0, value);
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

  const replace = useCallback(
    (index: number, value: unknown) => {
      const current = getByPath(store.getData(), path);
      if (!Array.isArray(current)) return;
      const arr = [...current];
      arr[index] = value;
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

  const swap = useCallback(
    (indexA: number, indexB: number) => {
      const current = getByPath(store.getData(), path);
      if (!Array.isArray(current)) return;
      const arr = [...current];
      const tmp = arr[indexA];
      arr[indexA] = arr[indexB];
      arr[indexB] = tmp;
      store.setData(path, arr);
    },
    [store, path],
  );

  const clear = useCallback(() => {
    store.setData(path, []);
  }, [store, path]);

  return { node, items, append, insert, remove, replace, move, swap, clear };
}
