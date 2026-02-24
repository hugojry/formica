import { describe, expect, test } from 'bun:test';
import {
  formatToInputType,
  getCheckboxProps,
  getFieldProps,
  getNumberInputProps,
  getSelectProps,
  getTextInputProps,
  hasEnum,
  hasType,
} from '../field-props.js';
import { runPipeline } from '../pipeline/pipeline.js';
import type { JSONSchema } from '../types.js';

function getNode(schema: JSONSchema, data: unknown, path: string) {
  const model = runPipeline(schema, data);
  return model.index.get(path)!;
}

describe('hasType', () => {
  test('matches single type', () => {
    const node = getNode(
      { type: 'object', properties: { name: { type: 'string' } } },
      { name: 'hello' },
      '/name',
    );
    expect(hasType(node, 'string')).toBe(true);
    expect(hasType(node, 'number')).toBe(false);
  });

  test('matches type in array', () => {
    const node = getNode(
      { type: 'object', properties: { val: { type: ['string', 'null'] } } },
      { val: 'hello' },
      '/val',
    );
    expect(hasType(node, 'string')).toBe(true);
    expect(hasType(node, 'null')).toBe(true);
    expect(hasType(node, 'number')).toBe(false);
  });
});

describe('hasEnum', () => {
  test('returns true for enum field', () => {
    const node = getNode(
      { type: 'object', properties: { color: { type: 'string', enum: ['red', 'blue'] } } },
      { color: 'red' },
      '/color',
    );
    expect(hasEnum(node)).toBe(true);
  });

  test('returns false for non-enum field', () => {
    const node = getNode(
      { type: 'object', properties: { name: { type: 'string' } } },
      { name: 'hello' },
      '/name',
    );
    expect(hasEnum(node)).toBe(false);
  });
});

describe('formatToInputType', () => {
  test('maps known formats', () => {
    expect(formatToInputType('email')).toBe('email');
    expect(formatToInputType('uri')).toBe('url');
    expect(formatToInputType('uri-reference')).toBe('url');
    expect(formatToInputType('date')).toBe('date');
    expect(formatToInputType('date-time')).toBe('datetime-local');
    expect(formatToInputType('time')).toBe('time');
    expect(formatToInputType('password')).toBe('password');
  });

  test('defaults to text for unknown format', () => {
    expect(formatToInputType('unknown')).toBe('text');
    expect(formatToInputType(undefined)).toBe('text');
  });
});

describe('getFieldProps', () => {
  test('extracts basic field props', () => {
    const node = getNode(
      {
        type: 'object',
        properties: {
          name: { type: 'string', title: 'Full Name', description: 'Enter your name' },
        },
        required: ['name'],
      },
      { name: 'Alice' },
      '/name',
    );

    const props = getFieldProps(node);
    expect(props.label).toBe('Full Name');
    expect(props.name).toBe('name');
    expect(props.path).toBe('/name');
    expect(props.description).toBe('Enter your name');
    expect(props.required).toBe(true);
    expect(props.readOnly).toBe(false);
    expect(props.deprecated).toBe(false);
  });

  test('falls back to path segment when no title', () => {
    const node = getNode(
      { type: 'object', properties: { email: { type: 'string' } } },
      { email: 'test@test.com' },
      '/email',
    );

    const props = getFieldProps(node);
    expect(props.label).toBe('email');
  });

  test('handles readOnly and deprecated', () => {
    const node = getNode(
      {
        type: 'object',
        properties: {
          id: { type: 'string', readOnly: true, deprecated: true },
        },
      },
      { id: '123' },
      '/id',
    );

    const props = getFieldProps(node);
    expect(props.readOnly).toBe(true);
    expect(props.deprecated).toBe(true);
  });
});

describe('getTextInputProps', () => {
  test('extracts string field props', () => {
    const node = getNode(
      {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email',
            minLength: 5,
            maxLength: 100,
            pattern: '.*@.*',
          },
        },
      },
      { email: 'test@example.com' },
      '/email',
    );

    const props = getTextInputProps(node);
    expect(props.type).toBe('email');
    expect(props.value).toBe('test@example.com');
    expect(props.minLength).toBe(5);
    expect(props.maxLength).toBe(100);
    expect(props.pattern).toBe('.*@.*');
  });

  test('defaults to empty string when value is undefined', () => {
    const node = getNode({ type: 'object', properties: { name: { type: 'string' } } }, {}, '/name');

    const props = getTextInputProps(node);
    expect(props.value).toBe('');
    expect(props.type).toBe('text');
  });
});

describe('getNumberInputProps', () => {
  test('extracts number field props', () => {
    const node = getNode(
      {
        type: 'object',
        properties: {
          age: { type: 'number', minimum: 0, maximum: 150, multipleOf: 0.5 },
        },
      },
      { age: 25 },
      '/age',
    );

    const props = getNumberInputProps(node);
    expect(props.value).toBe(25);
    expect(props.min).toBe(0);
    expect(props.max).toBe(150);
    expect(props.step).toBe(0.5);
  });

  test('uses step=1 for integer type', () => {
    const node = getNode(
      { type: 'object', properties: { count: { type: 'integer' } } },
      { count: 5 },
      '/count',
    );

    const props = getNumberInputProps(node);
    expect(props.step).toBe(1);
  });

  test('value is undefined when not set', () => {
    const node = getNode({ type: 'object', properties: { age: { type: 'number' } } }, {}, '/age');

    const props = getNumberInputProps(node);
    expect(props.value).toBeUndefined();
  });
});

describe('getCheckboxProps', () => {
  test('extracts boolean value', () => {
    const node = getNode(
      { type: 'object', properties: { active: { type: 'boolean' } } },
      { active: true },
      '/active',
    );

    expect(getCheckboxProps(node).checked).toBe(true);
  });

  test('defaults to false when undefined', () => {
    const node = getNode(
      { type: 'object', properties: { active: { type: 'boolean' } } },
      {},
      '/active',
    );

    expect(getCheckboxProps(node).checked).toBe(false);
  });
});

describe('getSelectProps', () => {
  test('extracts enum options', () => {
    const node = getNode(
      {
        type: 'object',
        properties: {
          color: { type: 'string', enum: ['red', 'green', 'blue'] },
        },
      },
      { color: 'green' },
      '/color',
    );

    const props = getSelectProps(node);
    expect(props.value).toBe('green');
    expect(props.options).toEqual([
      { label: 'red', value: 'red' },
      { label: 'green', value: 'green' },
      { label: 'blue', value: 'blue' },
    ]);
  });

  test('handles numeric enum', () => {
    const node = getNode(
      {
        type: 'object',
        properties: {
          priority: { type: 'number', enum: [1, 2, 3] },
        },
      },
      { priority: 2 },
      '/priority',
    );

    const props = getSelectProps(node);
    expect(props.value).toBe(2);
    expect(props.options).toEqual([
      { label: '1', value: 1 },
      { label: '2', value: 2 },
      { label: '3', value: 3 },
    ]);
  });
});
