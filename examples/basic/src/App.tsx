import type { PipelineConfig } from '@formica/core';
import { getFieldProps, hasEnum, hasType, PipelineStage } from '@formica/core';
import type { FormApi } from '@formica/react';
import { useForm } from '@formica/react';
import { createValidationMiddleware } from '@formica/validation';
import { Checkbox, NumberInput, Select, TextInput } from './components';
import { userProfileSchema } from './schema';

const pipelineConfig: PipelineConfig = {
  middleware: {
    [PipelineStage.FINALIZE]: [createValidationMiddleware()],
  },
};

const initialData = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  age: 28,
  active: true,
  tags: ['developer'],
};

function RenderField({ path, form }: { path: string; form: FormApi }) {
  return (
    <form.Field path={path}>
      {(field) => {
        const { node } = field;
        if (!node.active) return null;

        // Combinator (oneOf/anyOf)
        if (node.combinator) {
          const { combinator } = node;
          const fp = getFieldProps(node);
          return (
            <div style={{ marginBottom: 8, border: '1px solid #ddd', padding: 8, borderRadius: 4 }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>{fp.label}</span>
              <select
                value={combinator.activeIndex ?? ''}
                onChange={(e) => {
                  const idx = e.target.value === '' ? 0 : Number(e.target.value);
                  field.setCombinatorIndex(node.path, idx);
                }}
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  boxSizing: 'border-box',
                  marginBottom: 8,
                }}
              >
                {combinator.labels.map((label, i) => (
                  <option key={label} value={i}>
                    {label}
                  </option>
                ))}
              </select>
              {node.children.map((child) => (
                <RenderField key={child.path} path={child.path} form={form} />
              ))}
            </div>
          );
        }

        // Array
        if (hasType(node, 'array')) {
          const fp = getFieldProps(node);
          return (
            <div style={{ marginBottom: 8 }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>{fp.label}</span>
              {fp.description ? (
                <p style={{ margin: '0 0 4px', fontSize: '0.85em', color: '#666' }}>
                  {fp.description}
                </p>
              ) : null}
              {node.children.map((item, i) => (
                <div key={item.path} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  <form.Field path={item.path}>
                    {(f) => (
                      <input
                        value={f.value as string}
                        onChange={(e) => f.handleChange(e.target.value)}
                        style={{ flex: 1, padding: '4px 8px', boxSizing: 'border-box' }}
                      />
                    )}
                  </form.Field>
                  <button
                    type="button"
                    onClick={() => {
                      const arr = (node.value as unknown[]).filter((_, idx) => idx !== i);
                      form.setData(node.path, arr);
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const arr = Array.isArray(node.value) ? [...(node.value as unknown[]), ''] : [''];
                  form.setData(node.path, arr);
                }}
              >
                Add
              </button>
            </div>
          );
        }

        // Object (nested)
        if (hasType(node, 'object')) {
          const fp = getFieldProps(node);
          return (
            <fieldset
              style={{ marginBottom: 8, border: '1px solid #ddd', padding: 8, borderRadius: 4 }}
            >
              <legend style={{ fontWeight: 500 }}>{fp.label}</legend>
              {node.children.map((child) => (
                <RenderField key={child.path} path={child.path} form={form} />
              ))}
            </fieldset>
          );
        }

        // Leaf fields
        if (hasEnum(node)) {
          return <Select node={node} onChange={field.handleChange} />;
        }
        if (hasType(node, 'string')) {
          return <TextInput node={node} onChange={field.handleChange} />;
        }
        if (hasType(node, 'number') || hasType(node, 'integer')) {
          return <NumberInput node={node} onChange={field.handleChange} />;
        }
        if (hasType(node, 'boolean')) {
          return <Checkbox node={node} onChange={field.handleChange} />;
        }

        return null;
      }}
    </form.Field>
  );
}

function RenderRoot({ form }: { form: FormApi }) {
  return (
    <form.Field path="">
      {(field) => (
        <>
          {field.node.children.map((child) => (
            <RenderField key={child.path} path={child.path} form={form} />
          ))}
        </>
      )}
    </form.Field>
  );
}

function DataPreview({ form }: { form: FormApi }) {
  return (
    <form.Subscribe selector={(s) => s}>
      {(state) => (
        <div>
          <h2 style={{ margin: '0 0 8px', fontSize: '1.1em' }}>Live Data</h2>
          <pre>{JSON.stringify(state.data, null, 2)}</pre>
          <p style={{ marginTop: 8 }}>Form is {state.isDirty ? 'dirty' : 'clean'}</p>
        </div>
      )}
    </form.Subscribe>
  );
}

export function App() {
  const form = useForm({
    schema: userProfileSchema,
    initialData,
    config: pipelineConfig,
  });

  return (
    <>
      <h1>Formica — Basic Example</h1>
      <div className="grid">
        <div className="panel">
          <RenderRoot form={form} />
        </div>
        <div className="panel">
          <DataPreview form={form} />
        </div>
      </div>
    </>
  );
}
