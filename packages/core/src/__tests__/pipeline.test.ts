import { describe, expect, test } from 'bun:test';
import { runPipeline } from '../pipeline/pipeline.js';
import { PipelineStage } from '../types.js';
import type { JSONSchema, Middleware, PipelineConfig } from '../types.js';

describe('runPipeline — basic schemas', () => {
  test('simple string property', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    };
    const model = runPipeline(schema, { name: 'Alice' });
    expect(model.root!.type).toBe('object');
    expect(model.root!.children).toHaveLength(1);
    expect(model.root!.children[0].path).toBe('/name');
    expect(model.root!.children[0].value).toBe('Alice');
    expect(model.root!.children[0].type).toBe('string');
  });

  test('multiple properties', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
        active: { type: 'boolean' },
      },
      required: ['name'],
    };
    const model = runPipeline(schema, { name: 'Bob', age: 30 });
    expect(model.root!.children).toHaveLength(3);

    const nameNode = model.index.get('/name')!;
    expect(nameNode.required).toBe(true);
    expect(nameNode.value).toBe('Bob');

    const ageNode = model.index.get('/age')!;
    expect(ageNode.required).toBe(false);
    expect(ageNode.value).toBe(30);

    const activeNode = model.index.get('/active')!;
    expect(activeNode.value).toBeUndefined();
  });

  test('nested objects', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        address: {
          type: 'object',
          properties: {
            street: { type: 'string' },
            city: { type: 'string' },
          },
        },
      },
    };
    const data = { address: { street: '123 Main', city: 'Springfield' } };
    const model = runPipeline(schema, data);

    const streetNode = model.index.get('/address/street')!;
    expect(streetNode.value).toBe('123 Main');
    expect(streetNode.origin).toBe('property');
  });

  test('array items', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        tags: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    };
    const data = { tags: ['a', 'b', 'c'] };
    const model = runPipeline(schema, data);

    const tagsNode = model.index.get('/tags')!;
    expect(tagsNode.type).toBe('array');
    expect(tagsNode.children).toHaveLength(3);
    expect(tagsNode.arrayMeta).toBeDefined();
    expect(tagsNode.arrayMeta!.canAdd).toBe(true);

    expect(model.index.get('/tags/0')!.value).toBe('a');
    expect(model.index.get('/tags/1')!.value).toBe('b');
    expect(model.index.get('/tags/2')!.value).toBe('c');
  });

  test('array with maxItems', () => {
    const schema: JSONSchema = {
      type: 'array',
      items: { type: 'number' },
      maxItems: 2,
    };
    const model = runPipeline(schema, [1, 2]);
    expect(model.root!.arrayMeta!.canAdd).toBe(false);
  });

  test('enum constraints', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        color: { type: 'string', enum: ['red', 'green', 'blue'] },
      },
    };
    const model = runPipeline(schema, { color: 'red' });
    const colorNode = model.index.get('/color')!;
    expect(colorNode.constraints.enum).toEqual(['red', 'green', 'blue']);
  });

  test('readOnly and deprecated', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        id: { type: 'string', readOnly: true },
        old: { type: 'string', deprecated: true },
      },
    };
    const model = runPipeline(schema);
    expect(model.index.get('/id')!.readOnly).toBe(true);
    expect(model.index.get('/old')!.deprecated).toBe(true);
  });

  test('numeric constraints', () => {
    const schema: JSONSchema = {
      type: 'number',
      minimum: 0,
      maximum: 100,
      multipleOf: 5,
    };
    const model = runPipeline(schema, 50);
    expect(model.root!.constraints.minimum).toBe(0);
    expect(model.root!.constraints.maximum).toBe(100);
    expect(model.root!.constraints.multipleOf).toBe(5);
  });

  test('string constraints', () => {
    const schema: JSONSchema = {
      type: 'string',
      minLength: 1,
      maxLength: 50,
      pattern: '^[a-z]+$',
      format: 'email',
    };
    const model = runPipeline(schema, 'test');
    expect(model.root!.constraints.minLength).toBe(1);
    expect(model.root!.constraints.maxLength).toBe(50);
    expect(model.root!.constraints.pattern).toBe('^[a-z]+$');
    expect(model.root!.constraints.format).toBe('email');
  });
});

