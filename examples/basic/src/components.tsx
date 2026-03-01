import type { FieldNode } from '@formica/core';
import {
  getCheckboxProps,
  getFieldProps,
  getNumberInputProps,
  getSelectProps,
  getTextInputProps,
} from '@formica/core';
import type { ValidationError } from '@formica/validation';
import { getFieldErrors } from '@formica/validation';

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

interface FieldComponentProps {
  node: FieldNode;
  onChange: (value: unknown) => void;
}

export function TextInput({ node, onChange }: FieldComponentProps) {
  const field = getFieldProps(node);
  const input = getTextInputProps(node);
  const errors = getFieldErrors(node);
  return (
    <FieldWrapper
      label={field.label}
      required={field.required}
      description={field.description}
      errors={errors}
    >
      <input
        type={input.type}
        value={input.value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={field.readOnly}
        minLength={input.minLength}
        maxLength={input.maxLength}
        pattern={input.pattern}
        style={{ width: '100%', padding: '4px 8px', boxSizing: 'border-box' }}
      />
    </FieldWrapper>
  );
}

export function NumberInput({ node, onChange }: FieldComponentProps) {
  const field = getFieldProps(node);
  const input = getNumberInputProps(node);
  const errors = getFieldErrors(node);
  return (
    <FieldWrapper
      label={field.label}
      required={field.required}
      description={field.description}
      errors={errors}
    >
      <input
        type="number"
        value={input.value != null ? String(input.value) : ''}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === '' ? undefined : Number(v));
        }}
        readOnly={field.readOnly}
        min={input.min}
        max={input.max}
        step={input.step}
        style={{ width: '100%', padding: '4px 8px', boxSizing: 'border-box' }}
      />
    </FieldWrapper>
  );
}

export function Checkbox({ node, onChange }: FieldComponentProps) {
  const field = getFieldProps(node);
  const input = getCheckboxProps(node);
  const errors = getFieldErrors(node);
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
        <input
          type="checkbox"
          checked={input.checked}
          onChange={(e) => onChange(e.target.checked)}
          readOnly={field.readOnly}
        />
        {field.label}
        {field.required ? <span style={{ color: 'red' }}> *</span> : null}
      </label>
      {field.description ? (
        <p style={{ margin: '2px 0 0', fontSize: '0.85em', color: '#666' }}>{field.description}</p>
      ) : null}
      <ErrorList errors={errors} />
    </div>
  );
}

export function Select({ node, onChange }: FieldComponentProps) {
  const field = getFieldProps(node);
  const input = getSelectProps(node);
  const errors = getFieldErrors(node);
  return (
    <FieldWrapper
      label={field.label}
      required={field.required}
      description={field.description}
      errors={errors}
    >
      <select
        value={input.value != null ? String(input.value) : ''}
        onChange={(e) => {
          const v = e.target.value;
          const match = input.options.find((o) => String(o.value) === v);
          onChange(match !== undefined ? match.value : v);
        }}
        disabled={field.readOnly}
        style={{ width: '100%', padding: '4px 8px', boxSizing: 'border-box' }}
      >
        <option value="">— Select —</option>
        {input.options.map((opt) => (
          <option key={String(opt.value)} value={String(opt.value)}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}
