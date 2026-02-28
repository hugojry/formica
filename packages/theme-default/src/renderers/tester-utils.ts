import type { FieldNode, JSONSchemaType } from '@formica/core';

export function hasType(node: FieldNode, type: JSONSchemaType): boolean {
  if (Array.isArray(node.type)) {
    return node.type.includes(type);
  }
  return node.type === type;
}

export function hasEnum(node: FieldNode): boolean {
  return node.constraints.enum != null && node.constraints.enum.length > 0;
}

export function getFieldErrors(node: FieldNode): Array<{ message: string }> {
  return (node.validationErrors as Array<{ message: string }> | undefined) ?? [];
}
