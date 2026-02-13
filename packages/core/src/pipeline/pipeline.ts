import type { JSONSchema, PipelineContext, PipelineConfig, Middleware, FormModel, PipelineStage } from '../types.js';
import { PipelineStage as Stage } from '../types.js';
import { createContext } from './context.js';
import * as stages from './stages.js';

const STAGE_ORDER: PipelineStage[] = [
  Stage.NORMALIZE,
  Stage.RESOLVE_REFS,
  Stage.MERGE_ALLOF,
  Stage.EVALUATE_CONDITIONALS,
  Stage.EVALUATE_DEPENDENTS,
  Stage.RESOLVE_COMBINATORS,
  Stage.BUILD_TREE,
  Stage.APPLY_DEFAULTS,
  Stage.FINALIZE,
];

const BUILT_IN: Record<PipelineStage, (ctx: PipelineContext) => PipelineContext> = {
  [Stage.NORMALIZE]: stages.normalize,
  [Stage.RESOLVE_REFS]: stages.resolveRefs,
  [Stage.MERGE_ALLOF]: stages.mergeAllOf,
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

export function runPipeline(schema: JSONSchema, data: unknown, config?: PipelineConfig): FormModel {
  let ctx = createContext(schema, data);

  for (const stage of STAGE_ORDER) {
    ctx.stage = stage;
    const middlewares = config?.middleware?.[stage] ?? [];
    const run = composeMiddleware(BUILT_IN[stage], middlewares);
    ctx = run(ctx);
  }

  return {
    root: ctx.root!,
    schema: ctx.schema,
    data: ctx.data,
    index: ctx.index,
  };
}
