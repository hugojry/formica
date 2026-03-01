import type { EnrichFn, JSONSchema } from '@formica/core';
import type { ValidateFunction } from 'ajv';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

export function createValidationEnrichment(): EnrichFn {
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  const cache = new WeakMap<JSONSchema, ValidateFunction>();

  function getValidator(schema: JSONSchema): ValidateFunction {
    let validate = cache.get(schema);
    if (!validate) {
      validate = ajv.compile(schema);
      cache.set(schema, validate);
    }
    return validate;
  }

  return (node) => {
    if (node.value == null || node.value === '') return null;

    const validate = getValidator(node.schema);
    if (validate(node.value)) return null;

    return {
      validationErrors: validate.errors!.map((err) => ({
        message: err.message ?? 'Invalid value',
        keyword: err.keyword,
        params: (err.params as Record<string, unknown>) ?? {},
      })),
    };
  };
}
