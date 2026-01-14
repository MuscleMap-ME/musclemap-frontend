/**
 * Assertion Engine
 * Validation engine for test assertions with comprehensive type support
 */

import type {
  Assertion,
  AssertionResult,
  AssertionType,
  TestContext,
} from './types.js';

// ============================================================================
// Path Resolution
// ============================================================================

/**
 * Resolve a dot-notation path on an object
 * Example: getPath({ a: { b: 1 } }, 'a.b') => 1
 */
export function getPath(obj: unknown, path: string): unknown {
  if (!path) return obj;

  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }

    // Handle array indexing like "items[0]" or "items.0"
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, key, index] = arrayMatch;
      current = (current as Record<string, unknown>)[key];
      if (Array.isArray(current)) {
        current = current[parseInt(index, 10)];
      } else {
        return undefined;
      }
    } else if (/^\d+$/.test(part) && Array.isArray(current)) {
      current = current[parseInt(part, 10)];
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }

  return current;
}

// ============================================================================
// Assertion Validators
// ============================================================================

type ValidatorFn = (
  actual: unknown,
  expected: unknown,
  ctx: TestContext
) => boolean | Promise<boolean>;

const validators: Record<AssertionType, ValidatorFn> = {
  equals: (actual, expected) => {
    if (typeof actual === 'object' && typeof expected === 'object') {
      return JSON.stringify(actual) === JSON.stringify(expected);
    }
    return actual === expected;
  },

  notEquals: (actual, expected) => {
    if (typeof actual === 'object' && typeof expected === 'object') {
      return JSON.stringify(actual) !== JSON.stringify(expected);
    }
    return actual !== expected;
  },

  contains: (actual, expected) => {
    if (typeof actual === 'string' && typeof expected === 'string') {
      return actual.includes(expected);
    }
    if (Array.isArray(actual)) {
      return actual.some((item) =>
        typeof item === 'object'
          ? JSON.stringify(item) === JSON.stringify(expected)
          : item === expected
      );
    }
    return false;
  },

  notContains: (actual, expected) => {
    if (typeof actual === 'string' && typeof expected === 'string') {
      return !actual.includes(expected);
    }
    if (Array.isArray(actual)) {
      return !actual.some((item) =>
        typeof item === 'object'
          ? JSON.stringify(item) === JSON.stringify(expected)
          : item === expected
      );
    }
    return true;
  },

  matches: (actual, expected) => {
    if (typeof actual !== 'string') return false;
    const pattern = expected instanceof RegExp ? expected : new RegExp(String(expected));
    return pattern.test(actual);
  },

  greaterThan: (actual, expected) => {
    return typeof actual === 'number' && typeof expected === 'number' && actual > expected;
  },

  lessThan: (actual, expected) => {
    return typeof actual === 'number' && typeof expected === 'number' && actual < expected;
  },

  truthy: (actual) => Boolean(actual),

  falsy: (actual) => !actual,

  exists: (actual) => actual !== undefined && actual !== null,

  notExists: (actual) => actual === undefined || actual === null,

  hasProperty: (actual, expected) => {
    if (typeof actual !== 'object' || actual === null) return false;
    return Object.prototype.hasOwnProperty.call(actual, String(expected));
  },

  hasLength: (actual, expected) => {
    if (Array.isArray(actual) || typeof actual === 'string') {
      return actual.length === expected;
    }
    return false;
  },

  isArray: (actual) => Array.isArray(actual),

  isObject: (actual) =>
    typeof actual === 'object' && actual !== null && !Array.isArray(actual),

  isNumber: (actual) => typeof actual === 'number' && !isNaN(actual),

  isString: (actual) => typeof actual === 'string',

  isBoolean: (actual) => typeof actual === 'boolean',

  statusCode: (actual, expected) => {
    const actualCode = typeof actual === 'number' ? actual : (actual as { statusCode?: number })?.statusCode;
    if (Array.isArray(expected)) {
      return expected.includes(actualCode);
    }
    return actualCode === expected;
  },

  schema: (actual, expected) => {
    // Basic JSON schema validation
    return validateSchema(actual, expected as SchemaDefinition);
  },

  custom: async (actual, expected, ctx) => {
    if (typeof expected === 'function') {
      return expected(actual, ctx);
    }
    return false;
  },
};

