import type { JSONSchema, PipelineContext, PipelineConfig, Middleware, PipelineStage, PreparedSchema } from '../types.js';
import { PipelineStage as Stage } from '../types.js';
import { createContext } from './context.js';
import * as stages from './stages.js';

const STATIC_STAGES: PipelineStage[] = [
  Stage.NORMALIZE,
  Stage.RESOLVE_REFS,
  Stage.MERGE_ALL_OF,
];

const DYNAMIC_STAGES: PipelineStage[] = [
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
  [Stage.MERGE_ALL_OF]: stages.mergeAllOf,
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

function runStages(ctx: PipelineContext, stageList: PipelineStage[], config?: PipelineConfig): PipelineContext {
  for (const stage of stageList) {
    ctx.stage = stage;
    const middlewares = config?.middleware?.[stage] ?? [];
    const run = composeMiddleware(BUILT_IN[stage], middlewares);
    ctx = run(ctx);
  }
  return ctx;
}

/** Run static pipeline stages (normalize, resolve refs, merge allOf) once for a schema. */
export function prepareSchema(schema: JSONSchema, config?: PipelineConfig): PreparedSchema {
  let ctx = createContext(schema, undefined);
  ctx = runStages(ctx, STATIC_STAGES, config);
  return {
    schema: ctx.schema,
    meta: ctx.meta,
  };
}

/** Run the full pipeline (all stages) from a raw JSON Schema. */
export function runPipeline(schema: JSONSchema, data: unknown, config?: PipelineConfig, meta?: Record<string, unknown>): PipelineContext {
  let ctx = createContext(schema, data);
  if (meta) Object.assign(ctx.meta, meta);
  ctx = runStages(ctx, [...STATIC_STAGES, ...DYNAMIC_STAGES], config);
  return ctx;
}

/** Run only the dynamic pipeline stages from a PreparedSchema. */
export function runPipelinePrepared(prepared: PreparedSchema, data: unknown, config?: PipelineConfig, meta?: Record<string, unknown>): PipelineContext {
  let ctx = createContext(prepared.schema, data);
  ctx.meta = { ...prepared.meta };
  if (meta) Object.assign(ctx.meta, meta);
  ctx = runStages(ctx, DYNAMIC_STAGES, config);
  return ctx;
}
