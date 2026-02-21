# Formica

> **Alpha** — This library is under active development. The core schema-to-model pipeline is functional, but the UI layer (React bindings and theming) is incomplete. APIs may change without notice.

Formica is a form library that compiles JSON Schema into a reactive form model. It handles schema composition (`allOf`, `oneOf`, `anyOf`), conditionals (`if/then/else`), dependencies, `$ref` resolution, and Draft 7 normalization — producing a tree of field nodes ready for rendering.

## Packages

| Package | Status | Description |
|---|---|---|
| `@formica/core` | Functional | Schema-to-model pipeline and reactive store |
| `@formica/react` | Not yet implemented | React hooks and bindings |
| `@formica/theme-default` | Not yet implemented | Default UI components |

## Quick start

```ts
import { runPipeline, createFormStore } from '@formica/core';

const schema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'number', minimum: 0 },
  },
  required: ['name'],
};

// One-shot: build a form model from schema + data
const model = runPipeline(schema, { name: 'Alice', age: 30 });
console.log(model.index.get('/name')?.value); // 'Alice'

// Reactive: create a store that re-evaluates on data changes
const store = createFormStore(schema, { name: 'Alice' });
store.subscribePath('/name', (node) => {
  console.log('name changed:', node.value);
});
store.setData('/name', 'Bob');
```

## Core architecture

The pipeline transforms a JSON Schema through 9 stages:

1. **Normalize** — Convert Draft 7 constructs to 2020-12
2. **Resolve refs** — Inline `$ref` pointers
3. **Merge allOf** — Flatten `allOf` compositions
4. **Evaluate conditionals** — Resolve `if/then/else` against data
5. **Evaluate dependents** — Apply `dependentSchemas`/`dependentRequired`
6. **Resolve combinators** — Middleware hook for `oneOf`/`anyOf`
7. **Build tree** — Construct the `FieldNode` tree
8. **Apply defaults** — Seed missing values from schema defaults
9. **Finalize** — Post-processing middleware hook

Stages 1-3 are static (schema-only) and cached by default in the reactive store. Stages 4-9 are re-run on every data change.

## Middleware

Any pipeline stage can be wrapped with middleware:

```ts
import { runPipeline, PipelineStage } from '@formica/core';
import type { Middleware } from '@formica/core';

const logger: Middleware = (ctx, next) => {
  console.log(`entering ${ctx.stage}`);
  return next();
};

const model = runPipeline(schema, data, {
  middleware: {
    [PipelineStage.BUILD_TREE]: [logger],
  },
});
```

## Development

```sh
bun install
bun test
```
