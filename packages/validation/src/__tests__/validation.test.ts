import { describe, expect, test } from 'bun:test';
import type { JSONSchema, PipelineConfig } from '@formica/core';
import { PipelineStage, runPipeline } from '@formica/core';
import {
  createValidationEnrichment,
  createValidationMiddleware,
  getFieldErrors,
  hasFieldErrors,
} from '../index.js';

function runWithValidation(schema: JSONSchema, data?: unknown) {
  const config: PipelineConfig = {
    middleware: {
      [PipelineStage.FINALIZE]: [createValidationMiddleware()],
    },
  };
  return runPipeline(schema, data, config);
}

describe('createValidationMiddleware', () => {
  test('valid data produces no errors', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    };
    const model = runWithValidation(schema, { name: 'Alice' });
    const node = model.index.get('/name')!;
    expect(hasFieldErrors(node)).toBe(false);
    expect(getFieldErrors(node)).toEqual([]);
  });

  test('type mismatch produces error', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        age: { type: 'number' },
      },
    };
    const model = runWithValidation(schema, { age: 'not-a-number' });
    const node = model.index.get('/age')!;
    expect(hasFieldErrors(node)).toBe(true);
    const errors = getFieldErrors(node);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].keyword).toBe('type');
  });

  test('minLength constraint produces error', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 3 },
      },
    };
    const model = runWithValidation(schema, { name: 'AB' });
    const node = model.index.get('/name')!;
    expect(hasFieldErrors(node)).toBe(true);
    const errors = getFieldErrors(node);
    expect(errors[0].keyword).toBe('minLength');
    expect(errors[0].params).toEqual({ limit: 3 });
  });

  test('multiple constraints produce multiple errors', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        value: { type: 'string', minLength: 5, pattern: '^[a-z]+$' },
      },
    };
    const model = runWithValidation(schema, { value: 'AB' });
    const node = model.index.get('/value')!;
    const errors = getFieldErrors(node);
    expect(errors.length).toBe(2);
    const keywords = errors.map((e) => e.keyword).sort();
    expect(keywords).toEqual(['minLength', 'pattern']);
  });

  test('skips validation for null/undefined values', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 3 },
      },
    };
    const model = runWithValidation(schema, {});
    const node = model.index.get('/name')!;
    expect(hasFieldErrors(node)).toBe(false);
  });

  test('skips validation for empty string values', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 3 },
      },
    };
    const model = runWithValidation(schema, { name: '' });
    const node = model.index.get('/name')!;
    expect(hasFieldErrors(node)).toBe(false);
  });

  test('required fields on parent schema', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
      },
      required: ['name', 'email'],
    };
    const model = runWithValidation(schema, {});
    // The root object node should have required errors
    const rootNode = model.index.get('')!;
    const errors = getFieldErrors(rootNode);
    expect(errors.some((e) => e.keyword === 'required')).toBe(true);
  });

  test('numeric constraints: minimum', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        score: { type: 'number', minimum: 0, maximum: 100 },
      },
    };
    const model = runWithValidation(schema, { score: -5 });
    const node = model.index.get('/score')!;
    expect(hasFieldErrors(node)).toBe(true);
    expect(getFieldErrors(node)[0].keyword).toBe('minimum');
  });

  test('enum validation', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        color: { type: 'string', enum: ['red', 'green', 'blue'] },
      },
    };
    const model = runWithValidation(schema, { color: 'yellow' });
    const node = model.index.get('/color')!;
    expect(hasFieldErrors(node)).toBe(true);
    expect(getFieldErrors(node)[0].keyword).toBe('enum');
  });

  test('valid nested objects have no errors', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        address: {
          type: 'object',
          properties: {
            city: { type: 'string', minLength: 1 },
          },
        },
      },
    };
    const model = runWithValidation(schema, {
      address: { city: 'Springfield' },
    });
    const cityNode = model.index.get('/address/city')!;
    expect(hasFieldErrors(cityNode)).toBe(false);
  });

  test('invalid nested fields get errors', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        address: {
          type: 'object',
          properties: {
            zip: { type: 'string', pattern: '^\\d{5}$' },
          },
        },
      },
    };
    const model = runWithValidation(schema, { address: { zip: 'abc' } });
    const zipNode = model.index.get('/address/zip')!;
    expect(hasFieldErrors(zipNode)).toBe(true);
    expect(getFieldErrors(zipNode)[0].keyword).toBe('pattern');
  });

  test('format: email rejects invalid email', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
      },
    };
    const model = runWithValidation(schema, { email: 'foo' });
    const node = model.index.get('/email')!;
    expect(hasFieldErrors(node)).toBe(true);
    expect(getFieldErrors(node)[0].keyword).toBe('format');
    expect(getFieldErrors(node)[0].params).toEqual({ format: 'email' });
  });

  test('format: email accepts valid email', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
      },
    };
    const model = runWithValidation(schema, { email: 'jane@example.com' });
    const node = model.index.get('/email')!;
    expect(hasFieldErrors(node)).toBe(false);
  });

  test('format: uri rejects invalid uri', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        website: { type: 'string', format: 'uri' },
      },
    };
    const model = runWithValidation(schema, { website: 'not a url' });
    const node = model.index.get('/website')!;
    expect(hasFieldErrors(node)).toBe(true);
    expect(getFieldErrors(node)[0].keyword).toBe('format');
  });

  test('format: uri accepts valid uri', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        website: { type: 'string', format: 'uri' },
      },
    };
    const model = runWithValidation(schema, { website: 'https://example.com' });
    const node = model.index.get('/website')!;
    expect(hasFieldErrors(node)).toBe(false);
  });

  test('format: date rejects invalid date', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        dob: { type: 'string', format: 'date' },
      },
    };
    const model = runWithValidation(schema, { dob: '13/01/2000' });
    const node = model.index.get('/dob')!;
    expect(hasFieldErrors(node)).toBe(true);
    expect(getFieldErrors(node)[0].keyword).toBe('format');
  });

  test('format: date accepts valid date', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        dob: { type: 'string', format: 'date' },
      },
    };
    const model = runWithValidation(schema, { dob: '2000-01-13' });
    const node = model.index.get('/dob')!;
    expect(hasFieldErrors(node)).toBe(false);
  });

  test('format fields with no data are skipped', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
      },
    };
    const model = runWithValidation(schema, {});
    const node = model.index.get('/email')!;
    expect(hasFieldErrors(node)).toBe(false);
  });

  test('caches validators for same schema reference', () => {
    const middleware = createValidationMiddleware();
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        a: { type: 'string' },
      },
    };
    const config: PipelineConfig = {
      middleware: { [PipelineStage.FINALIZE]: [middleware] },
    };
    // Run twice with same schema — should not throw or recompile
    const model1 = runPipeline(schema, { a: 'hello' }, config);
    const model2 = runPipeline(schema, { a: 'world' }, config);
    expect(hasFieldErrors(model1.index.get('/a')!)).toBe(false);
    expect(hasFieldErrors(model2.index.get('/a')!)).toBe(false);
  });
});

