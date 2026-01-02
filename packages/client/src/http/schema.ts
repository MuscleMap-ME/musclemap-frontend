/**
 * Schema Validation System
 *
 * Custom TypeScript-like runtime validation for API responses.
 * Supports: String, Number, Boolean, Null, Any, Union, Array, Object
 */

const RESPONSE_VALIDATION_ERROR = 'Response validation failed';

// Schema types
export interface BaseSchema {
  kind: string;
  optional?: boolean;
  default?: unknown;
}

export interface StringSchema extends BaseSchema {
  kind: 'string';
}

export interface NumberSchema extends BaseSchema {
  kind: 'number';
}

export interface BooleanSchema extends BaseSchema {
  kind: 'boolean';
}

export interface NullSchema extends BaseSchema {
  kind: 'null';
}

export interface AnySchema extends BaseSchema {
  kind: 'any';
}

export interface UnionSchema extends BaseSchema {
  kind: 'union';
  anyOf: Schema[];
}

export interface ArraySchema extends BaseSchema {
  kind: 'array';
  items: Schema;
}

export interface ObjectSchema extends BaseSchema {
  kind: 'object';
  properties?: Record<string, Schema>;
  additionalProperties?: boolean;
}

export interface RecordSchema extends BaseSchema {
  kind: 'record';
  keySchema: Schema;
  valueSchema: Schema;
}

export type Schema =
  | StringSchema
  | NumberSchema
  | BooleanSchema
  | NullSchema
  | AnySchema
  | UnionSchema
  | ArraySchema
  | ObjectSchema
  | RecordSchema;

// External schema interface (zod-like)
export interface ExternalSchema<T = unknown> {
  parse?: (data: unknown) => T;
  safeParse?: (data: unknown) => { success: boolean; data?: T; error?: unknown };
}

export type AnyValidationSchema = Schema | ExternalSchema;

function withDefault<T>(schema: Schema, value: T): T {
  if ((value === undefined || value === null) && 'default' in schema) {
    return schema.default as T;
  }
  return value;
}

function validateType(schema: Schema, value: unknown): unknown {
  const normalized = withDefault(schema, value);

  if (normalized === undefined || normalized === null) {
    if (schema.optional) return normalized;
    if ('default' in schema) return schema.default;
  }

  switch (schema.kind) {
    case 'string':
      if (typeof normalized === 'string') return normalized;
      break;
    case 'number':
      if (typeof normalized === 'number' && Number.isFinite(normalized)) return normalized;
      break;
    case 'boolean':
      if (typeof normalized === 'boolean') return normalized;
      break;
    case 'null':
      if (normalized === null) return normalized;
      break;
    case 'any':
      return normalized;
    case 'union': {
      for (const option of schema.anyOf) {
        try {
          return validateType(option, normalized);
        } catch {
          // Try the next option
        }
      }
      break;
    }
    case 'array': {
      const target = (normalized ?? schema.default) as unknown[];
      if (Array.isArray(target)) {
        return target.map((item) => validateType(schema.items, item));
      }
      break;
    }
    case 'object': {
      const source = (normalized ?? schema.default) as Record<string, unknown>;
      if (source && typeof source === 'object' && !Array.isArray(source)) {
        const entries = Object.entries(schema.properties ?? {});
        const result: Record<string, unknown> = {};

        for (const [key, propSchema] of entries) {
          if (!(key in source)) {
            if ('default' in propSchema) {
              result[key] = propSchema.default;
            } else if (!propSchema.optional) {
              throw new Error(RESPONSE_VALIDATION_ERROR);
            }
            continue;
          }
          result[key] = validateType(propSchema, source[key]);
        }

        if (schema.additionalProperties !== false) {
          for (const [key, val] of Object.entries(source)) {
            if (!schema.properties || !(key in schema.properties)) {
              result[key] = val;
            }
          }
        }

        return result;
      }
      break;
    }
    case 'record': {
      const source = (normalized ?? schema.default) as Record<string, unknown>;
      if (source && typeof source === 'object' && !Array.isArray(source)) {
        const result: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(source)) {
          // Validate key if needed (usually string)
          validateType(schema.keySchema, key);
          // Validate value
          result[key] = validateType(schema.valueSchema, val);
        }
        return result;
      }
      break;
    }
    default:
      return normalized;
  }

  throw new Error(RESPONSE_VALIDATION_ERROR);
}

function createType<T extends Schema>(kind: T['kind'], options: Omit<T, 'kind'> = {} as Omit<T, 'kind'>): T {
  return { kind, ...options } as T;
}

/**
 * Type builder for schema definitions
 */
export const Type = {
  String: (options: Partial<Omit<StringSchema, 'kind'>> = {}): StringSchema =>
    createType('string', options),

  Number: (options: Partial<Omit<NumberSchema, 'kind'>> = {}): NumberSchema =>
    createType('number', options),

  Boolean: (options: Partial<Omit<BooleanSchema, 'kind'>> = {}): BooleanSchema =>
    createType('boolean', options),

  Null: (): NullSchema => createType('null', {}),

  Any: (): AnySchema => createType('any', {}),

  Optional: <T extends Schema>(schema: T): T & { optional: true } => ({
    ...schema,
    optional: true as const,
  }),

  Union: (schemas: Schema[]): UnionSchema => createType('union', { anyOf: schemas }),

  Array: (itemSchema: Schema, options: { default?: unknown[] } = {}): ArraySchema =>
    createType('array', { items: itemSchema, default: options.default }),

  Object: (
    properties: Record<string, Schema>,
    options: { default?: Record<string, unknown>; additionalProperties?: boolean } = {}
  ): ObjectSchema =>
    createType('object', {
      properties,
      default: options.default,
      additionalProperties: options.additionalProperties ?? true,
    }),

  Record: (
    keySchema: Schema,
    valueSchema: Schema,
    options: { default?: Record<string, unknown> } = {}
  ): RecordSchema =>
    createType('record', {
      keySchema,
      valueSchema,
      default: options.default,
    }),
};

/**
 * Check if a value is our internal validation schema
 */
export function isValidationSchema(schema: unknown): schema is Schema {
  return Boolean(schema && typeof schema === 'object' && 'kind' in schema);
}

/**
 * Parse data against a schema, throwing on validation failure
 */
export function parseWithSchema<T>(schema: Schema, data: unknown): T {
  return validateType(schema, data) as T;
}

/**
 * Apply schema validation (supports internal schemas and external zod-like schemas)
 */
export function applySchema<T>(schema: AnyValidationSchema | undefined, data: unknown): T {
  if (!schema) return data as T;

  // External schema with parse method (zod-like)
  if ('parse' in schema && typeof schema.parse === 'function') {
    return schema.parse(data) as T;
  }

  // External schema with safeParse method (zod-like)
  if ('safeParse' in schema && typeof schema.safeParse === 'function') {
    const result = schema.safeParse(data);
    if (result.success) return result.data as T;
    throw new Error(RESPONSE_VALIDATION_ERROR);
  }

  // Internal validation schema
  if (isValidationSchema(schema)) {
    return parseWithSchema<T>(schema, data);
  }

  return data as T;
}
