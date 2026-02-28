import type { FieldNode } from '@formica/core';
import type { ReactDispatchFn } from '@formica/react';

export { ArrayRenderer, arrayTester } from './ArrayRenderer.js';
export { BooleanRenderer, booleanTester } from './BooleanRenderer.js';
export { CombinatorRenderer, combinatorTester } from './CombinatorRenderer.js';
export { EnumRenderer, enumTester } from './EnumRenderer.js';
export { NumberRenderer, numberTester } from './NumberRenderer.js';
export { ObjectRenderer, objectTester } from './ObjectRenderer.js';
export { StringRenderer, stringTester } from './StringRenderer.js';
export { hasEnum, hasType } from './tester-utils.js';
export { UnknownRenderer, unknownTester } from './UnknownRenderer.js';

import { ArrayRenderer } from './ArrayRenderer.js';
import { BooleanRenderer } from './BooleanRenderer.js';
import { CombinatorRenderer } from './CombinatorRenderer.js';
import { EnumRenderer } from './EnumRenderer.js';
import { NumberRenderer } from './NumberRenderer.js';
import { ObjectRenderer } from './ObjectRenderer.js';
import { StringRenderer } from './StringRenderer.js';
import { hasEnum, hasType } from './tester-utils.js';
import { UnknownRenderer } from './UnknownRenderer.js';

export const defaultDispatch: ReactDispatchFn = (node: FieldNode) => {
  if (node.combinator) return CombinatorRenderer;
  if (hasEnum(node)) return EnumRenderer;
  if (hasType(node, 'string')) return StringRenderer;
  if (hasType(node, 'number') || hasType(node, 'integer')) return NumberRenderer;
  if (hasType(node, 'boolean')) return BooleanRenderer;
  if (hasType(node, 'array')) return ArrayRenderer;
  if (hasType(node, 'object')) return ObjectRenderer;
  return UnknownRenderer;
};