describe('runPipeline — allOf', () => {
  test('merges allOf schemas', () => {
    const schema: JSONSchema = {
      allOf: [
        { type: 'object', properties: { a: { type: 'string' } } },
        { properties: { b: { type: 'number' } }, required: ['b'] },
      ],
    };
    const model = runPipeline(schema, { a: 'hello', b: 42 });
    expect(model.index.get('/a')!.value).toBe('hello');
    expect(model.index.get('/b')!.value).toBe(42);
    expect(model.index.get('/b')!.required).toBe(true);
  });

  test('merges nested allOf', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        field: {
          allOf: [
            { type: 'number', minimum: 0 },
            { maximum: 100 },
          ],
        },
      },
    };
    const model = runPipeline(schema, { field: 50 });
    const node = model.index.get('/field')!;
    expect(node.constraints.minimum).toBe(0);
    expect(node.constraints.maximum).toBe(100);
  });
});

describe('runPipeline — if/then/else', () => {
  test('then branch when condition matches', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['personal', 'business'] },
      },
      if: { properties: { type: { const: 'business' } } },
      then: { properties: { company: { type: 'string' } } },
      else: { properties: { firstName: { type: 'string' } } },
    };

    const model = runPipeline(schema, { type: 'business' });
    expect(model.index.has('/company')).toBe(true);
    expect(model.index.has('/firstName')).toBe(false);
  });

  test('else branch when condition does not match', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['personal', 'business'] },
      },
      if: { properties: { type: { const: 'business' } } },
      then: { properties: { company: { type: 'string' } } },
      else: { properties: { firstName: { type: 'string' } } },
    };

    const model = runPipeline(schema, { type: 'personal' });
    expect(model.index.has('/company')).toBe(false);
    expect(model.index.has('/firstName')).toBe(true);
  });

  test('no data — else branch', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        type: { type: 'string' },
      },
      if: { properties: { type: { const: 'special' } } },
      then: { properties: { extra: { type: 'string' } } },
    };
    const model = runPipeline(schema, {});
    expect(model.index.has('/extra')).toBe(false);
  });
});

describe('runPipeline — dependentSchemas/dependentRequired', () => {
  test('dependentRequired activates when key present', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        email: { type: 'string' },
        emailVerified: { type: 'boolean' },
      },
      dependentRequired: {
        email: ['emailVerified'],
      },
    };
    const model = runPipeline(schema, { email: 'a@b.com' });
    expect(model.index.get('/emailVerified')!.required).toBe(true);
  });

  test('dependentRequired inactive when key absent', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        email: { type: 'string' },
        emailVerified: { type: 'boolean' },
      },
      dependentRequired: {
        email: ['emailVerified'],
      },
    };
    const model = runPipeline(schema, {});
    expect(model.index.get('/emailVerified')!.required).toBe(false);
  });

  test('dependentSchemas adds properties when key present', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        creditCard: { type: 'string' },
      },
      dependentSchemas: {
        creditCard: {
          properties: {
            billingAddress: { type: 'string' },
          },
          required: ['billingAddress'],
        },
      },
    };
    const model = runPipeline(schema, { creditCard: '1234' });
    expect(model.index.has('/billingAddress')).toBe(true);
    expect(model.index.get('/billingAddress')!.required).toBe(true);
  });
});

describe('runPipeline — $ref', () => {
  test('resolves $ref to $defs', () => {
    const schema: JSONSchema = {
      $defs: {
        Name: { type: 'string', minLength: 1 },
      },
      type: 'object',
      properties: {
        name: { $ref: '#/$defs/Name' },
      },
    };
    const model = runPipeline(schema, { name: 'Alice' });
    const nameNode = model.index.get('/name')!;
    expect(nameNode.type).toBe('string');
    expect(nameNode.constraints.minLength).toBe(1);
  });
});

describe('runPipeline — oneOf', () => {
  test('selects matching branch', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        value: {
          oneOf: [
            { type: 'string', title: 'Text' },
            { type: 'number', title: 'Number' },
          ],
        },
      },
    };
    const model = runPipeline(schema, { value: 'hello' });
    const valueNode = model.index.get('/value')!;
    expect(valueNode.combinator).toBeDefined();
    expect(valueNode.combinator!.type).toBe('oneOf');
    expect(valueNode.combinator!.activeIndex).toBe(0);
    expect(valueNode.combinator!.labels).toEqual(['Text', 'Number']);
  });

  test('selects second branch for number', () => {
    const schema: JSONSchema = {
      oneOf: [
        { type: 'string', title: 'Text' },
        { type: 'number', title: 'Number' },
      ],
    };
    const model = runPipeline(schema, 42);
    expect(model.root!.combinator!.activeIndex).toBe(1);
  });

  test('null activeIndex when no match', () => {
    const schema: JSONSchema = {
      oneOf: [
        { type: 'string' },
        { type: 'number' },
      ],
    };
    const model = runPipeline(schema, true);
    expect(model.root!.combinator!.activeIndex).toBeNull();
  });
});

