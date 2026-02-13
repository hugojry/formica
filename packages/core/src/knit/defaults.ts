import type { JSONSchema } from '../types.js';

/** Generate a default value for a schema, if one exists. */
export function getDefaultValue(schema: JSONSchema): unknown {
  if (schema.default !== undefined) return structuredClone(schema.default);
  if (schema.const !== undefined) return schema.const;
  return undefined;
}

/** Seed default values into a data object based on schema. */
export function seedDefaults(schema: JSONSchema, data: unknown): unknown {
  if (data !== undefined && data !== null) return data;

  if (schema.default !== undefined) return structuredClone(schema.default);

  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;

  if (type === 'object' && schema.properties) {
    const obj: Record<string, unknown> = {};
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      const val = seedDefaults(propSchema, undefined);
      if (val !== undefined) obj[key] = val;
    }
    return Object.keys(obj).length > 0 ? obj : undefined;
  }

  return undefined;
}
