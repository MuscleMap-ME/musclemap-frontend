/**
 * Error utilities
 *
 * Goal: ALWAYS return a human-readable string for UI.
 */

export function safeStringify(value, maxLen = 2000) {
  try {
    const seen = new WeakSet();
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

function goodString(v) {
  if (typeof v !== 'string') return '';
  const s = v.trim();
  if (!s) return '';
  // Don’t allow raw "[object Object]" to leak
  if (s === '[object Object]') return '';
  return s;
}

// try common keys in various error shapes
function pickFirstString(obj) {
  if (!obj || typeof obj !== 'object') return '';

  // common fields
  const direct =
    goodString(obj.message) ||
    goodString(obj.error) ||
    goodString(obj.err) ||
    goodString(obj.detail) ||
    goodString(obj.title);

  if (direct) return direct;

  // nested shapes: { error: { message } }, { data: { error } }, etc.
  const nestedCandidates = [
    obj.error,
    obj.err,
    obj.data,
    obj.response,
    obj.body,
  ];

  for (const c of nestedCandidates) {
    if (typeof c === 'string') {
      const s = goodString(c);
      if (s) return s;
    }
    if (c && typeof c === 'object') {
      const s = pickFirstString(c);
      if (s) return s;
    }
  }

  return '';
}

const isEmptyPlainObject = (v) =>
  !!v &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null) &&
  Object.keys(v).length === 0;

const isEmptyArray = (v) => Array.isArray(v) && v.length === 0;

/**
 * Convert ANY thrown value / error-ish shape into a UI-safe string.
 */
export function extractErrorMessage(input, fallback = 'Something went wrong') {
  const fb = goodString(fallback) || 'Something went wrong';

  if (input == null) return fb;

  // already a clean string?
  const asStr = goodString(input);
  if (asStr) return asStr;

  // Error instance
  if (input instanceof Error) {
    // Prefer message if useful
    const m = goodString(input.message);
    if (m) return m;

    // Some code does `new Error({ ... })` which becomes "[object Object]"
    // If message is unusable, try any attached fields
    const fromAttached = pickFirstString(input);
    if (fromAttached) return fromAttached;

    // Last resort: stringify error
    const s = goodString(safeStringify({ name: input.name, message: input.message, stack: input.stack }));
    return s || fb;
  }

  // Objects / arrays
  if (typeof input === 'object') {
    // Empty shapes are not useful: honor fallback (fixes your failing test)
    if (isEmptyPlainObject(input) || isEmptyArray(input)) return fb;

    const fromObj = pickFirstString(input);
    if (fromObj) return fromObj;

    const s = goodString(safeStringify(input));
    if (!s) return fb;
    if (s === '{}' || s === '[]') return fb;
    return s;
  }

  // numbers/booleans/symbols/etc.
  try {
    const s = goodString(String(input));
    return s || fb;
  } catch {
    return fb;
  }
}
