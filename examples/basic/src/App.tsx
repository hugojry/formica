import { FormProvider, FieldDispatch, RendererContext, useForm } from '@formica/react';
import { defaultRenderers } from '@formica/theme-default';
import { userProfileSchema } from './schema';

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

export function App() {
  return (
    <>
      <h1>Formica — Basic Example</h1>
      <FormProvider schema={userProfileSchema} initialData={initialData}>
        <RendererContext.Provider value={defaultRenderers}>
          <div className="grid">
            <div className="panel">
              <FieldDispatch path="" />
            </div>
            <div className="panel">
              <DataPreview />
            </div>
          </div>
        </RendererContext.Provider>
      </FormProvider>
    </>
  );
}
