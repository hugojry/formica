import { describe, expect, test } from 'bun:test';
import { prepareSchema } from '../schema/prepare.js';
import type { JSONSchema } from '../types.js';

describe('prepareSchema', () => {
  test('normalizes Draft 7 definitions to $defs', () => {
    const schema: JSONSchema = {
      definitions: {
        Name: { type: 'string' },
      },
      type: 'object',
      properties: {
        name: { $ref: '#/$defs/Name' },
      },
    };
    const result = prepareSchema(schema);
    expect(result.$defs).toBeDefined();
    expect(result.$defs!.Name).toEqual({ type: 'string' });
    expect(result.definitions).toBeUndefined();
  });

  test('resolves $ref', () => {
    const schema: JSONSchema = {
      $defs: {
        Age: { type: 'integer', minimum: 0 },
      },
      type: 'object',
      properties: {
        age: { $ref: '#/$defs/Age' },
      },
    };
    const result = prepareSchema(schema);
    expect(result.properties!.age).toEqual({ type: 'integer', minimum: 0 });
    expect(result.properties!.age.$ref).toBeUndefined();
  });

  test('merges allOf', () => {
    const schema: JSONSchema = {
      allOf: [
        { type: 'object', properties: { a: { type: 'string' } } },
        { properties: { b: { type: 'number' } }, required: ['b'] },
      ],
    };
    const result = prepareSchema(schema);
    expect(result.allOf).toBeUndefined();
    expect(result.properties!.a).toEqual({ type: 'string' });
    expect(result.properties!.b).toEqual({ type: 'number' });
    expect(result.required).toEqual(['b']);
  });

  test('composes all three transforms', () => {
    const schema: JSONSchema = {
      definitions: {
        Base: {
          type: 'object',
          properties: { id: { type: 'string' } },
        },
      },
      allOf: [{ $ref: '#/$defs/Base' }, { properties: { name: { type: 'string' } } }],
    };
    const result = prepareSchema(schema);
    expect(result.allOf).toBeUndefined();
    expect(result.properties!.id).toEqual({ type: 'string' });
    expect(result.properties!.name).toEqual({ type: 'string' });
  });

  test('does not mutate the input schema', () => {
    const schema: JSONSchema = {
      definitions: {
        X: { type: 'string' },
      },
      type: 'object',
      properties: {
        x: { $ref: '#/$defs/X' },
      },
    };
    const original = structuredClone(schema);
    prepareSchema(schema);
    expect(schema).toEqual(original);
  });

  test('normalizes Draft 7 dependencies', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        a: { type: 'string' },
        b: { type: 'string' },
      },
      dependencies: {
        a: ['b'],
      },
    };
    const result = prepareSchema(schema);
    expect(result.dependencies).toBeUndefined();
    expect(result.dependentRequired).toEqual({ a: ['b'] });
  });
});
