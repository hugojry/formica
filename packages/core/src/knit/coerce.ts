import type { JSONSchemaType } from '../types.js';

/** Attempt to coerce a value to the target type. Returns the coerced value or the original. */
export function coerceValue(value: unknown, targetType: JSONSchemaType): unknown {
  if (value === undefined || value === null) return value;

  switch (targetType) {
    case 'string':
      if (typeof value !== 'string') return String(value);
      return value;
    case 'number':
      if (typeof value === 'string') {
        const n = Number(value);
        return isNaN(n) ? value : n;
      }
      return value;
    case 'integer':
      if (typeof value === 'string') {
        const n = parseInt(value, 10);
        return isNaN(n) ? value : n;
      }
      if (typeof value === 'number') return Math.trunc(value);
      return value;
    case 'boolean':
      if (value === 'true' || value === 1) return true;
      if (value === 'false' || value === 0 || value === '') return false;
      return value;
    case 'null':
      return null;
    default:
      return value;
  }
}
