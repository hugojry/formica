import type { ReactRendererEntry } from '@formica/react';

export { ArrayRenderer, arrayTester } from './ArrayRenderer.js';
export { BooleanRenderer, booleanTester } from './BooleanRenderer.js';
export { CombinatorRenderer, combinatorTester } from './CombinatorRenderer.js';
export { EnumRenderer, enumTester } from './EnumRenderer.js';
export { NumberRenderer, numberTester } from './NumberRenderer.js';
export { ObjectRenderer, objectTester } from './ObjectRenderer.js';
export { StringRenderer, stringTester } from './StringRenderer.js';
export { hasEnum, hasType } from './tester-utils.js';
export { UnknownRenderer, unknownTester } from './UnknownRenderer.js';

import { ArrayRenderer, arrayTester } from './ArrayRenderer.js';
import { BooleanRenderer, booleanTester } from './BooleanRenderer.js';
import { CombinatorRenderer, combinatorTester } from './CombinatorRenderer.js';
import { EnumRenderer, enumTester } from './EnumRenderer.js';
import { NumberRenderer, numberTester } from './NumberRenderer.js';
import { ObjectRenderer, objectTester } from './ObjectRenderer.js';
import { StringRenderer, stringTester } from './StringRenderer.js';
import { UnknownRenderer, unknownTester } from './UnknownRenderer.js';

export const defaultRenderers: ReactRendererEntry[] = [
  { tester: stringTester, renderer: StringRenderer },
  { tester: numberTester, renderer: NumberRenderer },
  { tester: booleanTester, renderer: BooleanRenderer },
  { tester: enumTester, renderer: EnumRenderer },
  { tester: combinatorTester, renderer: CombinatorRenderer },
  { tester: objectTester, renderer: ObjectRenderer },
  { tester: arrayTester, renderer: ArrayRenderer },
  { tester: unknownTester, renderer: UnknownRenderer },
];
