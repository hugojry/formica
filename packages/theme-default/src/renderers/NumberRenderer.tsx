import { createElement } from 'react';
import type { ReactRendererProps } from '@formica/react';
import { hasType, hasEnum } from './tester-utils.js';
import type { FieldNode } from '@formica/core';

export function NumberRenderer({ node, onChange }: ReactRendererProps) {
  const label = node.schema.title ?? node.path.split('/').pop() ?? '';

  return createElement('div', { style: { marginBottom: 8 } },
    createElement('label', { style: { display: 'block', marginBottom: 2, fontWeight: 500 } },
      label,
      node.required ? createElement('span', { style: { color: 'red' } }, ' *') : null,
    ),
    node.schema.description
      ? createElement('p', { style: { margin: '0 0 4px', fontSize: '0.85em', color: '#666' } }, node.schema.description)
      : null,
    createElement('input', {
      type: 'number',
      value: node.value != null ? String(node.value) : '',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        onChange(v === '' ? undefined : Number(v));
      },
      readOnly: node.readOnly,
      min: node.constraints.minimum,
      max: node.constraints.maximum,
      step: node.constraints.multipleOf ?? (hasType(node, 'integer') ? 1 : undefined),
      style: { width: '100%', padding: '4px 8px', boxSizing: 'border-box' as const },
    }),
    ...((node.extensions.errors ?? []) as Array<{ message: string }>).map((err, i) =>
      createElement('p', {
        key: i,
        style: { margin: '2px 0 0', fontSize: '0.85em', color: '#d32f2f' },
      }, err.message),
    ),
  );
}

export function numberTester(node: FieldNode): number {
  return (hasType(node, 'number') || hasType(node, 'integer')) && !hasEnum(node) ? 1 : -1;
}
