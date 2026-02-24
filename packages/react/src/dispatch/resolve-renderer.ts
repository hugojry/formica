import type { FieldNode } from '@formica/core';
import type { ComponentType } from 'react';
import type { ReactRendererEntry, ReactRendererProps } from './renderer-context.js';

export function resolveRenderer(
  node: FieldNode,
  entries: ReactRendererEntry[],
): ComponentType<ReactRendererProps> | null {
  let best: ComponentType<ReactRendererProps> | null = null;
  let bestScore = -1;

  for (const entry of entries) {
    const score = entry.tester(node);
    if (score > bestScore) {
      bestScore = score;
      best = entry.renderer;
    }
  }

  return best;
}
