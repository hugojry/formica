import type { DispatchFn, PropEnhancer, RendererEntry, RendererProps } from '@formica/core';
import type { ComponentType, ReactNode } from 'react';
import { createContext, useContext } from 'react';

export type ReactRendererProps = RendererProps<ReactNode>;

export type ReactRendererEntry = RendererEntry<ComponentType<ReactRendererProps>>;

export type ReactDispatchFn = DispatchFn<ComponentType<any>>;

// Legacy context (tester-based)
export const RendererContext = createContext<ReactRendererEntry[]>([]);

export function useRenderers(): ReactRendererEntry[] {
  return useContext(RendererContext);
}

// Dispatch context (new API)
export const DispatchContext = createContext<ReactDispatchFn | null>(null);

export function useDispatch(): ReactDispatchFn | null {
  return useContext(DispatchContext);
}

// Prop enhancer context
export const PropEnhancerContext = createContext<PropEnhancer | null>(null);

export function usePropEnhancer(): PropEnhancer | null {
  return useContext(PropEnhancerContext);
}
