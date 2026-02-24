import type { JSONSchema } from '../types.js';

/**
 * Resolve all $ref pointers within a schema.
 * Only supports internal references ($defs / definitions).
 * Operates recursively and handles circular refs via a seen set.
 */
export function resolveAllRefs(schema: JSONSchema): JSONSchema {
  const defs = schema.$defs ?? {};
  const seen = new Set<string>();
  return resolveNode(schema, defs, seen);
}

function resolveNode(
  node: JSONSchema,
  defs: Record<string, JSONSchema>,
  seen: Set<string>,
): JSONSchema {
  if (typeof node !== 'object' || node === null) return node;

  // Resolve $ref
  if (node.$ref) {
    const ref = node.$ref;
    if (seen.has(ref)) {
      // Circular reference — return as-is to avoid infinite loop
      return node;
    }
    const resolved = resolveRef(ref, defs);
    if (resolved) {
      seen.add(ref);
      const result = resolveNode(resolved, defs, seen);
      seen.delete(ref);
      return result;
    }
    // Unresolvable ref — keep as-is
    return node;
  }

  // Recurse into subschemas
  const result: JSONSchema = { ...node };

  if (result.$defs) {
    result.$defs = mapValues(result.$defs, (v) => resolveNode(v, defs, seen));
  }
  if (result.properties) {
    result.properties = mapValues(result.properties, (v) => resolveNode(v, defs, seen));
  }
  if (result.patternProperties) {
    result.patternProperties = mapValues(result.patternProperties, (v) =>
      resolveNode(v, defs, seen),
    );
  }
  if (result.additionalProperties && typeof result.additionalProperties === 'object') {
    result.additionalProperties = resolveNode(result.additionalProperties, defs, seen);
  }
  if (result.items && typeof result.items === 'object' && !Array.isArray(result.items)) {
    result.items = resolveNode(result.items, defs, seen);
  }
  if (result.prefixItems) {
    result.prefixItems = result.prefixItems.map((s) => resolveNode(s, defs, seen));
  }
  for (const kw of ['allOf', 'anyOf', 'oneOf'] as const) {
    if (result[kw]) {
      result[kw] = result[kw]!.map((s) => resolveNode(s, defs, seen));
    }
  }
  if (result.not) result.not = resolveNode(result.not, defs, seen);
  if (result.if) result.if = resolveNode(result.if, defs, seen);
  if (result.then) result.then = resolveNode(result.then, defs, seen);
  if (result.else) result.else = resolveNode(result.else, defs, seen);
  if (result.contains) result.contains = resolveNode(result.contains, defs, seen);
  if (result.dependentSchemas) {
    result.dependentSchemas = mapValues(result.dependentSchemas, (v) => resolveNode(v, defs, seen));
  }

  return result;
}

function resolveRef(ref: string, defs: Record<string, JSONSchema>): JSONSchema | undefined {
  // #/$defs/Foo or #/definitions/Foo
  const match = ref.match(/^#\/(?:\$defs|definitions)\/(.+)$/);
  if (match) {
    const name = match[1].replace(/~1/g, '/').replace(/~0/g, '~');
    return defs[name] ? structuredClone(defs[name]) : undefined;
  }
  return undefined;
}

function mapValues<T>(obj: Record<string, T>, fn: (v: T) => T): Record<string, T> {
  const result: Record<string, T> = {};
  for (const [k, v] of Object.entries(obj)) {
    result[k] = fn(v);
  }
  return result;
}
