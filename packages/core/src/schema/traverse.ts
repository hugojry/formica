import type { JSONSchema } from '../types.js';

export type SchemaVisitor = (schema: JSONSchema, path: string) => void;

/** Walk a schema tree depth-first, calling visitor at each node. */
export function traverseSchema(schema: JSONSchema, visitor: SchemaVisitor, path = '#'): void {
  if (typeof schema !== 'object' || schema === null) return;

  visitor(schema, path);

  if (schema.properties) {
    for (const [key, sub] of Object.entries(schema.properties)) {
      traverseSchema(sub, visitor, `${path}/properties/${key}`);
    }
  }
  if (schema.patternProperties) {
    for (const [key, sub] of Object.entries(schema.patternProperties)) {
      traverseSchema(sub, visitor, `${path}/patternProperties/${key}`);
    }
  }
  if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
    traverseSchema(schema.additionalProperties, visitor, `${path}/additionalProperties`);
  }
  if (schema.items && typeof schema.items === 'object' && !Array.isArray(schema.items)) {
    traverseSchema(schema.items, visitor, `${path}/items`);
  }
  if (schema.prefixItems) {
    schema.prefixItems.forEach((s, i) => traverseSchema(s, visitor, `${path}/prefixItems/${i}`));
  }
  for (const kw of ['allOf', 'anyOf', 'oneOf'] as const) {
    if (schema[kw]) {
      schema[kw]!.forEach((s, i) => traverseSchema(s, visitor, `${path}/${kw}/${i}`));
    }
  }
  if (schema.not) traverseSchema(schema.not, visitor, `${path}/not`);
  if (schema.if) traverseSchema(schema.if, visitor, `${path}/if`);
  if (schema.then) traverseSchema(schema.then, visitor, `${path}/then`);
  if (schema.else) traverseSchema(schema.else, visitor, `${path}/else`);
  if (schema.$defs) {
    for (const [key, sub] of Object.entries(schema.$defs)) {
      traverseSchema(sub, visitor, `${path}/$defs/${key}`);
    }
  }
  if (schema.dependentSchemas) {
    for (const [key, sub] of Object.entries(schema.dependentSchemas)) {
      traverseSchema(sub, visitor, `${path}/dependentSchemas/${key}`);
    }
  }
}
