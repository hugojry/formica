import { createElement } from 'react';
import type { ReactRendererProps } from '@formica/react';
import { hasType } from './tester-utils.js';
import type { FieldNode } from '@formica/core';

export function BooleanRenderer({ node, onChange }: ReactRendererProps) {
  const label = node.schema.title ?? node.path.split('/').pop() ?? '';

  return createElement('div', { style: { marginBottom: 8 } },
    createElement('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 } },
      createElement('input', {
        type: 'checkbox',
        checked: Boolean(node.value),
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.checked),
        readOnly: node.readOnly,
      }),
      label,
      node.required ? createElement('span', { style: { color: 'red' } }, ' *') : null,
    ),
    node.schema.description
      ? createElement('p', { style: { margin: '2px 0 0', fontSize: '0.85em', color: '#666' } }, node.schema.description)
      : null,
    ...((node.extensions.errors ?? []) as Array<{ message: string }>).map((err, i) =>
      createElement('p', {
        key: i,
        style: { margin: '2px 0 0', fontSize: '0.85em', color: '#d32f2f' },
      }, err.message),
    ),
  );
}

export function booleanTester(node: FieldNode): number {
  return hasType(node, 'boolean') ? 1 : -1;
}
