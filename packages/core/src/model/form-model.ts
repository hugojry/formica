import type { FormModel, JSONSchema, PipelineConfig } from '../types.js';
import { runPipeline } from '../pipeline/pipeline.js';

/** Build a FormModel from a JSON Schema and optional initial data. */
export function buildFormModel(
  schema: JSONSchema,
  data?: unknown,
  config?: PipelineConfig,
): FormModel {
  return runPipeline(schema, data ?? undefined, config);
}
