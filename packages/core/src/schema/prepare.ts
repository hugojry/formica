import type { JSONSchema } from '../types.js';
import { mergeAllOf } from './merge-allof.js';
import { normalizeSchemaDraft7 } from './normalize.js';
import { resolveAllRefs } from './ref-resolver.js';

export function prepareSchema(schema: JSONSchema): JSONSchema {
  const cloned = structuredClone(schema);
  normalizeSchemaDraft7(cloned);
  return mergeAllOf(resolveAllRefs(cloned));
}
