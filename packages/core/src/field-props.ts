import type { FieldNode, JSONSchemaType } from './types.js';

// ─── Field Utilities ───

export function hasType(node: FieldNode, type: JSONSchemaType): boolean {
  if (Array.isArray(node.type)) {
    return node.type.includes(type);
  }
  return node.type === type;
}

export function hasEnum(node: FieldNode): boolean {
  return node.constraints.enum != null && node.constraints.enum.length > 0;
}

export function formatToInputType(
  format?: string,
): 'text' | 'email' | 'url' | 'date' | 'datetime-local' | 'time' | 'password' {
  switch (format) {
    case 'email':
      return 'email';
    case 'uri':
    case 'uri-reference':
      return 'url';
    case 'date':
      return 'date';
    case 'date-time':
      return 'datetime-local';
    case 'time':
      return 'time';
    case 'password':
      return 'password';
    default:
      return 'text';
  }
}

// ─── Base Field Props ───

export interface FieldProps {
  label: string;
  name: string;
  path: string;
  description?: string;
  required: boolean;
  readOnly: boolean;
  deprecated: boolean;
}

export function getFieldProps(node: FieldNode): FieldProps {
  const name = node.path.split('/').pop() ?? '';
  return {
    label: node.schema.title ?? name,
    name,
    path: node.path,
    description: node.schema.description,
    required: node.required,
    readOnly: node.readOnly,
    deprecated: node.deprecated,
  };
}

// ─── Type-Specific Props ───

export interface TextInputProps {
  type: 'text' | 'email' | 'url' | 'date' | 'datetime-local' | 'time' | 'password';
  value: string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export function getTextInputProps(node: FieldNode): TextInputProps {
  return {
    type: formatToInputType(node.constraints.format),
    value: (node.value as string) ?? '',
    minLength: node.constraints.minLength,
    maxLength: node.constraints.maxLength,
    pattern: node.constraints.pattern,
  };
}

export interface NumberInputProps {
  value: number | undefined;
  min?: number;
  max?: number;
  step?: number;
}

export function getNumberInputProps(node: FieldNode): NumberInputProps {
  return {
    value: node.value == null ? undefined : (node.value as number),
    min: node.constraints.minimum,
    max: node.constraints.maximum,
    step: node.constraints.multipleOf ?? (hasType(node, 'integer') ? 1 : undefined),
  };
}

export interface CheckboxProps {
  checked: boolean;
}

export function getCheckboxProps(node: FieldNode): CheckboxProps {
  return {
    checked: (node.value as boolean) ?? false,
  };
}

export interface SelectProps {
  value: unknown;
  options: { label: string; value: unknown }[];
}

export function getSelectProps(node: FieldNode): SelectProps {
  const enumValues = node.constraints.enum ?? [];
  return {
    value: node.value,
    options: enumValues.map((v) => ({
      label: String(v),
      value: v,
    })),
  };
}
