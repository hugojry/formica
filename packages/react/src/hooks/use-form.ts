import { useCallback, useSyncExternalStore } from 'react';
import type { FormModel } from '@formica/core';
import { useFormStore } from '../context.js';

export interface UseFormReturn {
  model: FormModel;
  setData: (path: string, value: unknown) => void;
}

export function useForm(): UseFormReturn {
  const store = useFormStore();

  const subscribe = useCallback(
    (onStoreChange: () => void) => store.subscribe(() => onStoreChange()),
    [store],
  );

  const model = useSyncExternalStore(subscribe, () => store.getModel());

  return { model, setData: store.setData };
}
