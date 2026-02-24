import { describe, expect, test } from 'bun:test';
import { resolveAllRefs } from '../schema/ref-resolver.js';
import type { JSONSchema } from '../types.js';

describe('resolveAllRefs', () => {
  test('resolves simple $ref to $defs', () => {
    const schema: JSONSchema = {
      $defs: { Name: { type: 'string', minLength: 1 } },
      properties: {
        name: { $ref: '#/$defs/Name' },
      },
    };
    const result = resolveAllRefs(schema);
    expect(result.properties!.name).toEqual({ type: 'string', minLength: 1 });
  });

  test('resolves nested $ref', () => {
    const schema: JSONSchema = {
      $defs: {
        Address: {
          type: 'object',
          properties: {
            street: { $ref: '#/$defs/Street' },
          },
        },
        Street: { type: 'string' },
      },
      properties: {
        address: { $ref: '#/$defs/Address' },
      },
    };
    const result = resolveAllRefs(schema);
    expect(result.properties!.address.properties!.street).toEqual({
      type: 'string',
    });
  });

  test('handles circular $ref without infinite loop', () => {
    const schema: JSONSchema = {
      $defs: {
        Node: {
          type: 'object',
          properties: {
            child: { $ref: '#/$defs/Node' },
          },
        },
      },
      properties: {
        tree: { $ref: '#/$defs/Node' },
      },
    };
    // Should not throw or loop forever
    const result = resolveAllRefs(schema);
    expect(result.properties!.tree.type).toBe('object');
    // The circular ref should remain as $ref
    expect(result.properties!.tree.properties!.child.$ref).toBe('#/$defs/Node');
  });

  test('unresolvable $ref is kept as-is', () => {
    const schema: JSONSchema = {
      properties: {
        foo: { $ref: '#/$defs/DoesNotExist' },
      },
    };
    const result = resolveAllRefs(schema);
    expect(result.properties!.foo.$ref).toBe('#/$defs/DoesNotExist');
  });

  test('resolves refs in allOf', () => {
    const schema: JSONSchema = {
      $defs: {
        Base: { type: 'object', properties: { id: { type: 'number' } } },
      },
      allOf: [{ $ref: '#/$defs/Base' }, { properties: { name: { type: 'string' } } }],
    };
    const result = resolveAllRefs(schema);
    expect(result.allOf![0].properties!.id).toEqual({ type: 'number' });
  });

  test('resolves refs in if/then/else', () => {
    const schema: JSONSchema = {
      $defs: { Check: { properties: { type: { const: 'a' } } } },
      if: { $ref: '#/$defs/Check' },
      then: { properties: { a: { type: 'string' } } },
    };
    const result = resolveAllRefs(schema);
    expect(result.if!.properties!.type.const).toBe('a');
  });
});
