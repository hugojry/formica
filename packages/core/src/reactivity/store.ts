import { getByPath, setByPath } from '../model/path.js';
import { runPipeline } from '../pipeline/pipeline.js';
import type {
  FieldNode,
  FormState,
  FormStore,
  JSONSchema,
  PathSubscriber,
  PipelineConfig,
  PipelineContext,
  StateSubscriber,
} from '../types.js';

export function createFormStore(
  schema: JSONSchema,
  initialData?: unknown,
  config?: PipelineConfig,
): FormStore {
  const combinatorSelections = new Map<string, number>();

  const rebuild = (data: unknown) => runPipeline(schema, data, config, combinatorSelections);

  let model = rebuild(initialData);
  let currentState: FormState = { data: model.data };
  const pathListeners = new Map<string, Set<PathSubscriber>>();
  const stateListeners = new Set<StateSubscriber>();

  function updateState(): void {
    currentState = { data: model.data };
    for (const listener of stateListeners) {
      listener(currentState);
    }
  }

  function getModel(): PipelineContext {
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

    const prevModel = model;
    model = rebuild(newData);

    notifyPathListeners(prevModel.index, model.index);

    updateState();
  }

  function notifyPathListeners(
    prevIndex: Map<string, FieldNode>,
    newIndex: Map<string, FieldNode>,
  ): void {
    for (const [subPath, listeners] of pathListeners) {
      const n = newIndex.get(subPath);
      if (shouldNotify(prevIndex.get(subPath), n)) {
        for (const listener of listeners) {
          if (n) listener(n);
        }
      }
    }
  }

  function setCombinatorIndex(path: string, index: number): void {
    combinatorSelections.set(path, index);
    const prevModel = model;
    model = rebuild(model.data);
    notifyPathListeners(prevModel.index, model.index);
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

  function getState(): FormState {
    return currentState;
  }

  function subscribe(listener: StateSubscriber): () => void {
    stateListeners.add(listener);
    return () => stateListeners.delete(listener);
  }

  return {
    getModel,
    getData,
    setData,
    setCombinatorIndex,
    subscribe,
    subscribePath,
    getState,
  };
}

function shouldNotify(a: FieldNode | undefined, b: FieldNode | undefined): boolean {
  if (!a && !b) return false;
  if (!a || !b || a.type !== b.type) return true;
  if (b.type === 'object' || b.type === 'array')
    return shouldNotifyContainer(a, b) || nodePropsChanged(a, b);
  return a.value !== b.value || nodePropsChanged(a, b);
}

function shouldNotifyContainer(a: FieldNode, b: FieldNode): boolean {
  if (a.children.length !== b.children.length) return true;
  for (let i = 0; i < a.children.length; i++) {
    if (a.children[i].path !== b.children[i].path) return true;
  }
  return false;
}

// Blocklist approach: skip structural keys that are either handled separately
// (value, children) or never change for the same path (path, schema, type).
// This allows enrichment keys (from the FieldNode index signature) to trigger
// re-renders without needing an explicit allowlist.
const SKIP_KEYS = new Set(['path', 'schema', 'type', 'value', 'children']);

function nodePropsChanged(a: FieldNode, b: FieldNode): boolean {
  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);
  if (aKeys.length !== bKeys.length) return true;
  for (const key of aKeys) {
    if (SKIP_KEYS.has(key)) continue;
    if (!deepEqual(aObj[key], bObj[key])) return true;
  }
  return false;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (!Object.hasOwn(bObj, key)) return false;
    if (!deepEqual(aObj[key], bObj[key])) return false;
  }
  return true;
}
