import type { ValidationError } from '@formica/validation';

interface ErrorListProps {
  errors?: ValidationError[];
}

function ErrorList({ errors }: ErrorListProps) {
  if (!errors || errors.length === 0) return null;
  return (
    <>
      {errors.map((err) => (
        <p key={err.message} style={{ margin: '2px 0 0', fontSize: '0.85em', color: '#d32f2f' }}>
          {err.message}
        </p>
      ))}
    </>
  );
}

interface FieldWrapperProps {
  label: string;
  required?: boolean;
  description?: string;
  children: React.ReactNode;
  errors?: ValidationError[];
}

function FieldWrapper({ label, required, description, children, errors }: FieldWrapperProps) {
  return (
    <div style={{ marginBottom: 8 }}>
      <span style={{ display: 'block', marginBottom: 2, fontWeight: 500 }}>
        {label}
        {required ? <span style={{ color: 'red' }}> *</span> : null}
      </span>
      {description ? (
        <p style={{ margin: '0 0 4px', fontSize: '0.85em', color: '#666' }}>{description}</p>
      ) : null}
      {children}
      <ErrorList errors={errors} />
    </div>
  );
}

// ─── Leaf Components ───

export function TextInput(props: {
  label: string;
  required: boolean;
  description?: string;
  type: string;
  value: string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  readOnly: boolean;
  onChange: (value: string) => void;
  errors?: ValidationError[];
}) {
  return (
    <FieldWrapper
      label={props.label}
      required={props.required}
      description={props.description}
      errors={props.errors}
    >
      <input
        type={props.type}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        readOnly={props.readOnly}
        minLength={props.minLength}
        maxLength={props.maxLength}
        pattern={props.pattern}
        style={{ width: '100%', padding: '4px 8px', boxSizing: 'border-box' }}
      />
    </FieldWrapper>
  );
}

export function NumberInput(props: {
  label: string;
  required: boolean;
  description?: string;
  value: number | undefined;
  min?: number;
  max?: number;
  step?: number;
  readOnly: boolean;
  onChange: (value: number | undefined) => void;
  errors?: ValidationError[];
}) {
  return (
    <FieldWrapper
      label={props.label}
      required={props.required}
      description={props.description}
      errors={props.errors}
    >
      <input
        type="number"
        value={props.value != null ? String(props.value) : ''}
        onChange={(e) => {
          const v = e.target.value;
          props.onChange(v === '' ? undefined : Number(v));
        }}
        readOnly={props.readOnly}
        min={props.min}
        max={props.max}
        step={props.step}
        style={{ width: '100%', padding: '4px 8px', boxSizing: 'border-box' }}
      />
    </FieldWrapper>
  );
}

export function Checkbox(props: {
  label: string;
  required: boolean;
  description?: string;
  checked: boolean;
  readOnly: boolean;
  onChange: (checked: boolean) => void;
  errors?: ValidationError[];
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
        <input
          type="checkbox"
          checked={props.checked}
          onChange={(e) => props.onChange(e.target.checked)}
          readOnly={props.readOnly}
        />
        {props.label}
        {props.required ? <span style={{ color: 'red' }}> *</span> : null}
      </label>
      {props.description ? (
        <p style={{ margin: '2px 0 0', fontSize: '0.85em', color: '#666' }}>{props.description}</p>
      ) : null}
      <ErrorList errors={props.errors} />
    </div>
  );
}

export function Select(props: {
  label: string;
  required: boolean;
  description?: string;
  value: unknown;
  options: { label: string; value: unknown }[];
  readOnly: boolean;
  onChange: (value: unknown) => void;
  errors?: ValidationError[];
}) {
  return (
    <FieldWrapper
      label={props.label}
      required={props.required}
      description={props.description}
      errors={props.errors}
    >
      <select
        value={props.value != null ? String(props.value) : ''}
        onChange={(e) => {
          const v = e.target.value;
          const match = props.options.find((o) => String(o.value) === v);
          props.onChange(match !== undefined ? match.value : v);
        }}
        disabled={props.readOnly}
        style={{ width: '100%', padding: '4px 8px', boxSizing: 'border-box' }}
      >
        <option value="">— Select —</option>
        {props.options.map((opt) => (
          <option key={String(opt.value)} value={String(opt.value)}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}
