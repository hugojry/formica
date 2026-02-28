import type { ReactNode } from 'react';
import { createElement } from 'react';
import { useField } from '../hooks/use-field.js';
import { useDispatch } from './renderer-context.js';

export interface FieldDispatchProps {
  path: string;
}

export function FieldDispatch({ path }: FieldDispatchProps) {
  const { node, onChange, setCombinatorIndex } = useField(path);
  const dispatch = useDispatch();

  if (!node || !node.active) return null;

  const Renderer = dispatch ? dispatch(node) : null;
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
