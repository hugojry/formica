import type { FormStore, FormModel, JSONSchema, PipelineConfig, PathSubscriber, ModelSubscriber, FieldNode } from '../types.js';
import { buildFormModel } from '../model/form-model.js';
import { getByPath, setByPath } from '../model/path.js';
import { computeDirtyPaths } from './differ.js';

export function createFormStore(
  schema: JSONSchema,
  initialData?: unknown,
  config?: PipelineConfig,
): FormStore {
  let model = buildFormModel(schema, initialData, config);
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
    const dirtyPaths = computeDirtyPaths(path, model.index.size > 0 ? getDepsFromModel() : new Map());

    // Re-run full pipeline (future optimization: partial re-resolution for dirty subtrees)
    const prevModel = model;
    model = buildFormModel(schema, newData, config);

    // Notify path subscribers for changed nodes
    for (const [subPath, listeners] of pathListeners) {
      const prevNode = prevModel.index.get(subPath);
      const newNode = model.index.get(subPath);

      // Only notify if the node actually changed
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

  function getDepsFromModel(): Map<string, Set<string>> {
    // The conditional deps are built during pipeline execution
    // For now, return empty — the pipeline context tracks them internally
    return new Map();
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

  return { getModel, getData, setData, subscribe, subscribePath };
}

function nodeStructureChanged(a: FieldNode | undefined, b: FieldNode | undefined): boolean {
  if (!a || !b) return true;
  if (a.children.length !== b.children.length) return true;
  if (a.active !== b.active) return true;
  if (a.required !== b.required) return true;
  if (a.combinator?.activeIndex !== b.combinator?.activeIndex) return true;
  return false;
}
