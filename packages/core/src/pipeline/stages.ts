import { appendPath, getByPath } from '../model/path.js';
import { normalizeSchemaDraft7 } from '../schema/normalize.js';
import { resolveAllRefs } from '../schema/ref-resolver.js';
import type {
  ArrayMeta,
  CombinatorInfo,
  FieldConstraints,
  FieldNode,
  FieldOrigin,
  JSONSchema,
  JSONSchemaType,
  PipelineContext,
} from '../types.js';

// ─── Stage: NORMALIZE ───

export function normalize(ctx: PipelineContext): PipelineContext {
  normalizeSchemaDraft7(ctx.schema);
  return ctx;
}

// ─── Stage: RESOLVE_REFS ───

export function resolveRefs(ctx: PipelineContext): PipelineContext {
  ctx.schema = resolveAllRefs(ctx.schema);
  return ctx;
}

// ─── Stage: MERGE_ALLOF ───

export function mergeAllOf(ctx: PipelineContext): PipelineContext {
  ctx.schema = mergeAllOfRecursive(ctx.schema);
  return ctx;
}

function mergeAllOfRecursive(schema: JSONSchema): JSONSchema {
  if (typeof schema !== 'object' || schema === null) return schema;

  let result = { ...schema };

  // First recurse into subschemas
  if (result.properties) {
    result.properties = Object.fromEntries(
      Object.entries(result.properties).map(([k, v]) => [k, mergeAllOfRecursive(v)]),
    );
  }
  if (result.items && typeof result.items === 'object' && !Array.isArray(result.items)) {
    result.items = mergeAllOfRecursive(result.items);
  }
  if (result.prefixItems) {
    result.prefixItems = result.prefixItems.map((s) => mergeAllOfRecursive(s));
  }
  for (const kw of ['anyOf', 'oneOf'] as const) {
    if (result[kw]) {
      result[kw] = result[kw]!.map((s) => mergeAllOfRecursive(s));
    }
  }
  if (result.if) result.if = mergeAllOfRecursive(result.if);
  if (result.then) result.then = mergeAllOfRecursive(result.then);
  if (result.else) result.else = mergeAllOfRecursive(result.else);
  if (result.dependentSchemas) {
    result.dependentSchemas = Object.fromEntries(
      Object.entries(result.dependentSchemas).map(([k, v]) => [k, mergeAllOfRecursive(v)]),
    );
  }

  // Merge allOf
  if (result.allOf) {
    const merged = result.allOf.reduce((acc, sub) => mergeSchemas(acc, mergeAllOfRecursive(sub)), {
      ...result,
      allOf: undefined,
    } as JSONSchema);
    delete merged.allOf;
    result = merged;
  }

  return result;
}

