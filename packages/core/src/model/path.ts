/** Parse a JSON Pointer (RFC 6901) into segments. */
export function parsePath(pointer: string): string[] {
  if (pointer === '' || pointer === '/') return [];
  if (!pointer.startsWith('/')) {
    throw new Error(`Invalid JSON Pointer: "${pointer}" — must start with "/"`);
  }
  return pointer
    .slice(1)
    .split('/')
    .map(s => s.replace(/~1/g, '/').replace(/~0/g, '~'));
}

/** Build a JSON Pointer from segments. */
export function buildPath(segments: string[]): string {
  if (segments.length === 0) return '';
  return '/' + segments.map(s => s.replace(/~/g, '~0').replace(/\//g, '~1')).join('/');
}

/** Append a segment to a JSON Pointer. */
export function appendPath(base: string, segment: string | number): string {
  const escaped = String(segment).replace(/~/g, '~0').replace(/\//g, '~1');
  return base === '' ? `/${escaped}` : `${base}/${escaped}`;
}

/** Get the parent pointer. */
export function parentPath(pointer: string): string {
  const segs = parsePath(pointer);
  segs.pop();
  return buildPath(segs);
}

/** Check if `child` is a descendant of `ancestor`. */
export function isDescendant(ancestor: string, child: string): boolean {
  if (ancestor === '') return child !== '';
  return child.startsWith(ancestor + '/');
}

/** Get a value from nested data by JSON Pointer. */
export function getByPath(data: unknown, pointer: string): unknown {
  if (pointer === '') return data;
  const segs = parsePath(pointer);
  let current: any = data;
  for (const seg of segs) {
    if (current == null || typeof current !== 'object') return undefined;
    current = Array.isArray(current) ? current[Number(seg)] : current[seg];
  }
  return current;
}

/** Set a value in nested data by JSON Pointer. Returns a new object (shallow copies along the path). */
export function setByPath(data: unknown, pointer: string, value: unknown): unknown {
  if (pointer === '') return value;
  const segs = parsePath(pointer);
  return setRecursive(data, segs, 0, value);
}

function setRecursive(current: unknown, segs: string[], idx: number, value: unknown): unknown {
  const seg = segs[idx];
  const isLast = idx === segs.length - 1;

  if (Array.isArray(current)) {
    const copy = [...current];
    const i = Number(seg);
    copy[i] = isLast ? value : setRecursive(copy[i], segs, idx + 1, value);
    return copy;
  }

  const obj = (current != null && typeof current === 'object') ? current as Record<string, unknown> : {};
  return {
    ...obj,
    [seg]: isLast ? value : setRecursive(obj[seg], segs, idx + 1, value),
  };
}

/** Delete a value from nested data by JSON Pointer. Returns a new object. */
export function deleteByPath(data: unknown, pointer: string): unknown {
  if (pointer === '') return undefined;
  const segs = parsePath(pointer);
  return deleteRecursive(data, segs, 0);
}

function deleteRecursive(current: unknown, segs: string[], idx: number): unknown {
  const seg = segs[idx];
  const isLast = idx === segs.length - 1;

  if (Array.isArray(current)) {
    const copy = [...current];
    const i = Number(seg);
    if (isLast) {
      copy.splice(i, 1);
    } else {
      copy[i] = deleteRecursive(copy[i], segs, idx + 1);
    }
    return copy;
  }

  if (current != null && typeof current === 'object') {
    const obj = { ...(current as Record<string, unknown>) };
    if (isLast) {
      delete obj[seg];
    } else {
      obj[seg] = deleteRecursive(obj[seg], segs, idx + 1);
    }
    return obj;
  }

  return current;
}
