import { describe, expect, test } from 'bun:test';
import type { JSONSchema } from '@formica/core';
import { createFormStore } from '@formica/core';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { createRenderers } from '../create-renderers.js';
import { FormRenderer } from '../dispatch/FormRenderer.js';
import { act } from './helpers.js';

function StubTextInput(props: any) {
  return createElement('input', {
    type: props.type ?? 'text',
    value: props.value,
    'data-testid': 'text-input',
    'data-label': props.label,
    'data-required': props.required,
  });
}

function StubNumberInput(props: any) {
  return createElement('input', {
    type: 'number',
    value: props.value ?? '',
    'data-testid': 'number-input',
    'data-label': props.label,
  });
}

function StubCheckbox(props: any) {
  return createElement('input', {
    type: 'checkbox',
    checked: props.checked,
    'data-testid': 'checkbox',
    'data-label': props.label,
  });
}

function StubSelect(props: any) {
  return createElement(
    'select',
    { value: String(props.value ?? ''), 'data-testid': 'select', 'data-label': props.label },
    ...(props.options ?? []).map((opt: any) =>
      createElement('option', { key: String(opt.value), value: String(opt.value) }, opt.label),
    ),
  );
}

const basicComponents = {
  TextInput: StubTextInput,
  NumberInput: StubNumberInput,
  Checkbox: StubCheckbox,
  Select: StubSelect,
};

describe('createRenderers', () => {
  test('produces renderer entries for all component types', () => {
    const entries = createRenderers({ components: basicComponents });
    // Should have TextInput, NumberInput, Checkbox, Select
    expect(entries.length).toBe(4);
  });

  test('includes optional container renderers when provided', () => {
    const entries = createRenderers({
      components: {
        ...basicComponents,
        Object: (props: any) => createElement('div', null, props.children),
        Array: (props: any) => createElement('div', null, props.children),
        Combinator: (props: any) => createElement('div', null, props.children),
      },
    });
    expect(entries.length).toBe(7);
  });

  test('testers return correct scores for string fields', () => {
    const entries = createRenderers({ components: basicComponents });
    const schema: JSONSchema = {
      type: 'object',
      properties: { name: { type: 'string' } },
    };
    const store = createFormStore(schema, { name: 'Alice' });
    const node = store.getModel().index.get('/name')!;

    // Find the entry that matches string
    const scores = entries.map((e) => e.tester(node));
    // TextInput should match (1), others should not (-1)
    expect(scores[0]).toBe(1); // TextInput
    expect(scores[1]).toBe(-1); // NumberInput
    expect(scores[2]).toBe(-1); // Checkbox
    expect(scores[3]).toBe(-1); // Select
  });

  test('testers return correct scores for number fields', () => {
    const entries = createRenderers({ components: basicComponents });
    const schema: JSONSchema = {
      type: 'object',
      properties: { age: { type: 'number' } },
    };
    const store = createFormStore(schema, { age: 25 });
    const node = store.getModel().index.get('/age')!;

    const scores = entries.map((e) => e.tester(node));
    expect(scores[0]).toBe(-1); // TextInput
    expect(scores[1]).toBe(1); // NumberInput
    expect(scores[2]).toBe(-1); // Checkbox
    expect(scores[3]).toBe(-1); // Select
  });

  test('testers return correct scores for boolean fields', () => {
    const entries = createRenderers({ components: basicComponents });
    const schema: JSONSchema = {
      type: 'object',
      properties: { active: { type: 'boolean' } },
    };
    const store = createFormStore(schema, { active: true });
    const node = store.getModel().index.get('/active')!;

    const scores = entries.map((e) => e.tester(node));
    expect(scores[0]).toBe(-1);
    expect(scores[1]).toBe(-1);
    expect(scores[2]).toBe(1); // Checkbox
    expect(scores[3]).toBe(-1);
  });

  test('testers return correct scores for enum fields', () => {
    const entries = createRenderers({ components: basicComponents });
    const schema: JSONSchema = {
      type: 'object',
      properties: { color: { type: 'string', enum: ['red', 'blue'] } },
    };
    const store = createFormStore(schema, { color: 'red' });
    const node = store.getModel().index.get('/color')!;

    const scores = entries.map((e) => e.tester(node));
    expect(scores[0]).toBe(-1); // TextInput (string + enum = no match)
    expect(scores[1]).toBe(-1);
    expect(scores[2]).toBe(-1);
    expect(scores[3]).toBe(3); // Select (enum priority)
  });

  test('mapProps is called and can add custom props', () => {
    let capturedProps: Record<string, unknown> | undefined;

    function CapturingTextInput(props: any) {
      capturedProps = props;
      return createElement('input', { value: props.value });
    }

    const entries = createRenderers({
      components: { ...basicComponents, TextInput: CapturingTextInput },
      mapProps: (props, node) => ({
        ...props,
        customProp: 'hello',
        errors: (node.extensions.errors as any[]) ?? [],
      }),
    });

    const schema: JSONSchema = {
      type: 'object',
      properties: { name: { type: 'string', title: 'Name' } },
      required: ['name'],
    };
    const store = createFormStore(schema, { name: 'Alice' });
    const node = store.getModel().index.get('/name')!;

    // Find the matching entry and render it
    const textEntry = entries.find((e) => e.tester(node) > 0)!;
    const container = document.createElement('div');
    document.body.appendChild(container);

    act(() => {
      const root = createRoot(container);
      root.render(
        createElement(textEntry.renderer, {
          node,
          onChange: () => {},
          setCombinatorIndex: () => {},
          renderChild: () => null,
        }),
      );
    });

    expect(capturedProps).toBeDefined();
    expect(capturedProps!.label).toBe('Name');
    expect(capturedProps!.required).toBe(true);
    expect(capturedProps!.customProp).toBe('hello');
    expect(capturedProps!.errors).toEqual([]);
    expect(capturedProps!.value).toBe('Alice');

    container.remove();
  });

  test('renders form with createRenderers entries', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', title: 'Name' },
        age: { type: 'number' },
        active: { type: 'boolean' },
        color: { type: 'string', enum: ['red', 'blue'] },
      },
    };

    const renderers = createRenderers({ components: basicComponents });
    const store = createFormStore(schema, {
      name: 'Alice',
      age: 30,
      active: true,
      color: 'red',
    });

    const container = document.createElement('div');
    document.body.appendChild(container);

    act(() => {
      const root = createRoot(container);
      root.render(createElement(FormRenderer, { store, renderers }));
    });

    // Verify renderers produced DOM elements
    expect(container.querySelector('[data-testid="text-input"]')).toBeDefined();
    expect(container.querySelector('[data-testid="number-input"]')).toBeDefined();
    expect(container.querySelector('[data-testid="checkbox"]')).toBeDefined();
    expect(container.querySelector('[data-testid="select"]')).toBeDefined();

    container.remove();
  });
});
