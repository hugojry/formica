import type { FieldNode, FormStore } from '@formica/core';
import { useCallback, useSyncExternalStore } from 'react';

export interface UseFieldReturn {
  node: FieldNode | undefined;
  onChange: (value: unknown) => void;
  setCombinatorIndex: (path: string, index: number) => void;
}

export function useField(path: string, store: FormStore): UseFieldReturn {
  const subscribe = useCallback(
    (onStoreChange: () => void) => store.subscribePath(path, () => onStoreChange()),
    [store, path],
  );

  const getSnapshot = useCallback(() => store.getModel().index.get(path), [store, path]);

  const node = useSyncExternalStore(subscribe, getSnapshot);

  const onChange = useCallback((value: unknown) => store.setData(path, value), [store, path]);

  const setCombinatorIndex = useCallback(
    (p: string, index: number) => store.setCombinatorIndex(p, index),
    [store],
  );

  return { node, onChange, setCombinatorIndex };
}