function mergeSchemas(a: JSONSchema, b: JSONSchema): JSONSchema {
  const result: JSONSchema = { ...a };

  // Merge type (intersect)
  if (b.type) {
    if (result.type) {
      const aTypes = Array.isArray(result.type) ? result.type : [result.type];
      const bTypes = Array.isArray(b.type) ? b.type : [b.type];
      const intersection = aTypes.filter((t) => bTypes.includes(t));
      result.type = intersection.length === 1 ? intersection[0] : (intersection as any);
    } else {
      result.type = b.type;
    }
  }

  // Merge properties
  if (b.properties) {
    result.properties ??= {};
    for (const [key, val] of Object.entries(b.properties)) {
      if (result.properties[key]) {
        result.properties[key] = mergeSchemas(result.properties[key], val);
      } else {
        result.properties[key] = val;
      }
    }
  }

  // Merge required (union)
  if (b.required) {
    result.required = [...new Set([...(result.required ?? []), ...b.required])];
  }

  // Merge numeric constraints (tightest wins)
  for (const k of [
    'minimum',
    'exclusiveMinimum',
    'minLength',
    'minItems',
    'minProperties',
  ] as const) {
    if (b[k] !== undefined) {
      result[k] =
        result[k] !== undefined ? Math.max(result[k] as number, b[k] as number) : (b[k] as any);
    }
  }
  for (const k of [
    'maximum',
    'exclusiveMaximum',
    'maxLength',
    'maxItems',
    'maxProperties',
  ] as const) {
    if (b[k] !== undefined) {
      result[k] =
        result[k] !== undefined ? Math.min(result[k] as number, b[k] as number) : (b[k] as any);
    }
  }

  // Scalars from b override
  for (const k of [
    'pattern',
    'format',
    'const',
    'title',
    'description',
    'default',
    'readOnly',
    'writeOnly',
    'deprecated',
    'multipleOf',
    'uniqueItems',
  ] as const) {
    if (b[k] !== undefined) {
      (result as any)[k] = b[k];
    }
  }

  // Enum (intersect)
  if (b.enum) {
    if (result.enum) {
      result.enum = result.enum.filter((v) => b.enum!.includes(v));
    } else {
      result.enum = b.enum;
    }
  }

  // Composition keywords — carry over
  for (const k of ['oneOf', 'anyOf', 'if', 'then', 'else', 'not'] as const) {
    if (b[k] !== undefined && result[k] === undefined) {
      (result as any)[k] = b[k];
    }
  }

  // Items
  if (b.items && typeof b.items === 'object') {
    result.items =
      result.items && typeof result.items === 'object'
        ? mergeSchemas(result.items as JSONSchema, b.items as JSONSchema)
        : b.items;
  }

  // additionalProperties
  if (b.additionalProperties !== undefined) {
    if (
      typeof b.additionalProperties === 'object' &&
      typeof result.additionalProperties === 'object'
    ) {
      result.additionalProperties = mergeSchemas(
        result.additionalProperties,
        b.additionalProperties,
      );
    } else {
      result.additionalProperties = b.additionalProperties;
    }
  }

  // dependentSchemas
  if (b.dependentSchemas) {
    result.dependentSchemas ??= {};
    for (const [k, v] of Object.entries(b.dependentSchemas)) {
      result.dependentSchemas[k] = result.dependentSchemas[k]
        ? mergeSchemas(result.dependentSchemas[k], v)
        : v;
    }
  }

  // dependentRequired
  if (b.dependentRequired) {
    result.dependentRequired ??= {};
    for (const [k, v] of Object.entries(b.dependentRequired)) {
      result.dependentRequired[k] = [...new Set([...(result.dependentRequired[k] ?? []), ...v])];
    }
  }

  return result;
}

// ─── Stage: EVALUATE_CONDITIONALS ───

export function evaluateConditionals(ctx: PipelineContext): PipelineContext {
  ctx.schema = evaluateConditionalsRecursive(ctx.schema, ctx.data, '', ctx.conditionalDeps);
  return ctx;
}

function evaluateConditionalsRecursive(
  schema: JSONSchema,
  data: unknown,
  dataPath: string,
  deps: Map<string, Set<string>>,
): JSONSchema {
  if (typeof schema !== 'object' || schema === null) return schema;

  let result = { ...schema };

  // Handle if/then/else
  if (result.if) {
    // Track conditional dependencies
    trackConditionDeps(result.if, dataPath, dataPath, deps);

    const matches = schemaMatches(result.if, data);
    const branch = matches ? result.then : result.else;

    if (branch) {
      // Merge the matching branch into the schema, then re-evaluate
      // in case the branch itself contains nested if/then/else
      const { if: _if, then: _then, else: _else, ...rest } = result;
      result = evaluateConditionalsRecursive(mergeSchemas(rest, branch), data, dataPath, deps);
      return result;
    } else {
      delete result.if;
      delete result.then;
      delete result.else;
    }
  }

  // Recurse into properties
  if (result.properties) {
    result.properties = Object.fromEntries(
      Object.entries(result.properties).map(([k, v]) => [
        k,
        evaluateConditionalsRecursive(
          v,
          getByPath(data, appendPath(dataPath, k)),
          appendPath(dataPath, k),
          deps,
        ),
      ]),
    );
  }

  // Recurse into items
  if (result.items && typeof result.items === 'object' && !Array.isArray(result.items)) {
    if (Array.isArray(data)) {
      // For each array item
    } else {
      result.items = evaluateConditionalsRecursive(result.items, undefined, dataPath, deps);
    }
  }

  return result;
}

function trackConditionDeps(
  ifSchema: JSONSchema,
  dataPath: string,
  schemaPath: string,
  deps: Map<string, Set<string>>,
): void {
  if (ifSchema.properties) {
    for (const key of Object.keys(ifSchema.properties)) {
      const depPath = appendPath(dataPath, key);
      if (!deps.has(depPath)) deps.set(depPath, new Set());
      deps.get(depPath)!.add(schemaPath);
    }
  }
  // Also track const/enum at root level
  if (ifSchema.const !== undefined || ifSchema.enum) {
    if (!deps.has(dataPath)) deps.set(dataPath, new Set());
    deps.get(dataPath)!.add(schemaPath);
  }
}

