import { createElement } from 'react';
import type { ReactRendererProps } from '@formica/react';
import { hasType } from './tester-utils.js';
import type { FieldNode } from '@formica/core';

export function ObjectRenderer({ node, renderChild }: ReactRendererProps) {
  const label = node.schema.title ?? node.path.split('/').pop() ?? '';

  // Root object (empty path) renders children without fieldset wrapper
  if (node.path === '') {
    return createElement('div', null,
      ...node.children.map((child) => renderChild(child.path)),
    );
  }

  return createElement('fieldset', { style: { marginBottom: 8, padding: '8px 12px', border: '1px solid #ccc', borderRadius: 4 } },
    createElement('legend', { style: { fontWeight: 600 } }, label),
    node.schema.description
      ? createElement('p', { style: { margin: '0 0 8px', fontSize: '0.85em', color: '#666' } }, node.schema.description)
      : null,
    ...node.children.map((child) => renderChild(child.path)),
  );
}

export function objectTester(node: FieldNode): number {
  return hasType(node, 'object') ? 1 : -1;
}
