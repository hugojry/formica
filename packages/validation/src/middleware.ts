import type { JSONSchema, Middleware, MiddlewareDescriptor } from '@formica/core';
import type { ValidateFunction } from 'ajv';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { ValidationError } from './errors.js';
import { withValidation } from './errors.js';

export function createValidationMiddleware(): MiddlewareDescriptor {
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

  const middleware: Middleware = (_ctx, next) => {
    const result = next();

    const allErrors = new Map<string, ValidationError[]>();

    for (const [path, node] of result.index) {
      if (node.value == null || node.value === '') continue;

      const validate = getValidator(node.schema);
      const valid = validate(node.value);

      if (!valid && validate.errors) {
        const errors: ValidationError[] = validate.errors.map((err) => ({
          message: err.message ?? 'Invalid value',
          keyword: err.keyword,
          params: (err.params as Record<string, unknown>) ?? {},
        }));
        node.extensions.errors = errors;
        allErrors.set(path, errors);
      }
    }

    result.meta.validationErrors = allErrors;
    return result;
  };

  return { middleware, propEnhancer: withValidation };
}
