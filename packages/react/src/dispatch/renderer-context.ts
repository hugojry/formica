import { createContext, useContext } from 'react';
import type { ComponentType, ReactNode } from 'react';
import type { RendererProps, RendererEntry } from '@formica/core';

export type ReactRendererProps = RendererProps<ReactNode>;

export type ReactRendererEntry = RendererEntry<ComponentType<ReactRendererProps>>;

export const RendererContext = createContext<ReactRendererEntry[]>([]);

export function useRenderers(): ReactRendererEntry[] {
  return useContext(RendererContext);
}
