import type { FormStore, FormModel, JSONSchema, PipelineConfig, PathSubscriber, ModelSubscriber, FieldNode } from '../types.js';
import { runPipeline, runPipelinePrepared, prepareSchema } from '../pipeline/pipeline.js';
import { getByPath, setByPath } from '../model/path.js';
import { computeDirtyPaths, isPathAffected } from './differ.js';

export function createFormStore(
  schema: JSONSchema,
  initialData?: unknown,
  config?: PipelineConfig,
): FormStore {
  const cacheStatic = config?.cacheStaticStages !== false;
  const prepared = cacheStatic ? prepareSchema(schema, config) : undefined;
  const combinatorSelections = new Map<string, number>();

  function getMeta(): Record<string, unknown> {
    return combinatorSelections.size > 0
      ? { combinatorSelections }
      : {};
  }

  const rebuild = prepared
    ? (data: unknown) => runPipelinePrepared(prepared, data, config, getMeta())
    : (data: unknown) => runPipeline(schema, data, config, getMeta());

  let model = rebuild(initialData);
  const modelListeners = new Set<ModelSubscriber>();
  const pathListeners = new Map<string, Set<PathSubscriber>>();

  function getModel(): FormModel {
    return model;
  }

  function getData(): unknown {
    return model.data;
  }

  function setData(path: string, value: unknown): void {
    const currentValue = getByPath(model.data, path);
    // No-op if identical
    if (currentValue === value) return;

    const newData = setByPath(model.data, path, value);

    // Compute dirty paths for targeted notifications
    const dirtyPaths = computeDirtyPaths(path, model.conditionalDeps);

    // Re-run pipeline (static stages skipped when cached)
    const prevModel = model;
    model = rebuild(newData);

    // Notify path subscribers only for paths affected by the change
    for (const [subPath, listeners] of pathListeners) {
      if (!isPathAffected(subPath, dirtyPaths)) continue;

      const prevNode = prevModel.index.get(subPath);
      const newNode = model.index.get(subPath);

      if (prevNode !== newNode && (prevNode?.value !== newNode?.value || nodeStructureChanged(prevNode, newNode))) {
        for (const listener of listeners) {
          if (newNode) listener(newNode);
        }
      }
    }

    // Notify model subscribers
    for (const listener of modelListeners) {
      listener(model);
    }
  }

  function setCombinatorIndex(path: string, index: number): void {
    combinatorSelections.set(path, index);

    // Compute dirty paths — the combinator path and all descendants need rebuilding
    const dirtyPaths = computeDirtyPaths(path, model.conditionalDeps);

    const prevModel = model;
    model = rebuild(model.data);

    // Notify path subscribers for affected paths
    for (const [subPath, listeners] of pathListeners) {
      if (!isPathAffected(subPath, dirtyPaths)) continue;

      const prevNode = prevModel.index.get(subPath);
      const newNode = model.index.get(subPath);

      if (prevNode !== newNode && (prevNode?.value !== newNode?.value || nodeStructureChanged(prevNode, newNode))) {
        for (const listener of listeners) {
          if (newNode) listener(newNode);
        }
      }
    }

    // Notify model subscribers
    for (const listener of modelListeners) {
      listener(model);
    }
  }

  function subscribe(listener: ModelSubscriber): () => void {
    modelListeners.add(listener);
    return () => modelListeners.delete(listener);
  }

  function subscribePath(path: string, listener: PathSubscriber): () => void {
    if (!pathListeners.has(path)) pathListeners.set(path, new Set());
    pathListeners.get(path)!.add(listener);
    return () => {
      const set = pathListeners.get(path);
      if (set) {
        set.delete(listener);
        if (set.size === 0) pathListeners.delete(path);
      }
    };
  }

  return { getModel, getData, setData, setCombinatorIndex, subscribe, subscribePath };
}

function nodeStructureChanged(a: FieldNode | undefined, b: FieldNode | undefined): boolean {
  if (!a || !b) return true;
  if (a.children.length !== b.children.length) return true;
  if (a.active !== b.active) return true;
  if (a.required !== b.required) return true;
  if (a.combinator?.activeIndex !== b.combinator?.activeIndex) return true;
  return false;
}
