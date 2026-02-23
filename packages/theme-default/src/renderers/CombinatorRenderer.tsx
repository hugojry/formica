import { createElement } from 'react';
import type { ReactRendererProps } from '@formica/react';
import type { FieldNode } from '@formica/core';

export function CombinatorRenderer({ node, onChange, setCombinatorIndex, renderChild }: ReactRendererProps) {
  const label = node.schema.title ?? node.path.split('/').pop() ?? '';
  const combinator = node.combinator!;

  const handleVariantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(e.target.value);
    const option = combinator.options[idx];

    // Explicitly select this variant so it persists across rebuilds
    setCombinatorIndex(node.path, idx);

    // Seed data with const/default values from the selected variant's properties
    if (option.properties) {
      const seed: Record<string, unknown> = {};
      for (const [key, prop] of Object.entries(option.properties)) {
        if (prop.const !== undefined) seed[key] = prop.const;
        else if (prop.default !== undefined) seed[key] = prop.default;
      }
      onChange(seed);
    } else if (option.const !== undefined) {
      onChange(option.const);
    } else {
      onChange(undefined);
    }
  };

  return createElement('fieldset', { style: { marginBottom: 8, padding: '8px 12px', border: '1px solid #ccc', borderRadius: 4 } },
    createElement('legend', { style: { fontWeight: 600 } },
      label,
      node.required ? createElement('span', { style: { color: 'red' } }, ' *') : null,
    ),
    node.schema.description
      ? createElement('p', { style: { margin: '0 0 8px', fontSize: '0.85em', color: '#666' } }, node.schema.description)
      : null,
    createElement('div', { style: { marginBottom: 8 } },
      createElement('label', { style: { display: 'block', marginBottom: 2, fontWeight: 500, fontSize: '0.85em' } },
        `${combinator.type === 'oneOf' ? 'Select one' : 'Select variant'}`,
      ),
      createElement('select', {
        value: combinator.activeIndex != null ? String(combinator.activeIndex) : '',
        onChange: handleVariantChange,
        style: { width: '100%', padding: '4px 8px', boxSizing: 'border-box' as const },
      },
        combinator.activeIndex == null
          ? createElement('option', { value: '' }, '— Select —')
          : null,
        ...combinator.labels.map((lbl, i) =>
          createElement('option', { key: i, value: String(i) }, lbl),
        ),
      ),
    ),
    combinator.activeIndex != null
      ? createElement('div', null,
          ...node.children.map((child) => renderChild(child.path)),
        )
      : null,
  );
}

export function combinatorTester(node: FieldNode): number {
  return node.combinator ? 2 : -1;
}
