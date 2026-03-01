import type { JSONSchema } from '../types.js';

export function mergeSchemas(a: JSONSchema, b: JSONSchema): JSONSchema {
  const result: JSONSchema = { ...a };

  // Merge type (intersect)
  if (b.type) {
    if (result.type) {
      const aTypes = Array.isArray(result.type) ? result.type : [result.type];
      const bTypes = Array.isArray(b.type) ? b.type : [b.type];
      const intersection = aTypes.filter((t) => bTypes.includes(t));
      result.type = intersection.length === 1 ? intersection[0] : (intersection as any);
    } else {
      result.type = b.type;
    }
  }

  // Merge properties
  if (b.properties) {
    result.properties ??= {};
    for (const [key, val] of Object.entries(b.properties)) {
      if (result.properties[key]) {
        result.properties[key] = mergeSchemas(result.properties[key], val);
      } else {
        result.properties[key] = val;
      }
    }
  }

  // Merge required (union)
  if (b.required) {
    result.required = [...new Set([...(result.required ?? []), ...b.required])];
  }

  // Merge numeric constraints (tightest wins)
  for (const k of [
    'minimum',
    'exclusiveMinimum',
    'minLength',
    'minItems',
    'minProperties',
  ] as const) {
    if (b[k] !== undefined) {
      result[k] =
        result[k] !== undefined ? Math.max(result[k] as number, b[k] as number) : (b[k] as any);
    }
  }
  for (const k of [
    'maximum',
    'exclusiveMaximum',
    'maxLength',
    'maxItems',
    'maxProperties',
  ] as const) {
    if (b[k] !== undefined) {
      result[k] =
        result[k] !== undefined ? Math.min(result[k] as number, b[k] as number) : (b[k] as any);
    }
  }

  // Scalars from b override
  for (const k of [
    'pattern',
    'format',
    'const',
    'title',
    'description',
    'default',
    'readOnly',
    'writeOnly',
    'deprecated',
    'multipleOf',
    'uniqueItems',
  ] as const) {
    if (b[k] !== undefined) {
      (result as any)[k] = b[k];
    }
  }

  // Enum (intersect)
  if (b.enum) {
    if (result.enum) {
      result.enum = result.enum.filter((v) => b.enum!.includes(v));
    } else {
      result.enum = b.enum;
    }
  }

  // Composition keywords — carry over
  for (const k of ['oneOf', 'anyOf', 'if', 'then', 'else', 'not'] as const) {
    if (b[k] !== undefined && result[k] === undefined) {
      (result as any)[k] = b[k];
    }
  }

  // Items
  if (b.items && typeof b.items === 'object') {
    result.items =
      result.items && typeof result.items === 'object'
        ? mergeSchemas(result.items as JSONSchema, b.items as JSONSchema)
        : b.items;
  }

  // additionalProperties
  if (b.additionalProperties !== undefined) {
    if (
      typeof b.additionalProperties === 'object' &&
      typeof result.additionalProperties === 'object'
    ) {
      result.additionalProperties = mergeSchemas(
        result.additionalProperties,
        b.additionalProperties,
      );
    } else {
      result.additionalProperties = b.additionalProperties;
    }
  }

  // dependentSchemas
  if (b.dependentSchemas) {
    result.dependentSchemas ??= {};
    for (const [k, v] of Object.entries(b.dependentSchemas)) {
      result.dependentSchemas[k] = result.dependentSchemas[k]
        ? mergeSchemas(result.dependentSchemas[k], v)
        : v;
    }
  }

  // dependentRequired
  if (b.dependentRequired) {
    result.dependentRequired ??= {};
    for (const [k, v] of Object.entries(b.dependentRequired)) {
      result.dependentRequired[k] = [...new Set([...(result.dependentRequired[k] ?? []), ...v])];
    }
  }

  return result;
}
