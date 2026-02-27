import type { DispatchFn, FieldNode } from './types.js';

export function composeDispatch<C>(...fns: DispatchFn<C>[]): DispatchFn<C> {
  return (node: FieldNode) => {
    for (const fn of fns) {
      const result = fn(node);
      if (result != null) return result;
    }
    return null;
  };
}
