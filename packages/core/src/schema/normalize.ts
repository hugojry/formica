import type { JSONSchema } from '../types.js';

/**
 * Normalize Draft 7 constructs to 2020-12 equivalents.
 * Mutates the schema in-place (operates on the cloned context schema).
 */
export function normalizeSchemaDraft7(schema: JSONSchema): JSONSchema {
  if (typeof schema !== 'object' || schema === null) return schema;

  // definitions → $defs
  if (schema.definitions && !schema.$defs) {
    schema.$defs = schema.definitions;
    delete schema.definitions;
  }

  // items (array of schemas) → prefixItems + items
  if (Array.isArray(schema.items)) {
    schema.prefixItems = schema.items as JSONSchema[];
    if (schema.additionalItems !== undefined) {
      schema.items =
        schema.additionalItems === false
          ? (false as any)
          : schema.additionalItems === true
            ? ({} as JSONSchema)
            : (schema.additionalItems as JSONSchema);
    } else {
      delete schema.items;
    }
    delete schema.additionalItems;
  }

  // boolean exclusiveMinimum/Maximum → numeric
  if (typeof schema.exclusiveMinimum === 'boolean') {
    if (schema.exclusiveMinimum && schema.minimum !== undefined) {
      schema.exclusiveMinimum = schema.minimum;
      delete schema.minimum;
    } else {
      delete schema.exclusiveMinimum;
    }
  }
  if (typeof schema.exclusiveMaximum === 'boolean') {
    if (schema.exclusiveMaximum && schema.maximum !== undefined) {
      schema.exclusiveMaximum = schema.maximum;
      delete schema.maximum;
    } else {
      delete schema.exclusiveMaximum;
    }
  }

  // dependencies → dependentSchemas / dependentRequired
  if (schema.dependencies) {
    for (const [key, dep] of Object.entries(schema.dependencies)) {
      if (Array.isArray(dep)) {
        schema.dependentRequired ??= {};
        schema.dependentRequired[key] = dep;
      } else {
        schema.dependentSchemas ??= {};
        schema.dependentSchemas[key] = dep;
      }
    }
    delete schema.dependencies;
  }

  // Recurse into subschemas
  if (schema.$defs) {
    for (const key of Object.keys(schema.$defs)) {
      normalizeSchemaDraft7(schema.$defs[key]);
    }
  }
  if (schema.properties) {
    for (const key of Object.keys(schema.properties)) {
      normalizeSchemaDraft7(schema.properties[key]);
    }
  }
  if (schema.patternProperties) {
    for (const key of Object.keys(schema.patternProperties)) {
      normalizeSchemaDraft7(schema.patternProperties[key]);
    }
  }
  if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
    normalizeSchemaDraft7(schema.additionalProperties);
  }
  if (schema.items && typeof schema.items === 'object' && !Array.isArray(schema.items)) {
    normalizeSchemaDraft7(schema.items);
  }
  if (schema.prefixItems) {
    schema.prefixItems.forEach((s) => normalizeSchemaDraft7(s));
  }
  for (const kw of ['allOf', 'anyOf', 'oneOf'] as const) {
    if (schema[kw]) {
      schema[kw]!.forEach((s) => normalizeSchemaDraft7(s));
    }
  }
  if (schema.not) normalizeSchemaDraft7(schema.not);
  if (schema.if) normalizeSchemaDraft7(schema.if);
  if (schema.then) normalizeSchemaDraft7(schema.then);
  if (schema.else) normalizeSchemaDraft7(schema.else);
  if (schema.contains) normalizeSchemaDraft7(schema.contains);
  if (schema.dependentSchemas) {
    for (const key of Object.keys(schema.dependentSchemas)) {
      normalizeSchemaDraft7(schema.dependentSchemas[key]);
    }
  }

  return schema;
}
