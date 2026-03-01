import type {
  JSONSchema,
  Middleware,
  PipelineConfig,
  PipelineContext,
  PipelineStage,
} from '../types.js';
import { PipelineStage as Stage } from '../types.js';
import { createContext } from './context.js';
import { applyEnrichments } from './enrichments.js';
import * as stages from './stages.js';

const STAGES: PipelineStage[] = [
  Stage.EVALUATE_CONDITIONALS,
  Stage.EVALUATE_DEPENDENTS,
  Stage.RESOLVE_COMBINATORS,
  Stage.BUILD_TREE,
  Stage.APPLY_DEFAULTS,
  Stage.FINALIZE,
];

const BUILT_IN: Record<PipelineStage, (ctx: PipelineContext) => PipelineContext> = {
  [Stage.EVALUATE_CONDITIONALS]: stages.evaluateConditionals,
  [Stage.EVALUATE_DEPENDENTS]: stages.evaluateDependents,
  [Stage.RESOLVE_COMBINATORS]: stages.resolveCombinators,
  [Stage.BUILD_TREE]: stages.buildTree,
  [Stage.APPLY_DEFAULTS]: stages.applyDefaults,
  [Stage.FINALIZE]: stages.finalize,
};

function composeMiddleware(
  builtIn: (ctx: PipelineContext) => PipelineContext,
  middlewares: Middleware[],
): (ctx: PipelineContext) => PipelineContext {
  if (middlewares.length === 0) return builtIn;

  return (ctx: PipelineContext) => {
    let idx = -1;

    function dispatch(i: number): PipelineContext {
      if (i <= idx) throw new Error('next() called multiple times');
      idx = i;
      if (i < middlewares.length) {
        return middlewares[i](ctx, () => dispatch(i + 1));
      }
      return builtIn(ctx);
    }

    return dispatch(0);
  };
}

/** Run the pipeline from a JSON Schema. The schema must already be prepared (refs resolved, allOf merged, Draft 7 normalized). */
export function runPipeline(
  schema: JSONSchema,
  data: unknown,
  config?: PipelineConfig,
  combinatorSelections?: Map<string, number>,
): PipelineContext {
  let ctx = createContext(schema, data);
  if (combinatorSelections) ctx.combinatorSelections = combinatorSelections;

  for (const stage of STAGES) {
    ctx.stage = stage;
    const entries = config?.middleware?.[stage] ?? [];
    const run = composeMiddleware(BUILT_IN[stage], entries);
    ctx = run(ctx);
  }
  if (config?.enrichments?.length) {
    applyEnrichments(ctx, config.enrichments);
  }
  return ctx;
}
