import './setup.js';
import { createElement, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

interface RenderHookResult<T> {
  result: { current: T };
  renderCount: { current: number };
  rerender: (ui?: ReactElement) => void;
  unmount: () => void;
}

export function renderHook<T>(
  useHook: () => T,
  options?: { wrapper?: React.ComponentType<{ children?: React.ReactNode }> },
): RenderHookResult<T> {
  const result = { current: undefined as unknown as T };
  const renderCount = { current: 0 };
  let root: Root;
  const container = document.createElement('div');
  document.body.appendChild(container);

  function TestComponent() {
    renderCount.current++;
    result.current = useHook();
    return null;
  }

  function buildUi() {
    const element = createElement(TestComponent);
    if (options?.wrapper) {
      return createElement(options.wrapper, null, element);
    }
    return element;
  }

  act(() => {
    root = createRoot(container);
    root.render(buildUi());
  });

  return {
    result,
    renderCount,
    rerender(ui?: ReactElement) {
      act(() => {
        root.render(ui ?? buildUi());
      });
    },
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

export function act(fn: () => void): void {
  // React 19's act is on react-dom/client or react
  // Bun with happy-dom: we use the React internals
  // @ts-expect-error — React internals expose IS_REACT_ACT_ENVIRONMENT
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  // Use React's act from react
  const React = require('react');
  if (typeof React.act === 'function') {
    React.act(fn);
    return;
  }

  // Fallback: just call synchronously
  fn();
}