// ============================================================================
// Schema Validation
// ============================================================================

interface SchemaDefinition {
  type?: string;
  properties?: Record<string, SchemaDefinition>;
  required?: string[];
  items?: SchemaDefinition;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  enum?: unknown[];
}

function validateSchema(value: unknown, schema: SchemaDefinition): boolean {
  if (!schema) return true;

  // Type validation
  if (schema.type) {
    const typeMap: Record<string, (v: unknown) => boolean> = {
      string: (v) => typeof v === 'string',
      number: (v) => typeof v === 'number' && !isNaN(v),
      integer: (v) => typeof v === 'number' && Number.isInteger(v),
      boolean: (v) => typeof v === 'boolean',
      array: (v) => Array.isArray(v),
      object: (v) => typeof v === 'object' && v !== null && !Array.isArray(v),
      null: (v) => v === null,
    };

    const typeValidator = typeMap[schema.type];
    if (typeValidator && !typeValidator(value)) {
      return false;
    }
  }

  // Enum validation
  if (schema.enum && !schema.enum.includes(value)) {
    return false;
  }

  // String validations
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) return false;
    if (schema.maxLength !== undefined && value.length > schema.maxLength) return false;
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) return false;
  }

  // Number validations
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) return false;
    if (schema.maximum !== undefined && value > schema.maximum) return false;
  }

  // Array validations
  if (Array.isArray(value) && schema.items) {
    return value.every((item) => validateSchema(item, schema.items!));
  }

  // Object validations
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;

    // Check required properties
    if (schema.required) {
      for (const prop of schema.required) {
        if (!(prop in obj)) return false;
      }
    }

    // Validate properties
    if (schema.properties) {
      for (const [prop, propSchema] of Object.entries(schema.properties)) {
        if (prop in obj && !validateSchema(obj[prop], propSchema)) {
          return false;
        }
      }
    }
  }

  return true;
}

// ============================================================================
// Main Assertion Runner
// ============================================================================

/**
 * Run a single assertion
 */
