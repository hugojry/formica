import { describe, expect, test } from 'bun:test';
import { normalizeSchemaDraft7 } from '../schema/normalize.js';
import type { JSONSchema } from '../types.js';

describe('normalizeSchemaDraft7', () => {
  test('definitions → $defs', () => {
    const schema: JSONSchema = {
      definitions: { Foo: { type: 'string' } },
    };
    const result = normalizeSchemaDraft7(structuredClone(schema));
    expect(result.$defs).toEqual({ Foo: { type: 'string' } });
    expect(result.definitions).toBeUndefined();
  });

  test('does not overwrite existing $defs', () => {
    const schema: JSONSchema = {
      $defs: { Bar: { type: 'number' } },
      definitions: { Foo: { type: 'string' } },
    };
    const result = normalizeSchemaDraft7(structuredClone(schema));
    expect(result.$defs).toEqual({ Bar: { type: 'number' } });
  });

  test('array items → prefixItems', () => {
    const schema: JSONSchema = {
      items: [{ type: 'string' }, { type: 'number' }] as any,
      additionalItems: { type: 'boolean' },
    };
    const result = normalizeSchemaDraft7(structuredClone(schema));
    expect(result.prefixItems).toEqual([{ type: 'string' }, { type: 'number' }]);
    expect(result.items).toEqual({ type: 'boolean' });
    expect(result.additionalItems).toBeUndefined();
  });

  test('array items with additionalItems: false', () => {
    const schema: JSONSchema = {
      items: [{ type: 'string' }] as any,
      additionalItems: false,
    };
    const result = normalizeSchemaDraft7(structuredClone(schema));
    expect(result.prefixItems).toEqual([{ type: 'string' }]);
    expect(result.items).toBe(false);
  });

  test('boolean exclusiveMinimum', () => {
    const schema: JSONSchema = {
      minimum: 5,
      exclusiveMinimum: true as any,
    };
    const result = normalizeSchemaDraft7(structuredClone(schema));
    expect(result.exclusiveMinimum).toBe(5);
    expect(result.minimum).toBeUndefined();
  });

  test('boolean exclusiveMaximum', () => {
    const schema: JSONSchema = {
      maximum: 10,
      exclusiveMaximum: true as any,
    };
    const result = normalizeSchemaDraft7(structuredClone(schema));
    expect(result.exclusiveMaximum).toBe(10);
    expect(result.maximum).toBeUndefined();
  });

  test('boolean exclusiveMinimum: false is removed', () => {
    const schema: JSONSchema = {
      minimum: 5,
      exclusiveMinimum: false as any,
    };
    const result = normalizeSchemaDraft7(structuredClone(schema));
    expect(result.exclusiveMinimum).toBeUndefined();
    expect(result.minimum).toBe(5);
  });

  test('dependencies (array) → dependentRequired', () => {
    const schema: JSONSchema = {
      dependencies: { foo: ['bar', 'baz'] },
    };
    const result = normalizeSchemaDraft7(structuredClone(schema));
    expect(result.dependentRequired).toEqual({ foo: ['bar', 'baz'] });
    expect(result.dependencies).toBeUndefined();
  });

  test('dependencies (schema) → dependentSchemas', () => {
    const schema: JSONSchema = {
      dependencies: {
        foo: { properties: { bar: { type: 'string' } } },
      },
    };
    const result = normalizeSchemaDraft7(structuredClone(schema));
    expect(result.dependentSchemas).toEqual({
      foo: { properties: { bar: { type: 'string' } } },
    });
    expect(result.dependencies).toBeUndefined();
  });

  test('mixed dependencies', () => {
    const schema: JSONSchema = {
      dependencies: {
        foo: ['bar'],
        baz: { properties: { qux: { type: 'number' } } },
      },
    };
    const result = normalizeSchemaDraft7(structuredClone(schema));
    expect(result.dependentRequired).toEqual({ foo: ['bar'] });
    expect(result.dependentSchemas).toEqual({
      baz: { properties: { qux: { type: 'number' } } },
    });
  });

  test('recurses into nested schemas', () => {
    const schema: JSONSchema = {
      properties: {
        nested: {
          definitions: { Inner: { type: 'boolean' } },
        },
      },
    };
    const result = normalizeSchemaDraft7(structuredClone(schema));
    expect(result.properties!.nested.$defs).toEqual({
      Inner: { type: 'boolean' },
    });
  });
});
