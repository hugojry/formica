import type {
  FieldNode,
  FormStore,
  JSONSchema,
  PipelineConfig,
  PipelineContext,
} from '@formica/core';
import { createFormStore } from '@formica/core';
import type { ReactNode } from 'react';
import { useRef } from 'react';
import type { FieldProps } from '../components/Field.js';
import { createFieldComponent } from '../components/Field.js';
import type { SubscribeProps } from '../components/Subscribe.js';
import { createSubscribeComponent } from '../components/Subscribe.js';

export interface UseFormOptions {
  schema: JSONSchema;
  initialData?: unknown;
  config?: PipelineConfig;
}

export interface FormApi {
  Field: (props: FieldProps) => ReactNode;
  Subscribe: <T>(props: SubscribeProps<T>) => ReactNode;
  setData: (path: string, value: unknown) => void;
  getData: () => unknown;
  getFieldNode: (path: string) => FieldNode | undefined;
  setCombinatorIndex: (path: string, index: number) => void;
  getModel: () => PipelineContext;
}

export function useForm(options: UseFormOptions): FormApi {
  const storeRef = useRef<FormStore | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createFormStore(options.schema, options.initialData, options.config);
  }
  const store = storeRef.current;
  const storeAccessRef = useRef(store);
  storeAccessRef.current = store;

  const fieldRef = useRef<((props: FieldProps) => ReactNode) | null>(null);
  if (fieldRef.current === null) {
    fieldRef.current = createFieldComponent(storeAccessRef as { current: FormStore });
  }

  const subscribeRef = useRef<(<T>(props: SubscribeProps<T>) => ReactNode) | null>(null);
  if (subscribeRef.current === null) {
    subscribeRef.current = createSubscribeComponent(storeAccessRef as { current: FormStore });
  }

  return {
    Field: fieldRef.current,
    Subscribe: subscribeRef.current,
    setData: store.setData,
    getData: store.getData,
    getFieldNode: (path: string) => store.getModel().index.get(path),
    setCombinatorIndex: store.setCombinatorIndex,
    getModel: store.getModel,
  };
}
