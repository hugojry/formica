import { createElement } from 'react';
import type { ReactNode } from 'react';
import type { FormStore, JSONSchema, PipelineConfig } from '@formica/core';
import { FormProvider } from '../context.js';
import { RendererContext } from './renderer-context.js';
import type { ReactRendererEntry } from './renderer-context.js';
import { FieldDispatch } from './FieldDispatch.js';

type InternalFormRendererProps = {
  schema: JSONSchema;
  initialData?: unknown;
  config?: PipelineConfig;
  renderers: ReactRendererEntry[];
  children?: ReactNode;
};

type ExternalFormRendererProps = {
  store: FormStore;
  renderers: ReactRendererEntry[];
  children?: ReactNode;
};

export type FormRendererProps = InternalFormRendererProps | ExternalFormRendererProps;

function isExternalProps(props: FormRendererProps): props is ExternalFormRendererProps {
  return 'store' in props;
}

export function FormRenderer(props: FormRendererProps) {
  const { renderers, children } = props;

  const providerProps = isExternalProps(props)
    ? { store: props.store }
    : { schema: props.schema, initialData: props.initialData, config: props.config };

  return createElement(
    FormProvider,
    providerProps,
    createElement(
      RendererContext.Provider,
      { value: renderers },
      createElement(FieldDispatch, { path: '' }),
      children,
    ),
  );
}