describe('runPipeline — Draft 7 normalization', () => {
  test('Draft 7 definitions are resolved', () => {
    const schema: JSONSchema = {
      definitions: {
        Age: { type: 'integer', minimum: 0 },
      },
      type: 'object',
      properties: {
        age: { $ref: '#/$defs/Age' },
      },
    };
    const model = runPipeline(schema, { age: 25 });
    const ageNode = model.index.get('/age')!;
    expect(ageNode.type).toBe('integer');
    expect(ageNode.constraints.minimum).toBe(0);
  });

  test('Draft 7 dependencies normalized', () => {
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
    const model = runPipeline(schema, { a: 'hello' });
    expect(model.index.get('/b')!.required).toBe(true);
  });
});

describe('runPipeline — defaults', () => {
  test('seeds default values', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', default: 'unnamed' },
        age: { type: 'number' },
      },
    };
    const model = runPipeline(schema);
    expect(model.index.get('/name')!.value).toBe('unnamed');
  });

  test('does not overwrite existing data', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', default: 'unnamed' },
      },
    };
    const model = runPipeline(schema, { name: 'Alice' });
    expect(model.index.get('/name')!.value).toBe('Alice');
  });
});

describe('runPipeline — index', () => {
  test('index has O(1) lookup for all paths', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        a: {
          type: 'object',
          properties: {
            b: { type: 'string' },
            c: { type: 'number' },
          },
        },
        d: { type: 'boolean' },
      },
    };
    const model = runPipeline(schema, { a: { b: 'x', c: 1 }, d: true });
    expect(model.index.get('')).toBe(model.root);
    expect(model.index.get('/a')).toBeDefined();
    expect(model.index.get('/a/b')!.value).toBe('x');
    expect(model.index.get('/a/c')!.value).toBe(1);
    expect(model.index.get('/d')!.value).toBe(true);
  });
});

describe('middleware', () => {
  test('middleware can wrap a stage', () => {
    const log: string[] = [];
    const middleware: Middleware = (ctx, next) => {
      log.push('before');
      const result = next();
      log.push('after');
      return result;
    };

    const config: PipelineConfig = {
      middleware: {
        [PipelineStage.FINALIZE]: [middleware],
      },
    };

    runPipeline({ type: 'string' }, 'test', config);
    expect(log).toEqual(['before', 'after']);
  });

  test('middleware can modify context', () => {
    const middleware: Middleware = (ctx, next) => {
      const result = next();
      // Add extension to all nodes
      for (const [, node] of result.index) {
        node.extensions.custom = true;
      }
      return result;
    };

    const config: PipelineConfig = {
      middleware: {
        [PipelineStage.FINALIZE]: [middleware],
      },
    };

    const model = runPipeline({ type: 'string' }, 'test', config);
    expect(model.root!.extensions.custom).toBe(true);
  });

  test('middleware can skip built-in stage', () => {
    const middleware: Middleware = (ctx, _next) => {
      // Skip built-in, just return ctx as-is
      return ctx;
    };

    const config: PipelineConfig = {
      middleware: {
        [PipelineStage.APPLY_DEFAULTS]: [middleware],
      },
    };

    const schema: JSONSchema = {
      type: 'object',
      properties: { name: { type: 'string', default: 'should_not_appear' } },
    };
    const model = runPipeline(schema, undefined, config);
    // Default was skipped
    expect(model.index.get('/name')!.value).toBeUndefined();
  });

  test('multiple middleware compose in order', () => {
    const log: string[] = [];
    const mw1: Middleware = (ctx, next) => { log.push('1-before'); const r = next(); log.push('1-after'); return r; };
    const mw2: Middleware = (ctx, next) => { log.push('2-before'); const r = next(); log.push('2-after'); return r; };

    const config: PipelineConfig = {
      middleware: { [PipelineStage.FINALIZE]: [mw1, mw2] },
    };

    runPipeline({ type: 'string' }, 'x', config);
    expect(log).toEqual(['1-before', '2-before', '2-after', '1-after']);
  });
});
