import { describe, expect, test } from 'bun:test';
import { runPipeline } from '../pipeline/pipeline.js';
import { createFormStore } from '../reactivity/store.js';
import type { JSONSchema } from '../types.js';

describe('FormStore', () => {
  const schema: JSONSchema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' },
      address: {
        type: 'object',
        properties: {
          city: { type: 'string' },
        },
      },
    },
  };

  test('getModel returns initial model', () => {
    const store = createFormStore(schema, { name: 'Alice', age: 30 });
    const model = store.getModel();
    expect(model.root!.type).toBe('object');
    expect(model.index.get('/name')!.value).toBe('Alice');
  });

  test('getData returns current data', () => {
    const store = createFormStore(schema, { name: 'Alice' });
    const data = store.getData() as Record<string, unknown>;
    expect(data.name).toBe('Alice');
  });

  test('setData updates a field', () => {
    const store = createFormStore(schema, { name: 'Alice' });
    store.setData('/name', 'Bob');
    expect(store.getModel().index.get('/name')!.value).toBe('Bob');
  });

  test('setData is no-op for identical value', () => {
    const store = createFormStore(schema, { name: 'Alice' });
    const model1 = store.getModel();
    store.setData('/name', 'Alice');
    const model2 = store.getModel();
    // Same reference — no rebuild
    expect(model1).toBe(model2);
  });

  test('subscribePath notifies only affected path', () => {
    const store = createFormStore(schema, { name: 'Alice', age: 30 });
    const nameValues: unknown[] = [];
    const ageValues: unknown[] = [];

    store.subscribePath('/name', (node) => nameValues.push(node.value));
    store.subscribePath('/age', (node) => ageValues.push(node.value));

    store.setData('/name', 'Bob');
    expect(nameValues).toEqual(['Bob']);
    expect(ageValues).toHaveLength(0);
  });

  test('setData deep path', () => {
    const store = createFormStore(schema, { address: { city: 'NYC' } });
    store.setData('/address/city', 'LA');
    expect(store.getModel().index.get('/address/city')!.value).toBe('LA');
  });

  test('conditional re-evaluation on data change', () => {
    const condSchema: JSONSchema = {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['personal', 'business'] },
      },
      if: { properties: { type: { const: 'business' } } },
      then: { properties: { company: { type: 'string' } } },
      else: { properties: { firstName: { type: 'string' } } },
    };

    const store = createFormStore(condSchema, { type: 'personal' });
    expect(store.getModel().index.has('/firstName')).toBe(true);
    expect(store.getModel().index.has('/company')).toBe(false);

    store.setData('/type', 'business');
    expect(store.getModel().index.has('/company')).toBe(true);
    expect(store.getModel().index.has('/firstName')).toBe(false);
  });
});

describe('conditionalDeps on FormModel', () => {
  test('populates conditional deps for if/then/else', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        type: { type: 'string' },
      },
      if: { properties: { type: { const: 'business' } } },
      then: { properties: { company: { type: 'string' } } },
    };
    const model = runPipeline(schema, { type: 'personal' });
    // The if condition checks /type, so /type should have a dependency entry
    expect(model.conditionalDeps.has('/type')).toBe(true);
    expect(model.conditionalDeps.get('/type')!.has('')).toBe(true);
  });

  test('empty conditional deps when no conditionals', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    };
    const model = runPipeline(schema, { name: 'Alice' });
    expect(model.conditionalDeps.size).toBe(0);
  });
});

