import type { FormStore } from '@formica/core';
import { createContext, useContext } from 'react';

export const FormStoreContext = createContext<FormStore | null>(null);

export function useFormStore(): FormStore {
  const store = useContext(FormStoreContext);
  if (store === null) {
    throw new Error('useFormStore must be used within a useForm() provider');
  }
  return store;
}
