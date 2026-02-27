import type { Middleware, MiddlewareEntry, PipelineConfig, PropEnhancer } from '../types.js';

export function extractMiddleware(entry: MiddlewareEntry): Middleware {
  return typeof entry === 'function' ? entry : entry.middleware;
}

export function extractPropEnhancers(config?: PipelineConfig): PropEnhancer[] {
  if (!config?.middleware) return [];
  const enhancers: PropEnhancer[] = [];
  for (const entries of Object.values(config.middleware)) {
    if (!entries) continue;
    for (const entry of entries) {
      if (typeof entry !== 'function' && entry.propEnhancer) {
        enhancers.push(entry.propEnhancer);
      }
    }
  }
  return enhancers;
}

export function composePropEnhancers(enhancers: PropEnhancer[]): PropEnhancer | null {
  if (enhancers.length === 0) return null;
  if (enhancers.length === 1) return enhancers[0];
  return (node) => Object.assign({}, ...enhancers.map((e) => e(node)));
}