/** Simple schema validation for conditional evaluation. */
function schemaMatches(schema: JSONSchema, data: unknown): boolean {
  if (schema.const !== undefined) {
    return deepEqual(data, schema.const);
  }
  if (schema.enum) {
    return schema.enum.some((v) => deepEqual(data, v));
  }
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => matchesType(data, t))) return false;
  }
  if (schema.properties && typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    for (const [key, sub] of Object.entries(schema.properties)) {
      if (!schemaMatches(sub, obj[key])) return false;
    }
  }
  if (schema.required && typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    for (const key of schema.required) {
      if (!(key in obj)) return false;
    }
  }
  if (schema.minimum !== undefined && typeof data === 'number') {
    if (data < schema.minimum) return false;
  }
  if (schema.maximum !== undefined && typeof data === 'number') {
    if (data > schema.maximum) return false;
  }
  if (schema.minLength !== undefined && typeof data === 'string') {
    if (data.length < schema.minLength) return false;
  }
  if (schema.pattern !== undefined && typeof data === 'string') {
    if (!new RegExp(schema.pattern).test(data)) return false;
  }
  return true;
}

function matchesType(data: unknown, type: JSONSchemaType): boolean {
  switch (type) {
    case 'string':
      return typeof data === 'string';
    case 'number':
      return typeof data === 'number';
    case 'integer':
      return typeof data === 'number' && Number.isInteger(data);
    case 'boolean':
      return typeof data === 'boolean';
    case 'array':
      return Array.isArray(data);
    case 'object':
      return typeof data === 'object' && data !== null && !Array.isArray(data);
    case 'null':
      return data === null;
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a)) {
    const arr = b as unknown[];
    if (a.length !== arr.length) return false;
    return a.every((v, i) => deepEqual(v, arr[i]));
  }

  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => deepEqual(objA[k], objB[k]));
}

// ─── Stage: EVALUATE_DEPENDENTS ───

export function evaluateDependents(ctx: PipelineContext): PipelineContext {
  ctx.schema = evaluateDependentsRecursive(ctx.schema, ctx.data);
  return ctx;
}

function evaluateDependentsRecursive(schema: JSONSchema, data: unknown): JSONSchema {
  if (typeof schema !== 'object' || schema === null) return schema;

  let result = { ...schema };

  // dependentSchemas
  if (result.dependentSchemas && typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    for (const [key, depSchema] of Object.entries(result.dependentSchemas)) {
      if (key in obj) {
        const { dependentSchemas: _, ...rest } = result;
        result = mergeSchemas(rest, depSchema);
      }
    }
    delete result.dependentSchemas;
  }

  // dependentRequired
  if (result.dependentRequired && typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    for (const [key, reqFields] of Object.entries(result.dependentRequired)) {
      if (key in obj) {
        result.required = [...new Set([...(result.required ?? []), ...reqFields])];
      }
    }
    delete result.dependentRequired;
  }

  // Recurse
  if (result.properties) {
    result.properties = Object.fromEntries(
      Object.entries(result.properties).map(([k, v]) => {
        const childData = typeof data === 'object' && data !== null ? (data as any)[k] : undefined;
        return [k, evaluateDependentsRecursive(v, childData)];
      }),
    );
  }

  return result;
}

// ─── Stage: RESOLVE_COMBINATORS ───

export function resolveCombinators(ctx: PipelineContext): PipelineContext {
  const selections = ctx.combinatorSelections;
  if (!selections || selections.size === 0) return ctx;

  ctx.resolvedCombinators = new Map<string, CombinatorInfo>();
  ctx.schema = resolveCombinatorRecursive(ctx.schema, '', selections, ctx.resolvedCombinators);
  return ctx;
}

function resolveCombinatorRecursive(
  schema: JSONSchema,
  path: string,
  selections: Map<string, number>,
  resolved: Map<string, CombinatorInfo>,
): JSONSchema {
  if (typeof schema !== 'object' || schema === null) return schema;

  let result = { ...schema };

  // Resolve oneOf/anyOf at this path if explicitly selected
  if (result.oneOf || result.anyOf) {
    const options = (result.oneOf ?? result.anyOf)!;
    const combinatorType = result.oneOf ? 'oneOf' : 'anyOf';
    const selectedIndex = selections.get(path);

    if (selectedIndex !== undefined && selectedIndex >= 0 && selectedIndex < options.length) {
      // Store CombinatorInfo for BUILD_TREE to attach to the node
      resolved.set(path, {
        type: combinatorType as 'oneOf' | 'anyOf',
        options,
        activeIndex: selectedIndex,
        labels: options.map((opt, i) => opt.title ?? `Option ${i + 1}`),
        ambiguous: false,
      });

      // Merge selected branch into schema, removing oneOf/anyOf
      result = mergeSchemas(
        { ...result, oneOf: undefined, anyOf: undefined },
        options[selectedIndex],
      );
    }
  }

  // Recurse into properties
  if (result.properties) {
    result.properties = Object.fromEntries(
      Object.entries(result.properties).map(([k, v]) => [
        k,
        resolveCombinatorRecursive(v, appendPath(path, k), selections, resolved),
      ]),
    );
  }

  // Recurse into items
  if (result.items && typeof result.items === 'object' && !Array.isArray(result.items)) {
    result.items = resolveCombinatorRecursive(result.items, path, selections, resolved);
  }

  return result;
}

