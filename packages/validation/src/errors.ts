import type { FieldNode } from '@formica/core';

export interface ValidationError {
  message: string;
  keyword: string;
  params: Record<string, unknown>;
}

export function getFieldErrors(node: FieldNode): ValidationError[] {
  return (node.validationErrors as ValidationError[] | undefined) ?? [];
}

export function hasFieldErrors(node: FieldNode): boolean {
  const errors = node.validationErrors as ValidationError[] | undefined;
  return errors != null && errors.length > 0;
}
