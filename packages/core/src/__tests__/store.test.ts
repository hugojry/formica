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

  test('subscribe notifies on data change', () => {
    const store = createFormStore(schema, { name: 'Alice' });
    const models: unknown[] = [];
    store.subscribe((m) => models.push(m.data));
    store.setData('/name', 'Bob');
    expect(models).toHaveLength(1);
    expect((models[0] as Record<string, unknown>).name).toBe('Bob');
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

  test('unsubscribe works', () => {
    const store = createFormStore(schema, { name: 'Alice' });
    const values: unknown[] = [];
    const unsub = store.subscribe((m) => values.push(m.data));
    store.setData('/name', 'Bob');
    unsub();
    store.setData('/name', 'Charlie');
    expect(values).toHaveLength(1);
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

  test('ancestor path subscriber is notified on nested change', () => {
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
    expect(notifications).toContain('address');
    expect(notifications).not.toContain('zip');
  });

  test('root subscriber is notified on any change', () => {
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
    expect(notifications).toContain('root');
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
    // Subscribe to model-level to verify structural change happens
    store.subscribe(() => notifications.push('model'));

    store.setData('/type', 'business');
    expect(notifications).toContain('type');
    expect(notifications).toContain('model');
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

describe('FormState', () => {
  const schema: JSONSchema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' },
    },
  };

  test('getState returns initial data and isDirty false', () => {
    const store = createFormStore(schema, { name: 'Alice', age: 30 });
    const state = store.getState();
    expect(state.isDirty).toBe(false);
    expect((state.data as Record<string, unknown>).name).toBe('Alice');
  });

  test('getState.data updates after setData', () => {
    const store = createFormStore(schema, { name: 'Alice' });
    store.setData('/name', 'Bob');
    expect((store.getState().data as Record<string, unknown>).name).toBe('Bob');
  });

  test('isDirty becomes true after setData', () => {
    const store = createFormStore(schema, { name: 'Alice', age: 30 });
    store.setData('/name', 'Bob');
    expect(store.getState().isDirty).toBe(true);
  });

  test('isDirty returns to false when data matches initial', () => {
    const store = createFormStore(schema, { name: 'Alice', age: 30 });
    store.setData('/name', 'Bob');
    expect(store.getState().isDirty).toBe(true);
    store.setData('/name', 'Alice');
    expect(store.getState().isDirty).toBe(false);
  });

  test('subscribeState notifies on every data change', () => {
    const store = createFormStore(schema, { name: 'Alice' });
    const names: unknown[] = [];
    store.subscribeState((s) => names.push((s.data as Record<string, unknown>).name));

    store.setData('/name', 'Bob');
    store.setData('/name', 'Charlie');
    expect(names).toEqual(['Bob', 'Charlie']);
  });

  test('subscribeState notifies when isDirty changes', () => {
    const store = createFormStore(schema, { name: 'Alice' });
    const dirtyStates: boolean[] = [];
    store.subscribeState((s) => dirtyStates.push(s.isDirty));

    store.setData('/name', 'Bob');
    expect(dirtyStates).toEqual([true]);

    store.setData('/name', 'Alice');
    expect(dirtyStates).toEqual([true, false]);
  });

  test('isDirty false when no initial data and no changes', () => {
    const store = createFormStore(schema);
    expect(store.getState().isDirty).toBe(false);
  });
});
