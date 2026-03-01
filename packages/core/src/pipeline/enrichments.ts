import type { EnrichFn, PipelineContext } from '../types.js';

export function applyEnrichments(ctx: PipelineContext, enrichments: EnrichFn[]): void {
  for (const enrich of enrichments) {
    for (const [, node] of ctx.index) {
      const result = enrich(node, ctx);
      if (result) Object.assign(node, result);
    }
  }
}
