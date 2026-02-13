import { describe, expect, test } from 'bun:test';
import {
  parsePath, buildPath, appendPath, parentPath,
  isDescendant, getByPath, setByPath, deleteByPath,
} from '../model/path.js';

describe('parsePath', () => {
  test('empty string returns empty array', () => {
    expect(parsePath('')).toEqual([]);
  });

  test('root slash returns empty array', () => {
    expect(parsePath('/')).toEqual([]);
  });

  test('simple path', () => {
    expect(parsePath('/foo/bar')).toEqual(['foo', 'bar']);
  });

  test('escaped characters', () => {
    expect(parsePath('/a~0b/c~1d')).toEqual(['a~b', 'c/d']);
  });

  test('throws on invalid pointer', () => {
    expect(() => parsePath('foo')).toThrow();
  });
});

describe('buildPath', () => {
  test('empty segments', () => {
    expect(buildPath([])).toBe('');
  });

  test('simple segments', () => {
    expect(buildPath(['foo', 'bar'])).toBe('/foo/bar');
  });

  test('escapes special characters', () => {
    expect(buildPath(['a~b', 'c/d'])).toBe('/a~0b/c~1d');
  });
});

describe('appendPath', () => {
  test('append to root', () => {
    expect(appendPath('', 'foo')).toBe('/foo');
  });

  test('append to existing path', () => {
    expect(appendPath('/foo', 'bar')).toBe('/foo/bar');
  });

  test('append numeric segment', () => {
    expect(appendPath('/items', 0)).toBe('/items/0');
  });
});

describe('parentPath', () => {
  test('parent of root child', () => {
    expect(parentPath('/foo')).toBe('');
  });

  test('parent of nested path', () => {
    expect(parentPath('/foo/bar/baz')).toBe('/foo/bar');
  });
});

describe('isDescendant', () => {
  test('direct child', () => {
    expect(isDescendant('/foo', '/foo/bar')).toBe(true);
  });

  test('deep descendant', () => {
    expect(isDescendant('/foo', '/foo/bar/baz')).toBe(true);
  });

  test('not descendant', () => {
    expect(isDescendant('/foo', '/bar')).toBe(false);
  });

  test('same path is not descendant', () => {
    expect(isDescendant('/foo', '/foo')).toBe(false);
  });

  test('root ancestor', () => {
    expect(isDescendant('', '/foo')).toBe(true);
  });
});

describe('getByPath', () => {
  const data = { a: { b: [1, 2, { c: 3 }] } };

  test('root', () => {
    expect(getByPath(data, '')).toBe(data);
  });

  test('nested object', () => {
    expect(getByPath(data, '/a/b')).toEqual([1, 2, { c: 3 }]);
  });

  test('array index', () => {
    expect(getByPath(data, '/a/b/0')).toBe(1);
  });

  test('deep nested', () => {
    expect(getByPath(data, '/a/b/2/c')).toBe(3);
  });

  test('missing path returns undefined', () => {
    expect(getByPath(data, '/x/y')).toBeUndefined();
  });
});

describe('setByPath', () => {
  test('set root', () => {
    expect(setByPath({}, '', 42)).toBe(42);
  });

  test('set nested value', () => {
    const result = setByPath({ a: { b: 1 } }, '/a/b', 2);
    expect(result).toEqual({ a: { b: 2 } });
  });

  test('creates intermediate objects', () => {
    const result = setByPath({}, '/a/b', 1);
    expect(result).toEqual({ a: { b: 1 } });
  });

  test('preserves other properties', () => {
    const result = setByPath({ a: 1, b: 2 }, '/a', 10);
    expect(result).toEqual({ a: 10, b: 2 });
  });

  test('returns new object (immutable)', () => {
    const orig = { a: 1 };
    const result = setByPath(orig, '/a', 2);
    expect(orig.a).toBe(1);
    expect(result).not.toBe(orig);
  });

  test('handles array', () => {
    const result = setByPath([1, 2, 3], '/1', 20);
    expect(result).toEqual([1, 20, 3]);
  });
});

describe('deleteByPath', () => {
  test('delete object key', () => {
    expect(deleteByPath({ a: 1, b: 2 }, '/a')).toEqual({ b: 2 });
  });

  test('delete array element', () => {
    expect(deleteByPath([1, 2, 3], '/1')).toEqual([1, 3]);
  });

  test('delete root', () => {
    expect(deleteByPath({ a: 1 }, '')).toBeUndefined();
  });
});
