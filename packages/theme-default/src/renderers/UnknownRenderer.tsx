import { createElement } from 'react';
import type { ReactRendererProps } from '@formica/react';
import type { FieldNode } from '@formica/core';

export function UnknownRenderer({ node }: ReactRendererProps) {
  return createElement('div', { style: { marginBottom: 8, padding: 8, background: '#fff3cd', borderRadius: 4, fontSize: '0.85em' } },
    createElement('strong', null, 'Unknown field: '),
    `${node.path} (type: ${Array.isArray(node.type) ? node.type.join(' | ') : node.type})`,
  );
}

export function unknownTester(_node: FieldNode): number {
  return 0;
}
