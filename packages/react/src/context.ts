import { createContext, createElement, useContext, useRef } from 'react';
import { createFormStore } from '@formica/core';
import type { FormStore, JSONSchema, PipelineConfig } from '@formica/core';

export const FormContext = createContext<FormStore | null>(null);

type InternalProviderProps = {
  schema: JSONSchema;
  initialData?: unknown;
  config?: PipelineConfig;
  children?: React.ReactNode;
};

type ExternalProviderProps = {
  store: FormStore;
  children?: React.ReactNode;
};

export type FormProviderProps = InternalProviderProps | ExternalProviderProps;

function isExternalProps(props: FormProviderProps): props is ExternalProviderProps {
  return 'store' in props;
}

export function FormProvider(props: FormProviderProps) {
  const storeRef = useRef<FormStore | null>(null);

  let store: FormStore;
  if (isExternalProps(props)) {
    store = props.store;
  } else {
    if (storeRef.current === null) {
      storeRef.current = createFormStore(props.schema, props.initialData, props.config);
    }
    store = storeRef.current;
  }

  return createElement(FormContext.Provider, { value: store }, props.children);
}

export function useFormStore(): FormStore {
  const store = useContext(FormContext);
  if (store === null) {
    throw new Error('useFormStore must be used within a <FormProvider>');
  }
  return store;
}
