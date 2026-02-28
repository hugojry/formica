import type { FormStore, JSONSchema, PipelineConfig } from '@formica/core';
import { composePropEnhancers, extractPropEnhancers } from '@formica/core';
import type { ReactNode } from 'react';
import { createElement, useMemo } from 'react';
import { FormProvider } from '../context.js';
import { FieldDispatch } from './FieldDispatch.js';
import type { ReactDispatchFn } from './renderer-context.js';
import { DispatchContext, PropEnhancerContext } from './renderer-context.js';

type InternalProps = {
  schema: JSONSchema;
  initialData?: unknown;
  dispatch: ReactDispatchFn;
  config?: PipelineConfig;
  children?: ReactNode;
};

type ExternalProps = {
  store: FormStore;
  dispatch: ReactDispatchFn;
  config?: PipelineConfig;
  children?: ReactNode;
};

export type FormRendererProps = InternalProps | ExternalProps;

function isExternalProps(props: FormRendererProps): props is ExternalProps {
  return 'store' in props;
}

export function FormRenderer(props: FormRendererProps) {
  const { dispatch, config, children } = props;

  const providerProps = isExternalProps(props)
    ? { store: props.store }
    : {
        schema: props.schema,
        initialData: props.initialData,
        config: props.config,
      };

  const enhancer = useMemo(() => {
    const enhancers = extractPropEnhancers(config);
    return composePropEnhancers(enhancers);
  }, [config]);

  return createElement(
    FormProvider,
    providerProps,
    createElement(
      DispatchContext.Provider,
      { value: dispatch },
      createElement(
        PropEnhancerContext.Provider,
        { value: enhancer },
        createElement(FieldDispatch, { path: '' }),
        children,
      ),
    ),
  );
}
