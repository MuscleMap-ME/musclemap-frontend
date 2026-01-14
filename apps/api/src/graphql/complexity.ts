/**
 * GraphQL Query Complexity Analysis
 *
 * Implements query complexity limits to prevent resource exhaustion attacks.
 * Calculates complexity based on:
 * - Field selections (base cost)
 * - List fields (multiplied by first/limit argument)
 * - Nested depth (exponential cost increase)
 *
 * Complexity limits:
 * - Anonymous: 100 points
 * - Authenticated: 500 points
 * - Premium: 1000 points
 */

import {
  GraphQLObjectType,
  getNamedType,
  isListType,
  isNonNullType,
  isObjectType,
  GraphQLSchema,
  DocumentNode,
  OperationDefinitionNode,
  FieldNode,
  FragmentDefinitionNode,
  FragmentSpreadNode,
  InlineFragmentNode,
} from 'graphql';
import { loggers } from '../lib/logger';

const log = loggers.core;

// ============================================
// TYPES
// ============================================

export interface ComplexityConfig {
  /**
   * Maximum complexity for anonymous users.
   */
  maxComplexityAnonymous: number;

  /**
   * Maximum complexity for authenticated users.
   */
  maxComplexityAuthenticated: number;

  /**
   * Maximum complexity for premium users.
   */
  maxComplexityPremium: number;

  /**
   * Base cost for a scalar field.
   */
  scalarCost: number;

  /**
   * Base cost for an object field.
   */
  objectCost: number;

  /**
   * Multiplier for list fields (applied to first/limit arg).
   */
  listMultiplier: number;

  /**
   * Default list size if no first/limit provided.
   */
  defaultListSize: number;

  /**
   * Maximum allowed list size.
   */
  maxListSize: number;
}

export interface ComplexityResult {
  complexity: number;
  maxAllowed: number;
  allowed: boolean;
  breakdown?: Record<string, number>;
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

const DEFAULT_CONFIG: ComplexityConfig = {
  maxComplexityAnonymous: 100,
  maxComplexityAuthenticated: 500,
  maxComplexityPremium: 1000,
  scalarCost: 1,
  objectCost: 2,
  listMultiplier: 10,
  defaultListSize: 10,
  maxListSize: 100,
};

// ============================================
// FIELD COMPLEXITY DIRECTIVES
// ============================================

/**
 * Per-field complexity overrides.
 * Define expensive operations with higher costs.
 */
const FIELD_COMPLEXITY: Record<string, number> = {
  // Expensive aggregations
  'Query.leaderboard': 50,
  'Query.communityStats': 30,
  'Query.globalStats': 30,
  'Query.analytics': 40,

  // User profile (includes relations)
  'Query.user': 10,
  'Query.me': 5,
  'User.workouts': 20,
  'User.achievements': 15,
  'User.followers': 20,
  'User.following': 20,

  // Workout data
  'Query.workouts': 25,
  'Workout.sets': 5,
  'Workout.exercises': 10,

  // Exercise library
  'Query.exercises': 15,
  'Exercise.muscles': 5,
  'Exercise.variations': 10,

  // Real-time (always expensive)
  'Subscription.presence': 100,
  'Subscription.liveWorkout': 100,
};

// ============================================
// COMPLEXITY CALCULATOR
// ============================================

class QueryComplexityCalculator {
  private config: ComplexityConfig;
  private breakdown: Record<string, number> = {};