// ─── Stage: BUILD_TREE ───

export function buildTree(ctx: PipelineContext): PipelineContext {
  ctx.root = buildFieldNode(
    ctx.schema,
    ctx.data,
    '',
    'root',
    false,
    ctx.index,
    ctx.resolvedCombinators,
  );
  return ctx;
}

function buildFieldNode(
  schema: JSONSchema,
  data: unknown,
  path: string,
  origin: FieldOrigin,
  required: boolean,
  index: Map<string, FieldNode>,
  resolvedCombinators?: Map<string, CombinatorInfo>,
): FieldNode {
  const type = resolveType(schema, data);
  const constraints = extractConstraints(schema);
  const children: FieldNode[] = [];
  let combinator: CombinatorInfo | undefined;
  let arrayMeta: ArrayMeta | undefined;

  // Handle oneOf/anyOf
  if (schema.oneOf || schema.anyOf) {
    const options = (schema.oneOf ?? schema.anyOf)!;
    const combinatorType = schema.oneOf ? 'oneOf' : 'anyOf';
    const matchResults = options.map((opt) => schemaMatches(opt, data));
    const matchingIndices = matchResults.reduce<number[]>(
      (acc, m, i) => (m ? [...acc, i] : acc),
      [],
    );

    combinator = {
      type: combinatorType as 'oneOf' | 'anyOf',
      options,
      activeIndex:
        matchingIndices.length === 1
          ? matchingIndices[0]
          : matchingIndices.length > 0
            ? matchingIndices[0]
            : null,
      labels: options.map((opt, i) => opt.title ?? `Option ${i + 1}`),
      ambiguous: matchingIndices.length > 1,
    };

    // Build children from active branch
    if (combinator.activeIndex !== null) {
      const activeSchema = mergeSchemas(
        { ...schema, oneOf: undefined, anyOf: undefined },
        options[combinator.activeIndex],
      );
      const activeNode = buildFieldNode(
        activeSchema,
        data,
        path,
        origin,
        required,
        index,
        resolvedCombinators,
      );
      // Use the active node's children
      children.push(...activeNode.children);
    }
  }

  // Handle object properties
  const effectiveType = Array.isArray(type) ? type : [type];
  if (effectiveType.includes('object') && schema.properties && !combinator) {
    const objData =
      typeof data === 'object' && data !== null && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : {};
    const requiredSet = new Set(schema.required ?? []);

    for (const [key, propSchema] of Object.entries(schema.properties)) {
      const childPath = appendPath(path, key);
      const childNode = buildFieldNode(
        propSchema,
        objData[key],
        childPath,
        'property',
        requiredSet.has(key),
        index,
        resolvedCombinators,
      );
      children.push(childNode);
    }
  }

  // Handle array items
  if (effectiveType.includes('array') && !combinator) {
    const arrData = Array.isArray(data) ? data : [];
    const itemSchema =
      typeof schema.items === 'object' && !Array.isArray(schema.items)
        ? (schema.items as JSONSchema)
        : {};

    arrayMeta = {
      itemSchema,
      prefixItems: schema.prefixItems,
      canAdd: schema.maxItems === undefined || arrData.length < schema.maxItems,
      canRemove: schema.minItems === undefined || arrData.length > schema.minItems,
      canReorder: true,
    };

    arrData.forEach((item, i) => {
      const childSchema = schema.prefixItems?.[i] ?? itemSchema;
      const childPath = appendPath(path, i);
      const childOrigin: FieldOrigin = schema.prefixItems?.[i] ? 'prefixItem' : 'arrayItem';
      const childNode = buildFieldNode(
        childSchema,
        item,
        childPath,
        childOrigin,
        false,
        index,
        resolvedCombinators,
      );
      children.push(childNode);
    });
  }

  // Attach CombinatorInfo from RESOLVE_COMBINATORS stage if this path was explicitly resolved
  if (!combinator && resolvedCombinators?.has(path)) {
    combinator = resolvedCombinators.get(path)!;
  }

  const node: FieldNode = {
    path,
    schema,
    type,
    value: data,
    children,
    required,
    readOnly: schema.readOnly ?? false,
    deprecated: schema.deprecated ?? false,
    active: true,
    constraints,
    combinator,
    origin,
    arrayMeta,
  };

  index.set(path, node);
  return node;
}