describe('createValidationEnrichment', () => {
  function runWithEnrichment(schema: JSONSchema, data?: unknown) {
    const config: PipelineConfig = {
      enrichments: [createValidationEnrichment()],
    };
    return runPipeline(schema, data, config);
  }

  test('valid data produces no errors', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    };
    const model = runWithEnrichment(schema, { name: 'Alice' });
    const node = model.index.get('/name')!;
    expect(hasFieldErrors(node)).toBe(false);
  });

  test('type mismatch produces error', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        age: { type: 'number' },
      },
    };
    const model = runWithEnrichment(schema, { age: 'not-a-number' });
    const node = model.index.get('/age')!;
    expect(hasFieldErrors(node)).toBe(true);
    const errors = getFieldErrors(node);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].keyword).toBe('type');
  });

  test('skips null/undefined values', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 3 },
      },
    };
    const model = runWithEnrichment(schema, {});
    const node = model.index.get('/name')!;
    expect(hasFieldErrors(node)).toBe(false);
  });

  test('skips empty string values', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 3 },
      },
    };
    const model = runWithEnrichment(schema, { name: '' });
    const node = model.index.get('/name')!;
    expect(hasFieldErrors(node)).toBe(false);
  });

  test('constraint violations produce errors', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 3 },
      },
    };
    const model = runWithEnrichment(schema, { name: 'AB' });
    const node = model.index.get('/name')!;
    expect(hasFieldErrors(node)).toBe(true);
    expect(getFieldErrors(node)[0].keyword).toBe('minLength');
  });
});
