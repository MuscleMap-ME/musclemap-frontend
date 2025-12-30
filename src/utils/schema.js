const RESPONSE_VALIDATION_ERROR = 'Response validation failed';

const withDefault = (schema, value) => {
  if ((value === undefined || value === null) && 'default' in schema) {
    return schema.default;
  }
  return value;
};

const validateType = (schema, value) => {
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
      const target = normalized ?? schema.default;
      if (Array.isArray(target)) return target.map((item) => validateType(schema.items, item));
      break;
    }
    case 'object': {
      const source = normalized ?? schema.default;
      if (source && typeof source === 'object' && !Array.isArray(source)) {
        const entries = Object.entries(schema.properties ?? {});
        const result = {};

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
          for (const [key, value] of Object.entries(source)) {
            if (!schema.properties || !(key in schema.properties)) {
              result[key] = value;
            }
          }
        }

        return result;
      }
      break;
    }
    default:
      return normalized;
  }

  throw new Error(RESPONSE_VALIDATION_ERROR);
};

const createType = (kind, options = {}) => ({ kind, ...options });

export const Type = {
  String: (options = {}) => createType('string', options),
  Number: (options = {}) => createType('number', options),
  Boolean: (options = {}) => createType('boolean', options),
  Null: () => createType('null'),
  Any: () => createType('any'),
  Optional: (schema) => ({ ...schema, optional: true }),
  Union: (schemas) => createType('union', { anyOf: schemas }),
  Array: (itemSchema, options = {}) => createType('array', { items: itemSchema, default: options.default }),
  Object: (properties, options = {}) => createType('object', {
    properties,
    default: options.default,
    additionalProperties: options.additionalProperties ?? true,
  }),
};

export const isValidationSchema = (schema) => Boolean(schema && typeof schema === 'object' && 'kind' in schema);

export const parseWithSchema = (schema, data) => validateType(schema, data);
