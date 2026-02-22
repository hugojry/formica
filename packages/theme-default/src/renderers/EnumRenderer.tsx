import { createElement } from 'react';
import type { ReactRendererProps } from '@formica/react';
import { hasEnum } from './tester-utils.js';
import type { FieldNode } from '@formica/core';

export function EnumRenderer({ node, onChange }: ReactRendererProps) {
  const label = node.schema.title ?? node.path.split('/').pop() ?? '';
  const options = node.constraints.enum ?? [];

  return createElement('div', { style: { marginBottom: 8 } },
    createElement('label', { style: { display: 'block', marginBottom: 2, fontWeight: 500 } },
      label,
      node.required ? createElement('span', { style: { color: 'red' } }, ' *') : null,
    ),
    node.schema.description
      ? createElement('p', { style: { margin: '0 0 4px', fontSize: '0.85em', color: '#666' } }, node.schema.description)
      : null,
    createElement('select', {
      value: node.value != null ? String(node.value) : '',
      onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
        const v = e.target.value;
        // Try to preserve the original type from enum values
        const match = options.find((o) => String(o) === v);
        onChange(match !== undefined ? match : v);
      },
      disabled: node.readOnly,
      style: { width: '100%', padding: '4px 8px', boxSizing: 'border-box' as const },
    },
      createElement('option', { value: '' }, '— Select —'),
      ...options.map((opt) =>
        createElement('option', { key: String(opt), value: String(opt) }, String(opt)),
      ),
    ),
  );
}

export function enumTester(node: FieldNode): number {
  return hasEnum(node) ? 3 : -1;
}
