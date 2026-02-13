import { describe, expect, test } from 'bun:test';
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
    expect(model.root.type).toBe('object');
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
    store.subscribe(m => models.push(m.data));
    store.setData('/name', 'Bob');
    expect(models).toHaveLength(1);
    expect((models[0] as Record<string, unknown>).name).toBe('Bob');
  });

  test('subscribePath notifies only affected path', () => {
    const store = createFormStore(schema, { name: 'Alice', age: 30 });
    const nameValues: unknown[] = [];
    const ageValues: unknown[] = [];

    store.subscribePath('/name', node => nameValues.push(node.value));
    store.subscribePath('/age', node => ageValues.push(node.value));

    store.setData('/name', 'Bob');
    expect(nameValues).toEqual(['Bob']);
    expect(ageValues).toHaveLength(0);
  });

  test('unsubscribe works', () => {
    const store = createFormStore(schema, { name: 'Alice' });
    const values: unknown[] = [];
    const unsub = store.subscribe(m => values.push(m.data));
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
