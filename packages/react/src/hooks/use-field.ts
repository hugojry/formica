import { useCallback, useSyncExternalStore } from 'react';
import type { FieldNode } from '@formica/core';
import { useFormStore } from '../context.js';

export interface UseFieldReturn {
  node: FieldNode | undefined;
  onChange: (value: unknown) => void;
}

export function useField(path: string): UseFieldReturn {
  const store = useFormStore();

  const subscribe = useCallback(
    (onStoreChange: () => void) => store.subscribePath(path, () => onStoreChange()),
    [store, path],
  );

  const getSnapshot = useCallback(
    () => store.getModel().index.get(path),
    [store, path],
  );

  const node = useSyncExternalStore(subscribe, getSnapshot);

  const onChange = useCallback(
    (value: unknown) => store.setData(path, value),
    [store, path],
  );

  return { node, onChange };
}