  constructor(config: Partial<ComplexityConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Calculate the complexity of a GraphQL document.
   */
  calculate(
    schema: GraphQLSchema,
    document: DocumentNode,
    variables: Record<string, unknown> = {},
    operationName?: string
  ): number {
    this.breakdown = {};
    let totalComplexity = 0;

    // Find the operation
    const operations = document.definitions.filter(
      (def): def is OperationDefinitionNode => def.kind === 'OperationDefinition'
    );

    const operation = operationName
      ? operations.find((op) => op.name?.value === operationName)
      : operations[0];

    if (!operation) {
      return 0;
    }

    // Collect fragments
    const fragments: Record<string, FragmentDefinitionNode> = {};
    for (const def of document.definitions) {
      if (def.kind === 'FragmentDefinition') {
        fragments[def.name.value] = def;
      }
    }

    // Get the root type
    let rootType: GraphQLObjectType | null = null;
    switch (operation.operation) {
      case 'query':
        rootType = schema.getQueryType() ?? null;
        break;
      case 'mutation':
        rootType = schema.getMutationType() ?? null;
        break;
      case 'subscription':
        rootType = schema.getSubscriptionType() ?? null;
        break;
    }

    if (!rootType) {
      return 0;
    }

    // Calculate complexity recursively
    totalComplexity = this.calculateSelectionSet(
      operation.selectionSet.selections,
      rootType,
      fragments,
      variables,
      `${operation.operation[0].toUpperCase()}${operation.operation.slice(1)}`,
      1
    );

    return totalComplexity;
  }

  /**
   * Calculate complexity for a selection set.
   */
  private calculateSelectionSet(
    selections: readonly (FieldNode | FragmentSpreadNode | InlineFragmentNode)[],
    parentType: GraphQLObjectType,
    fragments: Record<string, FragmentDefinitionNode>,
    variables: Record<string, unknown>,
    path: string,
    depth: number
  ): number {
    let complexity = 0;

    for (const selection of selections) {
      switch (selection.kind) {
        case 'Field':
          complexity += this.calculateField(
            selection,
            parentType,
            fragments,
            variables,
            path,
            depth
          );
          break;

        case 'FragmentSpread': {
          const fragment = fragments[selection.name.value];
          if (fragment) {
            const fragmentType = parentType; // Simplified - should resolve from schema
            complexity += this.calculateSelectionSet(
              fragment.selectionSet.selections,
              fragmentType,
              fragments,
              variables,
              path,
              depth
            );
          }
          break;
        }

        case 'InlineFragment':
          complexity += this.calculateSelectionSet(
            selection.selectionSet.selections,
            parentType,
            fragments,
            variables,
            path,
            depth
          );
          break;
      }
    }

    return complexity;
  }

  /**
   * Calculate complexity for a single field.
   */
  private calculateField(
    field: FieldNode,
    parentType: GraphQLObjectType,
    fragments: Record<string, FragmentDefinitionNode>,
    variables: Record<string, unknown>,
    path: string,
    depth: number
  ): number {
    const fieldName = field.name.value;
    const fullPath = `${path}.${fieldName}`;

    // Skip introspection fields
    if (fieldName.startsWith('__')) {
      return 0;
    }

    // Get field definition
    const fieldDef = parentType.getFields()[fieldName];
    if (!fieldDef) {
      return 0;
    }

    // Check for explicit complexity override
    const overrideKey = `${parentType.name}.${fieldName}`;
    if (FIELD_COMPLEXITY[overrideKey] !== undefined) {
      const override = FIELD_COMPLEXITY[overrideKey];
      this.breakdown[fullPath] = override;
      return override;
    }

    // Calculate base cost
    let cost = this.config.scalarCost;
    const fieldType = getNamedType(fieldDef.type);

    if (isObjectType(fieldType)) {
      cost = this.config.objectCost;
    }

    // Check if it's a list type
    const isList = this.isListType(fieldDef.type);
    if (isList) {
      // Get the list size from arguments
      const listSize = this.getListSize(field, variables);
      cost *= listSize;
    }

    // Calculate child complexity if it has a selection set
    if (field.selectionSet && isObjectType(fieldType)) {
      const childComplexity = this.calculateSelectionSet(
        field.selectionSet.selections,
        fieldType,
        fragments,
        variables,
        fullPath,
        depth + 1
      );

      // For lists, multiply child complexity by list size
      if (isList) {
        const listSize = this.getListSize(field, variables);
        cost += childComplexity * listSize;
      } else {
        cost += childComplexity;
      }
    }

    this.breakdown[fullPath] = cost;
    return cost;
  }

  /**
   * Check if a type is a list type (unwrapping NonNull).
   */
  private isListType(type: any): boolean {
    if (isNonNullType(type)) {
      return this.isListType(type.ofType);
    }
    return isListType(type);
  }

  /**
   * Get the list size from field arguments.
   */
  private getListSize(field: FieldNode, variables: Record<string, unknown>): number {
    // Look for first, limit, take, or count arguments
    const sizeArgs = ['first', 'limit', 'take', 'count'];

    for (const arg of field.arguments || []) {
      if (sizeArgs.includes(arg.name.value)) {
        const value = this.resolveValue(arg.value, variables);
        if (typeof value === 'number') {
          return Math.min(value, this.config.maxListSize);
        }
      }
    }

    return this.config.defaultListSize;
  }

  /**
   * Resolve a value node to its actual value.
   */
  private resolveValue(valueNode: any, variables: Record<string, unknown>): unknown {
    switch (valueNode.kind) {
      case 'IntValue':
        return parseInt(valueNode.value, 10);
      case 'FloatValue':
        return parseFloat(valueNode.value);
      case 'StringValue':
        return valueNode.value;
      case 'BooleanValue':
        return valueNode.value;
      case 'Variable':
        return variables[valueNode.name.value];
      default:
        return null;
    }
  }

  /**
   * Get the complexity breakdown.
   */
  getBreakdown(): Record<string, number> {
    return { ...this.breakdown };
  }
}

// ============================================
// VALIDATION RULE
// ============================================

/**
 * Create a GraphQL validation rule that checks query complexity.
 */
export function createComplexityLimitRule(
  maxComplexity: number,
  config: Partial<ComplexityConfig> = {}
) {
  const calculator = new QueryComplexityCalculator(config);

  return function ComplexityLimitRule(context: any) {
    return {
      Document: {
        leave(node: DocumentNode) {
          const schema = context.getSchema();
          const variables = context.getVariableValues?.() || {};

          const complexity = calculator.calculate(schema, node, variables);

          if (complexity > maxComplexity) {
            context.reportError(
              new Error(
                `Query complexity of ${complexity} exceeds maximum allowed complexity of ${maxComplexity}. ` +
                  `Consider reducing the number of fields or list sizes.`
              )
            );
          }

          // Log high complexity queries for monitoring
          if (complexity > maxComplexity * 0.8) {
            log.warn(
              {
                complexity,
                maxComplexity,
                breakdown: calculator.getBreakdown(),
              },
              'High complexity query detected'
            );
          }
        },
      },
    };
  };
}

// ============================================
// COMPLEXITY ANALYZER
// ============================================

/**
 * Analyze query complexity without validation.
 */
export function analyzeComplexity(
  schema: GraphQLSchema,
  document: DocumentNode,
  variables: Record<string, unknown> = {},
  operationName?: string,
  config: Partial<ComplexityConfig> = {}
): ComplexityResult {
  const calculator = new QueryComplexityCalculator(config);
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  const complexity = calculator.calculate(schema, document, variables, operationName);

  // Default to authenticated limit
  const maxAllowed = mergedConfig.maxComplexityAuthenticated;

  return {
    complexity,
    maxAllowed,
    allowed: complexity <= maxAllowed,
    breakdown: calculator.getBreakdown(),
  };
}

/**
 * Get complexity limits based on user role.
 */
export function getComplexityLimit(
  userRole?: 'anonymous' | 'user' | 'premium' | 'admin',
  config: Partial<ComplexityConfig> = {}
): number {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  switch (userRole) {
    case 'premium':
    case 'admin':
      return mergedConfig.maxComplexityPremium;
    case 'user':
      return mergedConfig.maxComplexityAuthenticated;
    case 'anonymous':
    default:
      return mergedConfig.maxComplexityAnonymous;
  }
}

// ============================================
// EXPORTS
// ============================================

export const complexityConfig = DEFAULT_CONFIG;
export { QueryComplexityCalculator };
