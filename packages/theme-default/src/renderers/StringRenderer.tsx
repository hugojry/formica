import { createElement } from 'react';
import type { ReactRendererProps } from '@formica/react';
import { hasType, hasEnum } from './tester-utils.js';
import type { FieldNode } from '@formica/core';

function formatToInputType(format?: string): string {
  switch (format) {
    case 'email': return 'email';
    case 'uri':
    case 'uri-reference': return 'url';
    case 'date': return 'date';
    case 'date-time': return 'datetime-local';
    case 'time': return 'time';
    case 'password': return 'password';
    default: return 'text';
  }
}

export function StringRenderer({ node, onChange }: ReactRendererProps) {
  const label = node.schema.title ?? node.path.split('/').pop() ?? '';
  const inputType = formatToInputType(node.constraints.format);

  return createElement('div', { style: { marginBottom: 8 } },
    createElement('label', { style: { display: 'block', marginBottom: 2, fontWeight: 500 } },
      label,
      node.required ? createElement('span', { style: { color: 'red' } }, ' *') : null,
    ),
    node.schema.description
      ? createElement('p', { style: { margin: '0 0 4px', fontSize: '0.85em', color: '#666' } }, node.schema.description)
      : null,
    createElement('input', {
      type: inputType,
      value: (node.value as string) ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
      readOnly: node.readOnly,
      minLength: node.constraints.minLength,
      maxLength: node.constraints.maxLength,
      pattern: node.constraints.pattern,
      style: { width: '100%', padding: '4px 8px', boxSizing: 'border-box' as const },
    }),
  );
}

export function stringTester(node: FieldNode): number {
  return hasType(node, 'string') && !hasEnum(node) ? 1 : -1;
}
