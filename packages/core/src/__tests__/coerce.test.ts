import { describe, expect, test } from 'bun:test';
import { coerceValue } from '../knit/coerce.js';

describe('coerceValue', () => {
  test('string from number', () => {
    expect(coerceValue(42, 'string')).toBe('42');
  });

  test('number from string', () => {
    expect(coerceValue('42', 'number')).toBe(42);
  });

  test('number from invalid string', () => {
    expect(coerceValue('abc', 'number')).toBe('abc');
  });

  test('integer from string', () => {
    expect(coerceValue('42.7', 'integer')).toBe(42);
  });

  test('integer from float', () => {
    expect(coerceValue(42.7, 'integer')).toBe(42);
  });

  test('boolean from string "true"', () => {
    expect(coerceValue('true', 'boolean')).toBe(true);
  });

  test('boolean from string "false"', () => {
    expect(coerceValue('false', 'boolean')).toBe(false);
  });

  test('boolean from 1', () => {
    expect(coerceValue(1, 'boolean')).toBe(true);
  });

  test('boolean from 0', () => {
    expect(coerceValue(0, 'boolean')).toBe(false);
  });

  test('null coercion', () => {
    expect(coerceValue('anything', 'null')).toBe(null);
  });

  test('passes through undefined', () => {
    expect(coerceValue(undefined, 'string')).toBeUndefined();
  });

  test('passes through null', () => {
    expect(coerceValue(null, 'string')).toBeNull();
  });

  test('string stays string', () => {
    expect(coerceValue('hello', 'string')).toBe('hello');
  });
});
