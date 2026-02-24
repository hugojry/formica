import type { FieldNode, FieldProps } from '@formica/core';
import {
  getCheckboxProps,
  getFieldProps,
  getNumberInputProps,
  getSelectProps,
  getTextInputProps,
  hasEnum,
  hasType,
} from '@formica/core';
import type { ComponentType } from 'react';
import { createElement } from 'react';
import type { ReactRendererEntry, ReactRendererProps } from './dispatch/renderer-context.js';

export interface ComponentMap {
  TextInput: ComponentType<any>;
  NumberInput: ComponentType<any>;
  Checkbox: ComponentType<any>;
  Select: ComponentType<any>;
  Object?: ComponentType<any>;
  Array?: ComponentType<any>;
  Combinator?: ComponentType<any>;
}

export interface CreateRenderersOptions {
  components: ComponentMap;
  /** Transform props before passing to components. Use to add middleware data. */
  mapProps?: (
    props: FieldProps & Record<string, unknown>,
    node: FieldNode,
  ) => Record<string, unknown>;
}

function applyMapProps(
  props: FieldProps & Record<string, unknown>,
  node: FieldNode,
  mapProps?: CreateRenderersOptions['mapProps'],
): Record<string, unknown> {
  return mapProps ? mapProps(props, node) : props;
}

export function createRenderers(options: CreateRenderersOptions): ReactRendererEntry[] {
  const { components, mapProps } = options;
  const entries: ReactRendererEntry[] = [];

  // TextInput — string fields without enum
  entries.push({
    tester: (node) => (hasType(node, 'string') && !hasEnum(node) ? 1 : -1),
    renderer: function TextInputRenderer({ node, onChange }: ReactRendererProps) {
      const baseProps = { ...getFieldProps(node), ...getTextInputProps(node) };
      const finalProps = applyMapProps(baseProps, node, mapProps);
      return createElement(components.TextInput, {
        ...finalProps,
        onChange: (value: string) => onChange(value),
      });
    },
  });

  // NumberInput — number/integer fields without enum
  entries.push({
    tester: (node) =>
      (hasType(node, 'number') || hasType(node, 'integer')) && !hasEnum(node) ? 1 : -1,
    renderer: function NumberInputRenderer({ node, onChange }: ReactRendererProps) {
      const baseProps = { ...getFieldProps(node), ...getNumberInputProps(node) };
      const finalProps = applyMapProps(baseProps, node, mapProps);
      return createElement(components.NumberInput, {
        ...finalProps,
        onChange: (value: number | undefined) => onChange(value),
      });
    },
  });

  // Checkbox — boolean fields
  entries.push({
    tester: (node) => (hasType(node, 'boolean') ? 1 : -1),
    renderer: function CheckboxRenderer({ node, onChange }: ReactRendererProps) {
      const baseProps = { ...getFieldProps(node), ...getCheckboxProps(node) };
      const finalProps = applyMapProps(baseProps, node, mapProps);
      return createElement(components.Checkbox, {
        ...finalProps,
        onChange: (checked: boolean) => onChange(checked),
      });
    },
  });

  // Select — enum fields (higher priority)
  entries.push({
    tester: (node) => (hasEnum(node) ? 3 : -1),
    renderer: function SelectRenderer({ node, onChange }: ReactRendererProps) {
      const baseProps = { ...getFieldProps(node), ...getSelectProps(node) };
      const finalProps = applyMapProps(baseProps, node, mapProps);
      return createElement(components.Select, {
        ...finalProps,
        onChange: (value: unknown) => onChange(value),
      });
    },
  });

  // Object — structural
  if (components.Object) {
    const ObjectComponent = components.Object;
    entries.push({
      tester: (node) => (hasType(node, 'object') ? 1 : -1),
      renderer: function ObjectRenderer({ node, renderChild }: ReactRendererProps) {
        const baseProps = getFieldProps(node);
        const finalProps = applyMapProps(baseProps, node, mapProps);
        const children = node.children.map((child) => renderChild(child.path));
        return createElement(ObjectComponent, { ...finalProps, renderChild, children });
      },
    });
  }

  // Array — structural
  if (components.Array) {
    const ArrayComponent = components.Array;
    entries.push({
      tester: (node) => (hasType(node, 'array') ? 1 : -1),
      renderer: function ArrayRenderer({ node, onChange, renderChild }: ReactRendererProps) {
        const baseProps = getFieldProps(node);
        const finalProps = applyMapProps(baseProps, node, mapProps);
        const children = node.children.map((child) => renderChild(child.path));
        return createElement(ArrayComponent, {
          ...finalProps,
          node,
          onChange,
          renderChild,
          children,
        });
      },
    });
  }

  // Combinator — oneOf/anyOf
  if (components.Combinator) {
    const CombinatorComponent = components.Combinator;
    entries.push({
      tester: (node) => (node.combinator ? 2 : -1),
      renderer: function CombinatorRenderer({
        node,
        onChange,
        setCombinatorIndex,
        renderChild,
      }: ReactRendererProps) {
        const baseProps = getFieldProps(node);
        const finalProps = applyMapProps(baseProps, node, mapProps);
        const children = node.children.map((child) => renderChild(child.path));
        return createElement(CombinatorComponent, {
          ...finalProps,
          node,
          onChange,
          setCombinatorIndex,
          renderChild,
          children,
        });
      },
    });
  }

  return entries;
}