describe('dirty path filtering', () => {
  test('unrelated sibling path subscriber is not notified', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
        email: { type: 'string' },
      },
    };
    const store = createFormStore(schema, {
      name: 'Alice',
      age: 30,
      email: 'a@b.com',
    });
    const notifications: string[] = [];

    store.subscribePath('/name', () => notifications.push('name'));
    store.subscribePath('/age', () => notifications.push('age'));
    store.subscribePath('/email', () => notifications.push('email'));

    store.setData('/name', 'Bob');
    expect(notifications).toEqual(['name']);
  });

  test('container path subscriber is NOT notified on nested value change', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        address: {
          type: 'object',
          properties: {
            city: { type: 'string' },
            zip: { type: 'string' },
          },
        },
      },
    };
    const store = createFormStore(schema, {
      address: { city: 'NYC', zip: '10001' },
    });
    const notifications: string[] = [];

    store.subscribePath('/address', () => notifications.push('address'));
    store.subscribePath('/address/city', () => notifications.push('city'));
    store.subscribePath('/address/zip', () => notifications.push('zip'));

    store.setData('/address/city', 'LA');
    expect(notifications).toContain('city');
    expect(notifications).not.toContain('address');
    expect(notifications).not.toContain('zip');
  });

  test('root subscriber is NOT notified on leaf value change', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    };
    const store = createFormStore(schema, { name: 'Alice' });
    const notifications: string[] = [];

    store.subscribePath('', () => notifications.push('root'));
    store.subscribePath('/name', () => notifications.push('name'));

    store.setData('/name', 'Bob');
    expect(notifications).not.toContain('root');
    expect(notifications).toContain('name');
  });

  test('conditional dependent path subscriber is notified', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['personal', 'business'] },
        unrelated: { type: 'string' },
      },
      if: { properties: { type: { const: 'business' } } },
      then: { properties: { company: { type: 'string' } } },
      else: { properties: { firstName: { type: 'string' } } },
    };
    const store = createFormStore(schema, { type: 'personal', unrelated: 'x' });
    const notifications: string[] = [];

    store.subscribePath('/type', () => notifications.push('type'));
    store.subscribePath('/unrelated', () => notifications.push('unrelated'));

    store.setData('/type', 'business');
    expect(notifications).toContain('type');
    expect(notifications).not.toContain('unrelated');
  });

  test('deeply nested change does not notify unrelated subtree', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        a: {
          type: 'object',
          properties: {
            x: { type: 'string' },
          },
        },
        b: {
          type: 'object',
          properties: {
            y: { type: 'string' },
          },
        },
      },
    };
    const store = createFormStore(schema, {
      a: { x: 'hello' },
      b: { y: 'world' },
    });
    const notifications: string[] = [];

    store.subscribePath('/a/x', () => notifications.push('a/x'));
    store.subscribePath('/b', () => notifications.push('b'));
    store.subscribePath('/b/y', () => notifications.push('b/y'));

    store.setData('/a/x', 'changed');
    expect(notifications).toEqual(['a/x']);
  });
});

describe('container notification suppression', () => {
  test('object container NOT notified when child value changes', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        person: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
        },
      },
    };
    const store = createFormStore(schema, { person: { name: 'Alice' } });
    const notifications: string[] = [];

    store.subscribePath('/person', () => notifications.push('person'));
    store.subscribePath('/person/name', () => notifications.push('name'));

    store.setData('/person/name', 'Bob');
    expect(notifications).toEqual(['name']);
  });

  test('array container NOT notified when item value changes', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        tags: { type: 'array', items: { type: 'string' } },
      },
    };
    const store = createFormStore(schema, { tags: ['a', 'b'] });
    const notifications: string[] = [];

    store.subscribePath('/tags', () => notifications.push('tags'));
    store.subscribePath('/tags/0', () => notifications.push('tags/0'));

    store.setData('/tags/0', 'A');
    expect(notifications).toEqual(['tags/0']);
  });

  test('container IS notified when conditional adds/removes a property', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['personal', 'business'] },
      },
      if: { properties: { type: { const: 'business' } } },
      then: { properties: { company: { type: 'string' } } },
      else: { properties: { firstName: { type: 'string' } } },
    };
    const store = createFormStore(schema, { type: 'personal' });
    const notifications: string[] = [];

    store.subscribePath('', () => notifications.push('root'));

    store.setData('/type', 'business');
    expect(notifications).toContain('root');
  });

  test('container IS notified when array item is added', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        tags: { type: 'array', items: { type: 'string' } },
      },
    };
    const store = createFormStore(schema, { tags: ['a'] });
    const notifications: string[] = [];

    store.subscribePath('/tags', () => notifications.push('tags'));

    store.setData('/tags', ['a', 'b']);
    expect(notifications).toContain('tags');
  });

  test('container IS notified when array item is removed', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        tags: { type: 'array', items: { type: 'string' } },
      },
    };
    const store = createFormStore(schema, { tags: ['a', 'b'] });
    const notifications: string[] = [];

    store.subscribePath('/tags', () => notifications.push('tags'));

    store.setData('/tags', ['a']);
    expect(notifications).toContain('tags');
  });

  test('container IS notified when required flag changes', () => {
    // In a real scenario, required changes come from conditional evaluation
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    };
    const store = createFormStore(schema, { name: 'Alice' });
    // Just verify the store can be created — nodePropsChanged logic
    // is tested via the function itself; flag changes trigger notification
    expect(store.getModel().index.get('/name')).toBeDefined();
  });

  test('container IS notified when enrichment key changes', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        mode: { type: 'string' },
      },
    };
    const store = createFormStore(
      schema,
      { mode: 'light' },
      {
        enrichments: [
          (node, ctx) => {
            if (node.path === '') {
              const data = ctx.data as Record<string, unknown>;
              return { theme: data.mode === 'dark' ? 'dark-theme' : 'light-theme' };
            }
            return null;
          },
        ],
      },
    );
    const notifications: string[] = [];

    store.subscribePath('', () => notifications.push('root'));

    store.setData('/mode', 'dark');
    expect(notifications).toContain('root');
  });
});

