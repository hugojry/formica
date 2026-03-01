import type { JSONSchema } from '../types.js';
import { mergeSchemas } from './merge-schemas.js';

export function mergeAllOf(schema: JSONSchema): JSONSchema {
  return mergeAllOfRecursive(schema);
}

function mergeAllOfRecursive(schema: JSONSchema): JSONSchema {
  if (typeof schema !== 'object' || schema === null) return schema;

  let result = { ...schema };

  // First recurse into subschemas
  if (result.properties) {
    result.properties = Object.fromEntries(
      Object.entries(result.properties).map(([k, v]) => [k, mergeAllOfRecursive(v)]),
    );
  }
  if (result.items && typeof result.items === 'object' && !Array.isArray(result.items)) {
    result.items = mergeAllOfRecursive(result.items);
  }
  if (result.prefixItems) {
    result.prefixItems = result.prefixItems.map((s) => mergeAllOfRecursive(s));
  }
  for (const kw of ['anyOf', 'oneOf'] as const) {
    if (result[kw]) {
      result[kw] = result[kw]!.map((s) => mergeAllOfRecursive(s));
    }
  }
  if (result.if) result.if = mergeAllOfRecursive(result.if);
  if (result.then) result.then = mergeAllOfRecursive(result.then);
  if (result.else) result.else = mergeAllOfRecursive(result.else);
  if (result.dependentSchemas) {
    result.dependentSchemas = Object.fromEntries(
      Object.entries(result.dependentSchemas).map(([k, v]) => [k, mergeAllOfRecursive(v)]),
    );
  }

  // Merge allOf
  if (result.allOf) {
    const merged = result.allOf.reduce((acc, sub) => mergeSchemas(acc, mergeAllOfRecursive(sub)), {
      ...result,
      allOf: undefined,
    } as JSONSchema);
    delete merged.allOf;
    result = merged;
  }

  return result;
}
