import type { FieldNode, FormStore } from '@formica/core';
import type { ReactNode } from 'react';
import { useCallback, useSyncExternalStore } from 'react';

export interface FieldState {
  node: FieldNode;
  value: unknown;
  handleChange: (value: unknown) => void;
  setCombinatorIndex: (path: string, index: number) => void;
}

export interface FieldProps {
  path: string;
  children: (field: FieldState) => ReactNode;
}

export function createFieldComponent(storeRef: { current: FormStore }) {
  return function Field({ path, children }: FieldProps): ReactNode {
    const store = storeRef.current;

    const subscribe = useCallback(
      (onStoreChange: () => void) => store.subscribePath(path, () => onStoreChange()),
      [path],
    );

    const getSnapshot = useCallback(() => store.getModel().index.get(path), [path]);

    const node = useSyncExternalStore(subscribe, getSnapshot);

    const handleChange = useCallback((value: unknown) => store.setData(path, value), [path]);

    const setCombinatorIndex = useCallback(
      (p: string, index: number) => store.setCombinatorIndex(p, index),
      [],
    );

    if (!node) return null;

    return children({
      node,
      value: node.value,
      handleChange,
      setCombinatorIndex,
    });
  };
}