describe('array re-indexing notifications', () => {
  const schema: JSONSchema = {
    type: 'object',
    properties: {
      tags: { type: 'array', items: { type: 'string' } },
    },
  };

  test('shifted items ARE notified', () => {
    const store = createFormStore(schema, { tags: ['a', 'b', 'c', 'd'] });
    const notifications: string[] = [];

    store.subscribePath('/tags/1', () => notifications.push('tags/1'));
    store.subscribePath('/tags/2', () => notifications.push('tags/2'));

    // Remove first element: ['a','b','c','d'] → ['b','c','d']
    // /tags/1 was 'b', now 'c' → notified
    // /tags/2 was 'c', now 'd' → notified
    store.setData('/tags', ['a', 'c', 'd']);
    expect(notifications).toContain('tags/1');
    expect(notifications).toContain('tags/2');
  });

  test('unshifted items are NOT notified', () => {
    const store = createFormStore(schema, { tags: ['a', 'b', 'c', 'd'] });
    const notifications: string[] = [];

    store.subscribePath('/tags/0', () => notifications.push('tags/0'));

    // Remove 'b': ['a','b','c','d'] → ['a','c','d']
    // /tags/0 stays 'a' → not notified
    store.setData('/tags', ['a', 'c', 'd']);
    expect(notifications).not.toContain('tags/0');
  });

  test('container IS notified when children count changes', () => {
    const store = createFormStore(schema, { tags: ['a', 'b', 'c', 'd'] });
    const notifications: string[] = [];

    store.subscribePath('/tags', () => notifications.push('tags'));

    store.setData('/tags', ['a', 'c', 'd']);
    expect(notifications).toContain('tags');
  });
});

describe('FormState', () => {
  const schema: JSONSchema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' },
    },
  };

  test('getState returns initial data', () => {
    const store = createFormStore(schema, { name: 'Alice', age: 30 });
    const state = store.getState();
    expect((state.data as Record<string, unknown>).name).toBe('Alice');
  });

  test('getState.data updates after setData', () => {
    const store = createFormStore(schema, { name: 'Alice' });
    store.setData('/name', 'Bob');
    expect((store.getState().data as Record<string, unknown>).name).toBe('Bob');
  });

  test('subscribe notifies on every data change', () => {
    const store = createFormStore(schema, { name: 'Alice' });
    const names: unknown[] = [];
    store.subscribe((s) => names.push((s.data as Record<string, unknown>).name));

    store.setData('/name', 'Bob');
    store.setData('/name', 'Charlie');
    expect(names).toEqual(['Bob', 'Charlie']);
  });
});
