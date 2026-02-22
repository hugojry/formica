import type { ReactRendererEntry } from '@formica/react';

export { StringRenderer, stringTester } from './StringRenderer.js';
export { NumberRenderer, numberTester } from './NumberRenderer.js';
export { BooleanRenderer, booleanTester } from './BooleanRenderer.js';
export { EnumRenderer, enumTester } from './EnumRenderer.js';
export { ObjectRenderer, objectTester } from './ObjectRenderer.js';
export { ArrayRenderer, arrayTester } from './ArrayRenderer.js';
export { UnknownRenderer, unknownTester } from './UnknownRenderer.js';
export { hasType, hasEnum } from './tester-utils.js';

import { StringRenderer, stringTester } from './StringRenderer.js';
import { NumberRenderer, numberTester } from './NumberRenderer.js';
import { BooleanRenderer, booleanTester } from './BooleanRenderer.js';
import { EnumRenderer, enumTester } from './EnumRenderer.js';
import { ObjectRenderer, objectTester } from './ObjectRenderer.js';
import { ArrayRenderer, arrayTester } from './ArrayRenderer.js';
import { UnknownRenderer, unknownTester } from './UnknownRenderer.js';

export const defaultRenderers: ReactRendererEntry[] = [
  { tester: stringTester, renderer: StringRenderer },
  { tester: numberTester, renderer: NumberRenderer },
  { tester: booleanTester, renderer: BooleanRenderer },
  { tester: enumTester, renderer: EnumRenderer },
  { tester: objectTester, renderer: ObjectRenderer },
  { tester: arrayTester, renderer: ArrayRenderer },
  { tester: unknownTester, renderer: UnknownRenderer },
];
