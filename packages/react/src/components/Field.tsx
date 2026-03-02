import type { FieldNode, FormStore } from '@formica/core';
import type { ReactNode } from 'react';
import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react';

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

    const childrenRef = useRef(children);
    childrenRef.current = children;

    // Version increments only when the store notifies this path, serving as
    // a stable memo key that doesn't change on unrelated parent re-renders.
    const versionRef = useRef(0);

    const subscribe = useCallback(
      (onStoreChange: () => void) =>
        store.subscribePath(path, () => {
          versionRef.current++;
          onStoreChange();
        }),
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

    // Memo deps use version (changes on store notification) and node.value
    // (catches array re-indexing where the path now points to different data
    // without a direct store notification). setByPath preserves value identity
    // for unaffected sub-trees, so unrelated changes won't break the cache.
    return useMemo(
      () => childrenRef.current({ node, value: node.value, handleChange, setCombinatorIndex }),
      [versionRef.current, node.value, handleChange, setCombinatorIndex],
    );
  };
}
