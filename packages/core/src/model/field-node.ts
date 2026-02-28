import type { FieldNode, JSONSchema } from '../types.js';

/** Create a minimal FieldNode. Primarily used for testing. */
export function createFieldNode(
  path: string,
  schema: JSONSchema,
  overrides: Partial<FieldNode> = {},
): FieldNode {
  return {
    path,
    schema,
    type: schema.type ?? 'string',
    value: undefined,
    children: [],
    required: false,
    readOnly: schema.readOnly ?? false,
    deprecated: schema.deprecated ?? false,
    active: true,
    constraints: {},
    origin: 'property',
    ...overrides,
  };
}

/** Clone a FieldNode with new overrides (structural sharing for unchanged children). */
export function updateFieldNode(node: FieldNode, overrides: Partial<FieldNode>): FieldNode {
  return { ...node, ...overrides };
}