export async function runAssertion(
  assertion: Assertion,
  data: unknown,
  ctx: TestContext
): Promise<AssertionResult> {
  try {
    // Resolve the value from the path
    const actual = assertion.path ? getPath(data, assertion.path) : data;

    // Handle custom validators
    if (assertion.type === 'custom' && assertion.validator) {
      const passed = await assertion.validator(actual, ctx);
      return {
        assertion,
        passed,
        actual,
        expected: 'custom validation',
        message: passed ? undefined : assertion.message || 'Custom assertion failed',
      };
    }

    // Get the validator function
    const validator = validators[assertion.type];
    if (!validator) {
      return {
        assertion,
        passed: false,
        actual,
        expected: assertion.expected,
        message: `Unknown assertion type: ${assertion.type}`,
      };
    }

    // Run the validator
    const passed = await validator(actual, assertion.expected, ctx);

    return {
      assertion,
      passed,
      actual,
      expected: assertion.expected,
      message: passed ? undefined : assertion.message || formatFailureMessage(assertion, actual),
    };
  } catch (error) {
    return {
      assertion,
      passed: false,
      actual: undefined,
      expected: assertion.expected,
      message: `Assertion error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Run multiple assertions
 */
export async function runAssertions(
  assertions: Assertion[],
  data: unknown,
  ctx: TestContext
): Promise<AssertionResult[]> {
  const results: AssertionResult[] = [];

  for (const assertion of assertions) {
    const result = await runAssertion(assertion, data, ctx);
    results.push(result);
  }

  return results;
}

/**
 * Check if all assertions passed
 */
export function allPassed(results: AssertionResult[]): boolean {
  return results.every((r) => r.passed);
}

/**
 * Get failed assertions
 */
export function getFailures(results: AssertionResult[]): AssertionResult[] {
  return results.filter((r) => !r.passed);
}

// ============================================================================
// Assertion Builders (Fluent API)
// ============================================================================

/**
 * Create an assertion builder for fluent API
 */
export function assert(path?: string): AssertionBuilder {
  return new AssertionBuilder(path);
}

class AssertionBuilder {
  private path?: string;

  constructor(path?: string) {
    this.path = path;
  }

  equals(expected: unknown, message?: string): Assertion {
    return { type: 'equals', path: this.path, expected, message };
  }

  notEquals(expected: unknown, message?: string): Assertion {
    return { type: 'notEquals', path: this.path, expected, message };
  }

  contains(expected: unknown, message?: string): Assertion {
    return { type: 'contains', path: this.path, expected, message };
  }

  notContains(expected: unknown, message?: string): Assertion {
    return { type: 'notContains', path: this.path, expected, message };
  }

  matches(pattern: string | RegExp, message?: string): Assertion {
    return { type: 'matches', path: this.path, expected: pattern, message };
  }

  greaterThan(expected: number, message?: string): Assertion {
    return { type: 'greaterThan', path: this.path, expected, message };
  }

  lessThan(expected: number, message?: string): Assertion {
    return { type: 'lessThan', path: this.path, expected, message };
  }

  truthy(message?: string): Assertion {
    return { type: 'truthy', path: this.path, message };
  }

  falsy(message?: string): Assertion {
    return { type: 'falsy', path: this.path, message };
  }

  exists(message?: string): Assertion {
    return { type: 'exists', path: this.path, message };
  }

  notExists(message?: string): Assertion {
    return { type: 'notExists', path: this.path, message };
  }

  hasProperty(property: string, message?: string): Assertion {
    return { type: 'hasProperty', path: this.path, expected: property, message };
  }

  hasLength(length: number, message?: string): Assertion {
    return { type: 'hasLength', path: this.path, expected: length, message };
  }

  isArray(message?: string): Assertion {
    return { type: 'isArray', path: this.path, message };
  }

  isObject(message?: string): Assertion {
    return { type: 'isObject', path: this.path, message };
  }

  isNumber(message?: string): Assertion {
    return { type: 'isNumber', path: this.path, message };
  }

  isString(message?: string): Assertion {
    return { type: 'isString', path: this.path, message };
  }

  isBoolean(message?: string): Assertion {
    return { type: 'isBoolean', path: this.path, message };
  }

  statusCode(expected: number | number[], message?: string): Assertion {
    return { type: 'statusCode', path: this.path, expected, message };
  }

  schema(definition: SchemaDefinition, message?: string): Assertion {
    return { type: 'schema', path: this.path, expected: definition, message };
  }

  custom(
    validator: (value: unknown, ctx: TestContext) => boolean | Promise<boolean>,
    message?: string
  ): Assertion {
    return { type: 'custom', path: this.path, validator, message };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatFailureMessage(assertion: Assertion, actual: unknown): string {
  const path = assertion.path ? ` at path "${assertion.path}"` : '';
  const actualStr = formatValue(actual);
  const expectedStr = formatValue(assertion.expected);

  switch (assertion.type) {
    case 'equals':
      return `Expected ${expectedStr}${path}, got ${actualStr}`;
    case 'notEquals':
      return `Expected value${path} to not equal ${expectedStr}`;
    case 'contains':
      return `Expected ${actualStr}${path} to contain ${expectedStr}`;
    case 'notContains':
      return `Expected ${actualStr}${path} to not contain ${expectedStr}`;
    case 'matches':
      return `Expected ${actualStr}${path} to match pattern ${expectedStr}`;
    case 'greaterThan':
      return `Expected ${actualStr}${path} to be greater than ${expectedStr}`;
    case 'lessThan':
      return `Expected ${actualStr}${path} to be less than ${expectedStr}`;
    case 'truthy':
      return `Expected${path} truthy value, got ${actualStr}`;
    case 'falsy':
      return `Expected${path} falsy value, got ${actualStr}`;
    case 'exists':
      return `Expected value${path} to exist`;
    case 'notExists':
      return `Expected value${path} to not exist`;
    case 'hasProperty':
      return `Expected object${path} to have property "${assertion.expected}"`;
    case 'hasLength':
      return `Expected${path} length ${expectedStr}, got ${Array.isArray(actual) || typeof actual === 'string' ? actual.length : 'N/A'}`;
    case 'isArray':
      return `Expected${path} array, got ${typeof actual}`;
    case 'isObject':
      return `Expected${path} object, got ${typeof actual}`;
    case 'isNumber':
      return `Expected${path} number, got ${typeof actual}`;
    case 'isString':
      return `Expected${path} string, got ${typeof actual}`;
    case 'isBoolean':
      return `Expected${path} boolean, got ${typeof actual}`;
    case 'statusCode':
      return `Expected status code ${expectedStr}, got ${actualStr}`;
    case 'schema':
      return `Value${path} does not match schema`;
    default:
      return `Assertion "${assertion.type}" failed${path}`;
  }
}

function formatValue(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return `"${value.length > 50 ? value.slice(0, 50) + '...' : value}"`;
  if (typeof value === 'object') {
    const str = JSON.stringify(value);
    return str.length > 100 ? str.slice(0, 100) + '...' : str;
  }
  return String(value);
}

// ============================================================================
// Common Assertion Presets
// ============================================================================

export const presets = {
  /** Response is successful (status 200-299) */
  isSuccess: (): Assertion => ({
    type: 'custom',
    validator: (value) => {
      const status = typeof value === 'number' ? value : (value as { status?: number })?.status;
      return status !== undefined && status >= 200 && status < 300;
    },
    message: 'Expected successful response (2xx status)',
  }),

  /** Response has data property */
  hasData: (): Assertion => ({
    type: 'hasProperty',
    expected: 'data',
    message: 'Expected response to have data property',
  }),

  /** Response is array with items */
  isNonEmptyArray: (path?: string): Assertion => ({
    type: 'custom',
    path,
    validator: (value) => Array.isArray(value) && value.length > 0,
    message: 'Expected non-empty array',
  }),

  /** Response has pagination */
  hasPagination: (): Assertion[] => [
    { type: 'hasProperty', path: 'data', expected: 'items' },
    { type: 'hasProperty', path: 'data', expected: 'total' },
    { type: 'hasProperty', path: 'data', expected: 'page' },
  ],

  /** User object schema */
  isValidUser: (): Assertion => ({
    type: 'schema',
    path: 'data',
    expected: {
      type: 'object',
      required: ['id', 'email', 'username'],
      properties: {
        id: { type: 'string' },
        email: { type: 'string', pattern: '^[^@]+@[^@]+\\.[^@]+$' },
        username: { type: 'string', minLength: 1 },
      },
    },
    message: 'Response should contain valid user object',
  }),

  /** Exercise object schema */
  isValidExercise: (): Assertion => ({
    type: 'schema',
    path: 'data',
    expected: {
      type: 'object',
      required: ['id', 'name'],
      properties: {
        id: { type: 'string' },
        name: { type: 'string', minLength: 1 },
        muscleGroups: { type: 'array' },
      },
    },
    message: 'Response should contain valid exercise object',
  }),

  /** Workout object schema */
  isValidWorkout: (): Assertion => ({
    type: 'schema',
    path: 'data',
    expected: {
      type: 'object',
      required: ['id', 'userId'],
      properties: {
        id: { type: 'string' },
        userId: { type: 'string' },
        exercises: { type: 'array' },
      },
    },
    message: 'Response should contain valid workout object',
  }),
};
