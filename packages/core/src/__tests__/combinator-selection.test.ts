import { describe, expect, test } from 'bun:test';
import { runPipeline } from '../pipeline/pipeline.js';
import { createFormStore } from '../reactivity/store.js';
import type { JSONSchema } from '../types.js';

// ─── Schema fixtures ───

const objectOneOfSchema: JSONSchema = {
  type: 'object',
  oneOf: [
    {
      title: 'Person',
      properties: {
        kind: { type: 'string', const: 'person' },
        name: { type: 'string' },
      },
      required: ['kind', 'name'],
    },
    {
      title: 'Company',
      properties: {
        kind: { type: 'string', const: 'company' },
        companyName: { type: 'string' },
        employees: { type: 'number' },
      },
      required: ['kind', 'companyName'],
    },
  ],
};

const nestedOneOfSchema: JSONSchema = {
  type: 'object',
  properties: {
    contact: {
      type: 'object',
      oneOf: [
        {
          title: 'Email',
          properties: {
            method: { type: 'string', const: 'email' },
            address: { type: 'string' },
          },
        },
        {
          title: 'Phone',
          properties: {
            method: { type: 'string', const: 'phone' },
            number: { type: 'string' },
          },
        },
      ],
    },
  },
};

const anyOfSchema: JSONSchema = {
  type: 'object',
  anyOf: [
    {
      title: 'WithAge',
      properties: { age: { type: 'number' } },
    },
    {
      title: 'WithName',
      properties: { name: { type: 'string' } },
    },
  ],
};

// ─── RESOLVE_COMBINATORS stage (via runPipeline with combinatorSelections) ───

describe('RESOLVE_COMBINATORS stage', () => {
  test('resolves oneOf when selection provided', () => {
    const selections = new Map<string, number>([['', 1]]);
    const model = runPipeline(objectOneOfSchema, {}, undefined, selections);

    expect(model.root!.combinator).toBeDefined();
    expect(model.root!.combinator!.activeIndex).toBe(1);
    expect(model.root!.combinator!.type).toBe('oneOf');
    expect(model.root!.combinator!.labels).toEqual(['Person', 'Company']);
    expect(model.root!.combinator!.ambiguous).toBe(false);
  });

  test('resolved oneOf builds children from selected branch', () => {
    const selections = new Map<string, number>([['', 1]]);
    const model = runPipeline(objectOneOfSchema, {}, undefined, selections);

    // Company branch has kind, companyName, employees
    expect(model.index.has('/kind')).toBe(true);
    expect(model.index.has('/companyName')).toBe(true);
    expect(model.index.has('/employees')).toBe(true);
    // Person branch fields not present
    expect(model.index.has('/name')).toBe(false);
  });

  test('selecting first branch shows its fields', () => {
    const selections = new Map<string, number>([['', 0]]);
    const model = runPipeline(objectOneOfSchema, {}, undefined, selections);

    expect(model.root!.combinator!.activeIndex).toBe(0);
    expect(model.index.has('/kind')).toBe(true);
    expect(model.index.has('/name')).toBe(true);
    expect(model.index.has('/companyName')).toBe(false);
  });

  test('resolves nested oneOf at subpath', () => {
    const selections = new Map<string, number>([['/contact', 0]]);
    const model = runPipeline(nestedOneOfSchema, {}, undefined, selections);

    const contactNode = model.index.get('/contact')!;
    expect(contactNode.combinator).toBeDefined();
    expect(contactNode.combinator!.activeIndex).toBe(0);
    expect(contactNode.combinator!.labels).toEqual(['Email', 'Phone']);
    expect(model.index.has('/contact/method')).toBe(true);
    expect(model.index.has('/contact/address')).toBe(true);
    expect(model.index.has('/contact/number')).toBe(false);
  });

  test('resolves anyOf similarly to oneOf', () => {
    const selections = new Map<string, number>([['', 1]]);
    const model = runPipeline(anyOfSchema, {}, undefined, selections);

    expect(model.root!.combinator).toBeDefined();
    expect(model.root!.combinator!.type).toBe('anyOf');
    expect(model.root!.combinator!.activeIndex).toBe(1);
    expect(model.index.has('/name')).toBe(true);
  });

  test('no-op when no selections provided', () => {
    const model = runPipeline(objectOneOfSchema, {
      kind: 'person',
      name: 'Alice',
    });

    // Falls back to schemaMatches in BUILD_TREE
    expect(model.root!.combinator).toBeDefined();
    expect(model.root!.combinator!.activeIndex).toBe(0);
  });

  test('ignores out-of-bounds selection index', () => {
    const selections = new Map<string, number>([['', 99]]);
    const model = runPipeline(objectOneOfSchema, {}, undefined, selections);

    // Out of bounds — not resolved by RESOLVE_COMBINATORS, falls through to BUILD_TREE
    expect(model.root!.combinator).toBeDefined();
    expect(model.root!.combinator!.activeIndex).toBeNull();
  });

  test('selection works even when data does not match the variant', () => {
    // This is the key scenario: user picks a variant but data is empty/mismatched
    const selections = new Map<string, number>([['', 1]]);
    const model = runPipeline(
      objectOneOfSchema,
      { kind: 'person', name: 'Alice' },
      undefined,
      selections,
    );

    // Even though data matches Person, explicit selection overrides to Company
    expect(model.root!.combinator!.activeIndex).toBe(1);
    expect(model.index.has('/companyName')).toBe(true);
  });
});

