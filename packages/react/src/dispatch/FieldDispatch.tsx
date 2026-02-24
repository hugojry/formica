import type { ReactNode } from 'react';
import { createElement } from 'react';
import { useField } from '../hooks/use-field.js';
import { useRenderers } from './renderer-context.js';
import { resolveRenderer } from './resolve-renderer.js';

export interface FieldDispatchProps {
  path: string;
}

export function FieldDispatch({ path }: FieldDispatchProps) {
  const { node, onChange, setCombinatorIndex } = useField(path);
  const renderers = useRenderers();

  if (!node || !node.active) return null;

  const Renderer = resolveRenderer(node, renderers);
  if (!Renderer) return null;

  const renderChild = (childPath: string): ReactNode =>
    createElement(FieldDispatch, { key: childPath, path: childPath });

  return createElement(Renderer, {
    node,
    onChange,
    setCombinatorIndex,
    renderChild,
  });
}
