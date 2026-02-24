import type { RendererEntry, RendererProps } from '@formica/core';
import type { ComponentType, ReactNode } from 'react';
import { createContext, useContext } from 'react';

export type ReactRendererProps = RendererProps<ReactNode>;

export type ReactRendererEntry = RendererEntry<ComponentType<ReactRendererProps>>;

export const RendererContext = createContext<ReactRendererEntry[]>([]);

export function useRenderers(): ReactRendererEntry[] {
  return useContext(RendererContext);
}
