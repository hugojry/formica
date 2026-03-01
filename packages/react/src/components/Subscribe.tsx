import type { FormState, FormStore } from '@formica/core';
import type { ReactNode } from 'react';
import { useCallback, useSyncExternalStore } from 'react';

export interface SubscribeProps<T> {
  selector: (state: FormState) => T;
  children: (value: T) => ReactNode;
}

export function createSubscribeComponent(storeRef: { current: FormStore }) {
  return function Subscribe<T>({ selector, children }: SubscribeProps<T>): ReactNode {
    const store = storeRef.current;

    const subscribe = useCallback(
      (onStoreChange: () => void) => store.subscribeState(onStoreChange),
      [],
    );

    const getSnapshot = useCallback(() => selector(store.getState()), [selector]);

    const value = useSyncExternalStore(subscribe, getSnapshot);

    return children(value);
  };
}