// ─── Store: setCombinatorIndex ───

describe('FormStore.setCombinatorIndex', () => {
  test('setCombinatorIndex selects a variant and rebuilds', () => {
    const store = createFormStore(objectOneOfSchema, {});

    store.setCombinatorIndex('', 0);
    const model = store.getModel();
    expect(model.root!.combinator!.activeIndex).toBe(0);
    expect(model.index.has('/kind')).toBe(true);
    expect(model.index.has('/name')).toBe(true);
  });

  test('switching variant index rebuilds with new branch', () => {
    const store = createFormStore(objectOneOfSchema, {});

    store.setCombinatorIndex('', 0);
    expect(store.getModel().index.has('/name')).toBe(true);
    expect(store.getModel().index.has('/companyName')).toBe(false);

    store.setCombinatorIndex('', 1);
    expect(store.getModel().index.has('/name')).toBe(false);
    expect(store.getModel().index.has('/companyName')).toBe(true);
  });

  test('setCombinatorIndex notifies model subscribers', () => {
    const store = createFormStore(objectOneOfSchema, {});
    const notifications: number[] = [];
    store.subscribe(() => notifications.push(1));

    store.setCombinatorIndex('', 0);
    expect(notifications).toHaveLength(1);
  });

  test('setCombinatorIndex notifies affected path subscribers', () => {
    const store = createFormStore(objectOneOfSchema, {});
    const notifications: string[] = [];

    store.subscribePath('', () => notifications.push('root'));

    store.setCombinatorIndex('', 0);
    expect(notifications).toContain('root');
  });

  test('setCombinatorIndex on nested path', () => {
    const store = createFormStore(nestedOneOfSchema, {});

    store.setCombinatorIndex('/contact', 1);
    const model = store.getModel();
    expect(model.index.get('/contact')!.combinator!.activeIndex).toBe(1);
    expect(model.index.has('/contact/number')).toBe(true);
    expect(model.index.has('/contact/address')).toBe(false);
  });

  test('selection persists across setData rebuilds', () => {
    const store = createFormStore(objectOneOfSchema, {});

    // Select Company variant
    store.setCombinatorIndex('', 1);
    expect(store.getModel().root!.combinator!.activeIndex).toBe(1);

    // Update data — selection should stick
    store.setData('/companyName', 'Acme');
    expect(store.getModel().root!.combinator!.activeIndex).toBe(1);
    expect(store.getModel().index.get('/companyName')!.value).toBe('Acme');
  });

  test('setCombinatorIndex + setData seed works end-to-end', () => {
    // Simulates what CombinatorRenderer does: pick variant then seed data
    const store = createFormStore(objectOneOfSchema, {});

    store.setCombinatorIndex('', 1);
    // Seed with const/default values from Company branch
    store.setData('', { kind: 'company' });

    const model = store.getModel();
    expect(model.root!.combinator!.activeIndex).toBe(1);
    expect(model.index.get('/kind')!.value).toBe('company');
    expect(model.index.has('/companyName')).toBe(true);
  });
});
