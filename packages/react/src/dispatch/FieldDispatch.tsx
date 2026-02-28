import type { ReactNode } from 'react';
import { createElement } from 'react';
import { useField } from '../hooks/use-field.js';
import { useDispatch, usePropEnhancer } from './renderer-context.js';

export interface FieldDispatchProps {
  path: string;
}

export function FieldDispatch({ path }: FieldDispatchProps) {
  const { node, onChange, setCombinatorIndex } = useField(path);
  const dispatch = useDispatch();
  const enhance = usePropEnhancer();

  if (!node || !node.active) return null;

  const Renderer = dispatch ? dispatch(node) : null;
  if (!Renderer) return null;

  const renderChild = (childPath: string): ReactNode =>
    createElement(FieldDispatch, { key: childPath, path: childPath });

  const enhanced = enhance ? enhance(node) : {};

  return createElement(Renderer, {
    node,
    onChange,
    setCombinatorIndex,
    renderChild,
    ...enhanced,
  });
}