function resolveType(schema: JSONSchema, data: unknown): JSONSchemaType | JSONSchemaType[] {
  if (schema.type) return schema.type;
  // Infer from keywords
  if (schema.properties || schema.additionalProperties || schema.patternProperties) return 'object';
  if (schema.items || schema.prefixItems) return 'array';
  if (schema.enum) {
    // Try to infer from enum values
    const types = new Set(
      schema.enum.map((v) => {
        if (v === null) return 'null';
        if (Array.isArray(v)) return 'array';
        return typeof v as JSONSchemaType;
      }),
    );
    if (types.size === 1) return [...types][0] as JSONSchemaType;
  }
  if (schema.const !== undefined) {
    if (schema.const === null) return 'null';
    if (Array.isArray(schema.const)) return 'array';
    return typeof schema.const as JSONSchemaType;
  }
  // Infer from data
  if (data !== undefined) {
    if (data === null) return 'null';
    if (Array.isArray(data)) return 'array';
    if (typeof data === 'object') return 'object';
    return typeof data as JSONSchemaType;
  }
  return 'string'; // Fallback
}

function extractConstraints(schema: JSONSchema): FieldConstraints {
  const c: FieldConstraints = {};
  if (schema.minimum !== undefined) c.minimum = schema.minimum;
  if (schema.maximum !== undefined) c.maximum = schema.maximum;
  if (schema.exclusiveMinimum !== undefined && typeof schema.exclusiveMinimum === 'number')
    c.exclusiveMinimum = schema.exclusiveMinimum;
  if (schema.exclusiveMaximum !== undefined && typeof schema.exclusiveMaximum === 'number')
    c.exclusiveMaximum = schema.exclusiveMaximum;
  if (schema.multipleOf !== undefined) c.multipleOf = schema.multipleOf;
  if (schema.minLength !== undefined) c.minLength = schema.minLength;
  if (schema.maxLength !== undefined) c.maxLength = schema.maxLength;
  if (schema.pattern !== undefined) c.pattern = schema.pattern;
  if (schema.format !== undefined) c.format = schema.format;
  if (schema.minItems !== undefined) c.minItems = schema.minItems;
  if (schema.maxItems !== undefined) c.maxItems = schema.maxItems;
  if (schema.uniqueItems !== undefined) c.uniqueItems = schema.uniqueItems;
  if (schema.minProperties !== undefined) c.minProperties = schema.minProperties;
  if (schema.maxProperties !== undefined) c.maxProperties = schema.maxProperties;
  if (schema.enum !== undefined) c.enum = schema.enum;
  if (schema.const !== undefined) c.const = schema.const;
  return c;
}

// ─── Stage: APPLY_DEFAULTS ───

export function applyDefaults(ctx: PipelineContext): PipelineContext {
  if (ctx.root) {
    ctx.data = applyDefaultsRecursive(ctx.root, ctx.data);
  }
  return ctx;
}

function applyDefaultsRecursive(node: FieldNode, data: unknown): unknown {
  // Seed default if data is undefined and schema has default
  if (data === undefined && node.schema.default !== undefined) {
    data = structuredClone(node.schema.default);
    node.value = data;
  }

  const effectiveType = Array.isArray(node.type) ? node.type : [node.type];

  if (effectiveType.includes('object') && node.children.length > 0) {
    const obj =
      typeof data === 'object' && data !== null && !Array.isArray(data)
        ? { ...(data as Record<string, unknown>) }
        : {};

    for (const child of node.children) {
      const key = child.path.split('/').pop()!;
      obj[key] = applyDefaultsRecursive(child, obj[key]);
    }
    data = obj;
    node.value = data;
  }

  if (effectiveType.includes('array') && Array.isArray(data) && node.children.length > 0) {
    const arr = [...data];
    for (let i = 0; i < node.children.length; i++) {
      arr[i] = applyDefaultsRecursive(node.children[i], arr[i]);
    }
    data = arr;
    node.value = data;
  }

  return data;
}

// ─── Stage: FINALIZE ───

export function finalize(ctx: PipelineContext): PipelineContext {
  // Pass-through — users can attach middleware here for post-processing
  return ctx;
}
