import { createElement, useCallback } from 'react';
import type { ReactRendererProps } from '@formica/react';
import { useFieldArray } from '@formica/react';
import { hasType } from './tester-utils.js';
import type { FieldNode } from '@formica/core';

export function ArrayRenderer({ node, renderChild }: ReactRendererProps) {
  const label = node.schema.title ?? node.path.split('/').pop() ?? '';
  const { items, append, remove, move } = useFieldArray(node.path);
  const meta = node.arrayMeta;

  const handleAdd = useCallback(() => {
    append(undefined);
  }, [append]);

  return createElement('div', { style: { marginBottom: 8 } },
    createElement('label', { style: { display: 'block', marginBottom: 4, fontWeight: 500 } },
      label,
      node.required ? createElement('span', { style: { color: 'red' } }, ' *') : null,
    ),
    node.schema.description
      ? createElement('p', { style: { margin: '0 0 4px', fontSize: '0.85em', color: '#666' } }, node.schema.description)
      : null,
    createElement('div', { style: { paddingLeft: 12, borderLeft: '2px solid #ddd' } },
      ...items.map((child, i) =>
        createElement('div', { key: child.path, style: { display: 'flex', alignItems: 'flex-start', gap: 4, marginBottom: 4 } },
          createElement('div', { style: { flex: 1 } }, renderChild(child.path)),
          createElement('div', { style: { display: 'flex', gap: 2, paddingTop: 20 } },
            meta?.canReorder && i > 0
              ? createElement('button', { type: 'button', onClick: () => move(i, i - 1), style: { padding: '2px 6px' } }, '\u2191')
              : null,
            meta?.canReorder && i < items.length - 1
              ? createElement('button', { type: 'button', onClick: () => move(i, i + 1), style: { padding: '2px 6px' } }, '\u2193')
              : null,
            meta?.canRemove !== false
              ? createElement('button', { type: 'button', onClick: () => remove(i), style: { padding: '2px 6px', color: 'red' } }, '\u00d7')
              : null,
          ),
        ),
      ),
    ),
    meta?.canAdd !== false
      ? createElement('button', { type: 'button', onClick: handleAdd, style: { marginTop: 4, padding: '4px 12px' } }, '+ Add')
      : null,
  );
}

export function arrayTester(node: FieldNode): number {
  return hasType(node, 'array') ? 1 : -1;
}
