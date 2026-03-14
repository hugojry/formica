import type { FieldNode, FormStore } from '@formica/core'
import type { ReactNode } from 'react'
import { createElement, memo } from 'react'
import { useField } from '../hooks/use-field.js'

export interface FieldState {
  node: FieldNode
  value: unknown
  handleChange: (value: unknown) => void
  setCombinatorIndex: (path: string, index: number) => void
}

export interface FieldProps {
  path: string
  children: (field: FieldState) => ReactNode
}

interface FieldInnerProps extends FieldState {
  children: (field: FieldState) => ReactNode
}

const FieldInner = memo(
  function FieldInner({
    node,
    value,
    handleChange,
    setCombinatorIndex,
    children,
  }: FieldInnerProps): ReactNode {
    return children({ node, value, handleChange, setCombinatorIndex })
  },
  // Skip children (render prop) from comparison — it's a new function reference
  // on every parent render but produces identical output for the same field state.
  (prev, next) =>
    prev.node === next.node &&
    prev.value === next.value &&
    prev.handleChange === next.handleChange &&
    prev.setCombinatorIndex === next.setCombinatorIndex,
)

export function createFieldComponent(storeRef: { current: FormStore }) {
  return function Field({ path, children }: FieldProps): ReactNode {
    const store = storeRef.current
    const { node, onChange, setCombinatorIndex } = useField(path, store)

    if (!node) return null

    return createElement(FieldInner, {
      node,
      value: node.value,
      handleChange: onChange,
      setCombinatorIndex,
      children,
    })
  }
}
