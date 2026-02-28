import type { FieldNode, PipelineConfig } from '@formica/core';
import {
  composeDispatch,
  composePropEnhancers,
  extractPropEnhancers,
  hasEnum,
  hasType,
  PipelineStage,
} from '@formica/core';
import {
  DispatchContext,
  FieldDispatch,
  FormProvider,
  PropEnhancerContext,
  useForm,
} from '@formica/react';
import { defaultDispatch } from '@formica/theme-default';
import { createValidationMiddleware } from '@formica/validation';
import { Checkbox, NumberInput, Select, TextInput } from './components';
import { userProfileSchema } from './schema';

const pipelineConfig: PipelineConfig = {
  middleware: {
    [PipelineStage.FINALIZE]: [createValidationMiddleware()],
  },
};

const customDispatch = (node: FieldNode) => {
  if (node.combinator) return null; // fall through to defaultDispatch
  if (hasEnum(node)) return Select;
  if (hasType(node, 'string')) return TextInput;
  if (hasType(node, 'number') || hasType(node, 'integer')) return NumberInput;
  if (hasType(node, 'boolean')) return Checkbox;
  return null;
};

const dispatch = composeDispatch(customDispatch, defaultDispatch);

const initialData = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  age: 28,
  active: true,
  tags: ['developer'],
};

function DataPreview() {
  const { model } = useForm();
  return (
    <div>
      <h2 style={{ margin: '0 0 8px', fontSize: '1.1em' }}>Live Data</h2>
      <pre>{JSON.stringify(model.data, null, 2)}</pre>
    </div>
  );
}

const enhancer = composePropEnhancers(extractPropEnhancers(pipelineConfig));

export function App() {
  return (
    <>
      <h1>Formica — Basic Example</h1>
      <FormProvider schema={userProfileSchema} initialData={initialData} config={pipelineConfig}>
        <DispatchContext.Provider value={dispatch}>
          <PropEnhancerContext.Provider value={enhancer}>
            <div className="grid">
              <div className="panel">
                <FieldDispatch path="" />
              </div>
              <div className="panel">
                <DataPreview />
              </div>
            </div>
          </PropEnhancerContext.Provider>
        </DispatchContext.Provider>
      </FormProvider>
    </>
  );
}
