import type { FieldNode, FormStore } from '@formica/core';
import { useCallback, useRef, useSyncExternalStore } from 'react';

export interface UseFieldReturn {
  node: FieldNode | undefined;
  onChange: (value: unknown) => void;
  setCombinatorIndex: (path: string, index: number) => void;
}

export function useField(path: string, store: FormStore): UseFieldReturn {
  // Keep a stable node reference that only updates when the store notifies
  // this path or the value at this path changes (e.g. array re-indexing).
  // This prevents parent re-renders from cascading through useSyncExternalStore,
  // since a pipeline rebuild creates new node objects for every path.
  const nodeRef = useRef<FieldNode | undefined>(undefined);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      nodeRef.current = store.getModel().index.get(path);
      return store.subscribePath(path, (node) => {
        nodeRef.current = node;
        onStoreChange();
      });
    },
    [store, path],
  );

  const getSnapshot = useCallback(() => {
    const currentNode = store.getModel().index.get(path);
    if (!nodeRef.current || !currentNode) {
      nodeRef.current = currentNode;
    } else if (nodeRef.current.value !== currentNode.value) {
      // Catches array re-indexing where the path now points to different data
      // without a direct store notification for this path.
      nodeRef.current = currentNode;
    }
    return nodeRef.current;
  }, [store, path]);

  const node = useSyncExternalStore(subscribe, getSnapshot);

  const onChange = useCallback((value: unknown) => store.setData(path, value), [store, path]);

  const setCombinatorIndex = useCallback(
    (p: string, index: number) => store.setCombinatorIndex(p, index),
    [store],
  );

  return { node, onChange, setCombinatorIndex };
}
