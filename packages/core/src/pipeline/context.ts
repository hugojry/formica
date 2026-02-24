import type { JSONSchema, PipelineContext, PipelineStage } from '../types.js';

export function createContext(schema: JSONSchema, data: unknown): PipelineContext {
  return {
    schema: structuredClone(schema),
    data: data !== undefined ? structuredClone(data) : undefined,
    root: null,
    index: new Map(),
    conditionalDeps: new Map(),
    stage: 'NORMALIZE' as PipelineStage,
    meta: {},
  };
}
