/**
 * GraphQL Schema Builder
 *
 * Merges core schema with plugin schemas via schema stitching.
 * Validates for conflicts and provides type-safe schema composition.
 */

// Stub types until GraphQL is enabled
// import type {
//   GraphQLSchemaExtension,
//   GraphQLPluginRegistration,
//   Resolvers,
// } from '@musclemap/plugin-sdk';

type GraphQLSchemaExtension = {
  typeDefs?: string;
  resolvers?: Record<string, any>;
};

type GraphQLPluginRegistration = {
  pluginId: string;
  schema: GraphQLSchemaExtension;
  priority?: number;
};

type Resolvers = Record<string, any>;

// ============================================
// SCHEMA REGISTRY
// ============================================

interface RegisteredExtension {
  pluginId: string;
  extension: GraphQLSchemaExtension;
  priority: number;
}

interface SchemaConflict {
  type: 'type' | 'field' | 'directive';
  name: string;
  conflictingPlugins: string[];
  resolution: 'first-wins' | 'merge' | 'error';
}

/**
 * Registry for GraphQL schema extensions from plugins.
 */
export class SchemaRegistry {
  private extensions: RegisteredExtension[] = [];
  private conflicts: SchemaConflict[] = [];
  private sealed = false;

  /**
   * Register a plugin's GraphQL schema extension.
   */
  register(
    pluginId: string,
    registration: GraphQLPluginRegistration,
    priority = 0
  ): void {
    if (this.sealed) {
      throw new Error('Schema registry is sealed. Cannot register new extensions.');
    }

    if (!registration.schema) {
      return;
    }

    // Check for conflicts with existing extensions
    this.checkConflicts(pluginId, registration.schema);

    this.extensions.push({
      pluginId,
      extension: registration.schema,
      priority,
    });

    // Sort by priority (higher = later = wins conflicts)
    this.extensions.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Check for schema conflicts.
   */
  private checkConflicts(pluginId: string, extension: GraphQLSchemaExtension): void {
    const newTypes = this.extractTypeNames(extension.typeDefs);
    const newFields = this.extractFieldExtensions(extension.typeDefs);

    for (const existing of this.extensions) {
      const existingTypes = this.extractTypeNames(existing.extension.typeDefs);
      const existingFields = this.extractFieldExtensions(existing.extension.typeDefs);

      // Check for type conflicts (non-extension)
      for (const type of newTypes) {
        if (existingTypes.has(type) && !type.startsWith('extend ')) {
          this.conflicts.push({
            type: 'type',
            name: type,
            conflictingPlugins: [existing.pluginId, pluginId],
            resolution: 'error',
          });
        }
      }

      // Check for field conflicts in extensions
      for (const [typeName, fields] of newFields) {
        const existingFieldSet = existingFields.get(typeName);
        if (existingFieldSet) {
          for (const field of fields) {
            if (existingFieldSet.has(field)) {
              this.conflicts.push({
                type: 'field',
                name: `${typeName}.${field}`,
                conflictingPlugins: [existing.pluginId, pluginId],
                resolution: 'first-wins',
              });
            }
          }
        }
      }
    }
  }

  /**
   * Extract type names from SDL.
   */
  private extractTypeNames(typeDefs: string): Set<string> {
    const types = new Set<string>();
    const typeRegex = /(?:type|input|interface|union|enum|scalar)\s+(\w+)/g;
    let match;
    while ((match = typeRegex.exec(typeDefs)) !== null) {
      types.add(match[1]);
    }
    return types;
  }

  /**
   * Extract field extensions from SDL.
   */
  private extractFieldExtensions(typeDefs: string): Map<string, Set<string>> {
    const extensions = new Map<string, Set<string>>();
    const extendRegex = /extend\s+type\s+(\w+)\s*\{([^}]+)\}/g;
    const fieldRegex = /(\w+)\s*[:(]/g;

    let match;
    while ((match = extendRegex.exec(typeDefs)) !== null) {
      const typeName = match[1];
      const body = match[2];
      const fields = new Set<string>();

      let fieldMatch;
      while ((fieldMatch = fieldRegex.exec(body)) !== null) {
        fields.add(fieldMatch[1]);
      }

      extensions.set(typeName, fields);
    }

    return extensions;
  }

  /**
   * Get all conflicts detected during registration.
   */
  getConflicts(): SchemaConflict[] {
    return [...this.conflicts];
  }

  /**
   * Check if there are any error-level conflicts.
   */
  hasErrors(): boolean {
    return this.conflicts.some((c) => c.resolution === 'error');
  }

  /**
   * Seal the registry and prevent further registrations.
   */
  seal(): void {
    this.sealed = true;
  }

  /**
   * Get all registered extensions.
   */
  getExtensions(): RegisteredExtension[] {
    return [...this.extensions];
  }

  /**
   * Build the merged type definitions.
   */
  buildTypeDefs(): string {
    return this.extensions.map((e) => e.extension.typeDefs).join('\n\n');
  }

  /**
   * Build the merged resolvers.
   */
  buildResolvers(): Resolvers {
    const merged: Resolvers = {};

    for (const { extension } of this.extensions) {
      this.deepMergeResolvers(merged, extension.resolvers);
    }

    return merged;
  }

  /**
   * Deep merge resolver objects.
   */
  private deepMergeResolvers(target: Resolvers, source: Resolvers): void {
    for (const [typeName, typeResolvers] of Object.entries(source)) {
      if (!typeResolvers) continue;

      if (!target[typeName]) {
        target[typeName] = {};
      }

      for (const [fieldName, resolver] of Object.entries(typeResolvers)) {
        // Later registrations override earlier ones (priority-based)
        (target[typeName] as Record<string, unknown>)[fieldName] = resolver;
      }
    }
  }
}

// ============================================
// SCHEMA BUILDER
// ============================================

/**
 * Core MuscleMap GraphQL schema (to be extended by plugins).
 */
export const CORE_TYPE_DEFS = `#graphql
  # Scalars
  scalar DateTime
  scalar JSON

  # Base types
  type Query {
    _health: HealthCheck!
  }

  type Mutation {
    _noop: Boolean
  }

  type Subscription {
    _ping: String
  }

  type HealthCheck {
    status: String!
    timestamp: DateTime!
  }

  # Common types
  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  interface Node {
    id: ID!
  }

  # Error handling
  interface Error {
    message: String!
    code: String!
  }

  type ValidationError implements Error {
    message: String!
    code: String!
    field: String
  }

  # User types
  type User implements Node {
    id: ID!
    email: String!
    username: String!
    displayName: String
    avatarUrl: String
    roles: [String!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # Workout types
  type Workout implements Node {
    id: ID!
    userId: ID!
    user: User!
    exercises: [WorkoutExercise!]!
    totalTU: Float!
    completedAt: DateTime!
    createdAt: DateTime!
  }

  type WorkoutExercise {
    exerciseId: ID!
    exercise: Exercise!
    sets: [WorkoutSet!]!
  }

  type WorkoutSet {
    reps: Int!
    weight: Float
    duration: Int
  }

  type Exercise implements Node {
    id: ID!
    name: String!
    type: String!
    description: String
    muscleActivations: [MuscleActivation!]!
  }

  type MuscleActivation {
    muscleId: ID!
    muscle: Muscle!
    activation: Float!
  }

  type Muscle implements Node {
    id: ID!
    name: String!
    group: String!
    biasWeight: Float!
  }

  # Credit types
  type CreditBalance {
    balance: Int!
    lastUpdated: DateTime!
  }

  type CreditTransaction implements Node {
    id: ID!
    userId: ID!
    action: String!
    amount: Int!
    balanceBefore: Int!
    balanceAfter: Int!
    metadata: JSON
    createdAt: DateTime!
  }

  # Connection types for pagination
  type UserConnection {
    edges: [UserEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type UserEdge {
    node: User!
    cursor: String!
  }

  type WorkoutConnection {
    edges: [WorkoutEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type WorkoutEdge {
    node: Workout!
    cursor: String!
  }
`;

/**
 * Core resolvers.
 */
export const CORE_RESOLVERS: Resolvers = {
  Query: {
    _health: () => ({
      status: 'ok',
      timestamp: new Date(),
    }),
  },
  Mutation: {
    _noop: () => true,
  },
  Subscription: {
    _ping: {
      subscribe: async function* () {
        while (true) {
          await new Promise((r) => setTimeout(r, 30000));
          yield { _ping: 'pong' };
        }
      },
      resolve: (payload: { _ping: string }) => payload._ping,
    },
  },
  DateTime: {
    // Custom scalar implementation
    __serialize: (value: Date) => value.toISOString(),
    __parseValue: (value: string) => new Date(value),
    __parseLiteral: (ast: { kind: string; value: string }) => {
      if (ast.kind === 'StringValue') {
        return new Date(ast.value);
      }
      return null;
    },
  },
};

/**
 * Build the complete GraphQL schema from core + plugins.
 */
export function buildSchema(registry: SchemaRegistry): {
  typeDefs: string;
  resolvers: Resolvers;
  errors: SchemaConflict[];
} {
  // Check for errors
  const errors = registry.getConflicts().filter((c) => c.resolution === 'error');

  // Merge type definitions
  const typeDefs = [CORE_TYPE_DEFS, registry.buildTypeDefs()].join('\n\n');

  // Merge resolvers
  const resolvers: Resolvers = {};
  // Start with core resolvers
  for (const [typeName, typeResolvers] of Object.entries(CORE_RESOLVERS)) {
    resolvers[typeName] = { ...(typeResolvers as Record<string, any>) };
  }
  // Merge plugin resolvers
  const pluginResolvers = registry.buildResolvers();
  for (const [typeName, typeResolvers] of Object.entries(pluginResolvers)) {
    if (!typeResolvers) continue;
    if (!resolvers[typeName]) {
      resolvers[typeName] = {};
    }
    Object.assign(resolvers[typeName]!, typeResolvers);
  }

  return { typeDefs, resolvers, errors };
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let globalRegistry: SchemaRegistry | null = null;

/**
 * Get the global schema registry.
 */
export function getSchemaRegistry(): SchemaRegistry {
  if (!globalRegistry) {
    globalRegistry = new SchemaRegistry();
  }
  return globalRegistry;
}

/**
 * Reset the global schema registry (for testing).
 */
export function resetSchemaRegistry(): void {
  globalRegistry = null;
}
