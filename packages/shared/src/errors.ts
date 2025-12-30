export const DEFAULT_ERROR_MESSAGE = 'Something went wrong';

export function safeStringify(value: unknown, maxLen = 2000): string {
  try {
    const seen = new WeakSet<object>();
    const s = JSON.stringify(
      value,
      (_k, v) => {
        if (typeof v === 'bigint') return v.toString();
        if (typeof v === 'object' && v !== null) {
          if (seen.has(v)) return '[Circular]';
          seen.add(v);
        }
        if (typeof v === 'function') return `[Function ${v.name || 'anonymous'}]`;
        return v;
      },
      2
    );
    if (!s) return '';
    return s.length > maxLen ? s.slice(0, maxLen) + '…' : s;
  } catch {
    try {
      return String(value);
    } catch {
      return '';
    }
  }
}

function goodString(v: unknown): string {
  if (typeof v !== 'string') return '';
  const s = v.trim();
  if (!s) return '';
  if (s === '[object Object]') return '';
  return s;
}

function pickFirstString(obj: unknown): string {
  if (!obj || typeof obj !== 'object') return '';

  const record = obj as Record<string, unknown>;

  const direct =
    goodString(record.message) ||
    goodString(record.error) ||
    goodString(record.err) ||
    goodString(record.detail) ||
    goodString(record.title);

  if (direct) return direct;

  const nestedCandidates = [record.error, record.err, record.data, record.response, record.body];

  for (const candidate of nestedCandidates) {
    if (typeof candidate === 'string') {
      const s = goodString(candidate);
      if (s) return s;
    }
    if (candidate && typeof candidate === 'object') {
      const s = pickFirstString(candidate);
      if (s) return s;
    }
  }

  return '';
}

const isEmptyPlainObject = (v: unknown) =>
  !!v &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null) &&
  Object.keys(v as Record<string, unknown>).length === 0;

const isEmptyArray = (v: unknown) => Array.isArray(v) && v.length === 0;

export function extractErrorMessage(input: unknown, fallback = DEFAULT_ERROR_MESSAGE): string {
  const fb = goodString(fallback) || DEFAULT_ERROR_MESSAGE;

  if (input == null) return fb;

  const asStr = goodString(input);
  if (asStr) return asStr;

  if (input instanceof Error) {
    const m = goodString(input.message);
    if (m) return m;

    const fromAttached = pickFirstString(input);
    if (fromAttached) return fromAttached;

    const s = goodString(safeStringify({ name: input.name, message: input.message, stack: input.stack }));
    return s || fb;
  }

  if (typeof input === 'object') {
    if (isEmptyPlainObject(input) || isEmptyArray(input)) return fb;

    const fromObj = pickFirstString(input);
    if (fromObj) return fromObj;

    if (fb !== DEFAULT_ERROR_MESSAGE) return fb;

    const s = goodString(safeStringify(input));
    if (!s) return fb;
    if (s === '{}' || s === '[]') return fb;
    return s;
  }

  try {
    const s = goodString(String(input));
    return s || fb;
  } catch {
    return fb;
  }
}
