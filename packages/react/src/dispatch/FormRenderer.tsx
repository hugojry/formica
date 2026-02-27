import type { FormStore, JSONSchema, PipelineConfig } from '@formica/core';
import { composePropEnhancers, extractPropEnhancers } from '@formica/core';
import type { ReactNode } from 'react';
import { createElement, useMemo } from 'react';
import { FormProvider } from '../context.js';
import { FieldDispatch } from './FieldDispatch.js';
import type { ReactDispatchFn, ReactRendererEntry } from './renderer-context.js';
import { DispatchContext, PropEnhancerContext, RendererContext } from './renderer-context.js';

type InternalBaseProps = {
  schema: JSONSchema;
  initialData?: unknown;
  config?: PipelineConfig;
  children?: ReactNode;
};

type ExternalBaseProps = {
  store: FormStore;
  children?: ReactNode;
};

type WithDispatch = { dispatch: ReactDispatchFn; config?: PipelineConfig };
type WithRenderers = { renderers: ReactRendererEntry[] };

type InternalDispatchProps = InternalBaseProps & WithDispatch;
type InternalRendererProps = InternalBaseProps & WithRenderers;
type ExternalDispatchProps = ExternalBaseProps & WithDispatch;
type ExternalRendererProps = ExternalBaseProps & WithRenderers;

export type FormRendererProps =
  | InternalDispatchProps
  | InternalRendererProps
  | ExternalDispatchProps
  | ExternalRendererProps;

function isExternalProps(
  props: FormRendererProps,
): props is ExternalDispatchProps | ExternalRendererProps {
  return 'store' in props;
}

function isDispatchProps(
  props: FormRendererProps,
): props is InternalDispatchProps | ExternalDispatchProps {
  return 'dispatch' in props;
}

export function FormRenderer(props: FormRendererProps) {
  const { children } = props;

  const providerProps = isExternalProps(props)
    ? { store: props.store }
    : {
        schema: props.schema,
        initialData: props.initialData,
        config: props.config,
      };

  if (isDispatchProps(props)) {
    const config = props.config ?? ('store' in props ? undefined : undefined);
    return createElement(FormRendererDispatch, {
      providerProps,
      dispatch: props.dispatch,
      config,
      children,
    });
  }

  return createElement(
    FormProvider,
    providerProps,
    createElement(
      RendererContext.Provider,
      { value: props.renderers },
      createElement(FieldDispatch, { path: '' }),
      children,
    ),
  );
}

function FormRendererDispatch({
  providerProps,
  dispatch,
  config,
  children,
}: {
  providerProps: Record<string, any>;
  dispatch: ReactDispatchFn;
  config?: PipelineConfig;
  children?: ReactNode;
}) {
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
