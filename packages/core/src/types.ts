// ─── JSON Schema Types ───

export type JSONSchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null';

export interface JSONSchema {
  // Meta
  $id?: string;
  $schema?: string;
  $ref?: string;
  $defs?: Record<string, JSONSchema>;
  $comment?: string;

  // Draft 7 compat (normalized away)
  definitions?: Record<string, JSONSchema>;
  dependencies?: Record<string, JSONSchema | string[]>;

  // Type
  type?: JSONSchemaType | JSONSchemaType[];
  const?: unknown;
  enum?: unknown[];

  // Numeric
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number | boolean;
  exclusiveMaximum?: number | boolean;
  multipleOf?: number;

  // String
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;

  // Array
  items?: JSONSchema | JSONSchema[];
  prefixItems?: JSONSchema[];
  additionalItems?: JSONSchema | boolean;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  contains?: JSONSchema;

  // Object
  properties?: Record<string, JSONSchema>;
  patternProperties?: Record<string, JSONSchema>;
  additionalProperties?: JSONSchema | boolean;
  required?: string[];
  minProperties?: number;
  maxProperties?: number;
  propertyNames?: JSONSchema;

  // Composition
  allOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  oneOf?: JSONSchema[];
  not?: JSONSchema;

  // Conditionals
  if?: JSONSchema;
  then?: JSONSchema;
  else?: JSONSchema;

  // Dependencies (2020-12)
  dependentSchemas?: Record<string, JSONSchema>;
  dependentRequired?: Record<string, string[]>;

  // Annotations
  title?: string;
  description?: string;
  default?: unknown;
  readOnly?: boolean;
  writeOnly?: boolean;
  deprecated?: boolean;
  examples?: unknown[];

  // UI hints (extension)
  [key: `x-${string}`]: unknown;
}

// ─── Field Node ───

export type FieldOrigin =
  | 'property'
  | 'additionalProperty'
  | 'patternProperty'
  | 'arrayItem'
  | 'prefixItem'
  | 'conditionalThen'
  | 'conditionalElse'
  | 'oneOfBranch'
  | 'anyOfBranch'
  | 'dependentSchema'
  | 'root';

export interface FieldConstraints {
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  minProperties?: number;
  maxProperties?: number;
  enum?: unknown[];
  const?: unknown;
}

export interface CombinatorInfo {
  type: 'oneOf' | 'anyOf';
  options: JSONSchema[];
  activeIndex: number | null;
  labels: string[];
  ambiguous: boolean;
}

export interface ArrayMeta {
  itemSchema: JSONSchema;
  prefixItems?: JSONSchema[];
  canAdd: boolean;
  canRemove: boolean;
  canReorder: boolean;
}

export interface FieldNode {
  path: string;
  schema: JSONSchema;
  type: JSONSchemaType | JSONSchemaType[];
  value: unknown;
  children: FieldNode[];
  required: boolean;
  readOnly: boolean;
  deprecated: boolean;
  active: boolean;
  constraints: FieldConstraints;
  combinator?: CombinatorInfo;
  origin: FieldOrigin;
  arrayMeta?: ArrayMeta;
  extensions: Record<string, unknown>;
}

// ─── Form Model ───

export interface FormModel {
  root: FieldNode;
  schema: JSONSchema;
  data: unknown;
  index: Map<string, FieldNode>;
  conditionalDeps: Map<string, Set<string>>;
}

// ─── Pipeline ───

export enum PipelineStage {
  NORMALIZE = 'NORMALIZE',
  RESOLVE_REFS = 'RESOLVE_REFS',
  MERGE_ALLOF = 'MERGE_ALLOF',
  EVALUATE_CONDITIONALS = 'EVALUATE_CONDITIONALS',
  EVALUATE_DEPENDENTS = 'EVALUATE_DEPENDENTS',
  RESOLVE_COMBINATORS = 'RESOLVE_COMBINATORS',
  BUILD_TREE = 'BUILD_TREE',
  APPLY_DEFAULTS = 'APPLY_DEFAULTS',
  FINALIZE = 'FINALIZE',
}

export interface PipelineContext {
  schema: JSONSchema;
  data: unknown;
  root: FieldNode | null;
  index: Map<string, FieldNode>;
  conditionalDeps: Map<string, Set<string>>;
  stage: PipelineStage;
  meta: Record<string, unknown>;
}

export type Middleware = (ctx: PipelineContext, next: () => PipelineContext) => PipelineContext;

export interface PipelineConfig {
  middleware?: Partial<Record<PipelineStage, Middleware[]>>;
  /** Cache the result of static pipeline stages (normalize, resolve refs, merge allOf). Defaults to true. */
  cacheStaticStages?: boolean;
}

/** The result of running the static pipeline stages. Can be reused across data changes. */
export interface PreparedSchema {
  schema: JSONSchema;
  meta: Record<string, unknown>;
}
// ─── Store ───

export type PathSubscriber = (node: FieldNode) => void;
export type ModelSubscriber = (model: FormModel) => void;

export interface FormStore {
  getModel(): FormModel;
  getData(): unknown;
  setData(path: string, value: unknown): void;
  subscribe(listener: ModelSubscriber): () => void;
  subscribePath(path: string, listener: PathSubscriber): () => void;
}

// ─── Renderer ───
// Renderer types use generic placeholders so @formica/core stays React-free.
// The React package supplies the concrete types.

export interface RendererProps<RenderResult = unknown> {
  node: FieldNode;
  onChange: (value: unknown) => void;
  renderChild: (path: string) => RenderResult;
}

export interface RendererEntry<Component = unknown> {
  tester: (node: FieldNode) => number;
  renderer: Component;
}
