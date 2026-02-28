import type { DispatchFn, PropEnhancer, RendererProps } from '@formica/core';
import type { ComponentType, ReactNode } from 'react';
import { createContext, useContext } from 'react';

export type ReactRendererProps = RendererProps<ReactNode>;

export type ReactDispatchFn = DispatchFn<ComponentType<any>>;

// Dispatch context
export const DispatchContext = createContext<ReactDispatchFn | null>(null);

export function useDispatch(): ReactDispatchFn | null {
  return useContext(DispatchContext);
}

// Prop enhancer context
export const PropEnhancerContext = createContext<PropEnhancer | null>(null);

export function usePropEnhancer(): PropEnhancer | null {
  return useContext(PropEnhancerContext);
}
