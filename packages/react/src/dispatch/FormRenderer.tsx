import type { FormStore, JSONSchema } from '@formica/core';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { FormProvider } from '../context.js';
import { FieldDispatch } from './FieldDispatch.js';
import type { ReactDispatchFn } from './renderer-context.js';
import { DispatchContext } from './renderer-context.js';

type InternalProps = {
  schema: JSONSchema;
  initialData?: unknown;
  dispatch: ReactDispatchFn;
  children?: ReactNode;
};

type ExternalProps = {
  store: FormStore;
  dispatch: ReactDispatchFn;
  children?: ReactNode;
};

export type FormRendererProps = InternalProps | ExternalProps;

function isExternalProps(props: FormRendererProps): props is ExternalProps {
  return 'store' in props;
}

export function FormRenderer(props: FormRendererProps) {
  const { dispatch, children } = props;

  const providerProps = isExternalProps(props)
    ? { store: props.store }
    : {
        schema: props.schema,
        initialData: props.initialData,
      };

  return createElement(
    FormProvider,
    providerProps,
    createElement(
      DispatchContext.Provider,
      { value: dispatch },
      createElement(FieldDispatch, { path: '' }),
      children,
    ),
  );
}
