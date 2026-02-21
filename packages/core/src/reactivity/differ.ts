import { isDescendant, parentPath } from '../model/path.js';

/** Compute the set of dirty paths given a changed path and a conditional dependency map. */
export function computeDirtyPaths(
  changedPath: string,
  conditionalDeps: Map<string, Set<string>>,
): Set<string> {
  const dirty = new Set<string>();

  // The changed path itself
  dirty.add(changedPath);

  // All ancestors
  let current = changedPath;
  while (current !== '') {
    current = parentPath(current);
    dirty.add(current);
  }

  // Conditional dependents: any schema path that depends on the changed data path
  const affected = conditionalDeps.get(changedPath);
  if (affected) {
    for (const schemaPath of affected) {
      dirty.add(schemaPath);
    }
  }

  return dirty;
}

/** Check if a path is dirty or has a dirty descendant. */
export function isPathAffected(path: string, dirtyPaths: Set<string>): boolean {
  if (dirtyPaths.has(path)) return true;

  // Check if any dirty path is a descendant (something changed beneath this path)
  for (const dirty of dirtyPaths) {
    if (isDescendant(path, dirty)) return true;
  }

  return false;
}
