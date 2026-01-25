/**
 * GraphQL Query Limits
 *
 * Enforces hard limits on array returns to prevent complexity explosion.
 * Knuth principle: "Complexity must be tamed through measurement and limits"
 * Stroustrup principle: "What you don't use, you shouldn't pay for"
 */

// ============================================
// LIMIT CONSTANTS (Hard caps)
// ============================================

/**
 * Maximum items that can be returned in a single array field.
 * These are absolute limits that cannot be exceeded regardless of user input.
 */
export const ARRAY_LIMITS = {
  // Default for most lists
  DEFAULT: 50,

  // High-volume lists (paginated)
  WORKOUTS: 100,
  EXERCISES: 100,
  TRANSACTIONS: 100,
  MESSAGES: 100,

  // Medium-volume lists
  FEED_ITEMS: 50,
  LEADERBOARD: 50,
  ACHIEVEMENTS: 50,
  GOALS: 30,
  CONVERSATIONS: 50,

  // Low-volume lists (nested arrays)
  SETS_PER_WORKOUT: 50,
  EXERCISES_PER_WORKOUT: 20,
  PARTICIPANTS_PER_CONVERSATION: 20,
  EQUIPMENT_PER_VENUE: 30,
  PHOTOS_PER_VENUE: 20,

  // Very low-volume (nested arrays that multiply complexity)
  MUSCLE_ACTIVATIONS: 15,
  INGREDIENTS: 30,
  INSTRUCTIONS: 20,

  // Aggregations (expensive queries)
  LEADERBOARD_TOP: 100,
  SEARCH_RESULTS: 50,
  SUGGESTIONS: 10,
} as const;

// ============================================
// LIMIT ENFORCEMENT
// ============================================

/**
 * Enforce a hard limit on a requested count.
 * Always returns the smaller of the requested value and the hard limit.
 *
 * @param requested - The limit requested by the client
 * @param hardLimit - The maximum allowed limit
 * @param defaultValue - Value to use if no limit requested
 * @returns The enforced limit
 */
export function enforceLimit(
  requested: number | undefined | null,
  hardLimit: number,
  defaultValue: number = hardLimit
): number {
  const value = requested ?? defaultValue;
  return Math.min(Math.max(1, value), hardLimit);
}

/**
 * Truncate an array to a maximum length.
 * Use for arrays that don't have explicit limit arguments.
 *
 * @param array - The array to truncate
 * @param maxLength - Maximum allowed length
 * @returns The truncated array
 */
export function truncateArray<T>(array: T[], maxLength: number): T[] {
  if (array.length <= maxLength) {
    return array;
  }
  return array.slice(0, maxLength);
}

/**
 * Type-safe limit enforcement for query arguments.
 * Returns a function that extracts and enforces the limit.
 *
 * @param args - Query arguments object
 * @param limitKey - Key of the limit argument
 * @param hardLimit - Maximum allowed value
 * @param defaultValue - Default if not specified
 */
export function getLimitFromArgs<T extends Record<string, unknown>>(
  args: T,
  limitKey: keyof T = 'limit' as keyof T,
  hardLimit: number = ARRAY_LIMITS.DEFAULT,
  defaultValue: number = 20
): number {
  const requested = args[limitKey] as number | undefined;
  return enforceLimit(requested, hardLimit, defaultValue);
}

// ============================================
// PAGINATION UTILITIES
// ============================================

/**
 * Standard pagination arguments with enforced limits.
 */
export interface PaginationArgs {
  limit?: number;
  offset?: number;
  cursor?: string;
  after?: string;
  before?: string;
  first?: number;
  last?: number;
}

/**
 * Extract and enforce pagination parameters.
 * Supports both offset and cursor-based pagination.
 *
 * @param args - Pagination arguments
 * @param hardLimit - Maximum items per page
 * @param defaultLimit - Default items per page
 */
export function enforcePagination(
  args: PaginationArgs,
  hardLimit: number = ARRAY_LIMITS.DEFAULT,
  defaultLimit: number = 20
): { limit: number; offset: number; cursor?: string } {
  // Prefer cursor-based pagination
  const cursor = args.cursor || args.after;

  // Determine limit from first/last/limit
  const requestedLimit = args.first ?? args.last ?? args.limit;
  const limit = enforceLimit(requestedLimit, hardLimit, defaultLimit);

  // IMPORTANT: Offset pagination is discouraged but still supported
  // with a hard limit to prevent O(n) scans
  const offset = Math.min(args.offset ?? 0, 10000); // Cap offset at 10k

  return { limit, offset, cursor };
}

// ============================================
// COMPLEXITY HELPERS
// ============================================

/**
 * Calculate the complexity contribution of a list field.
 * Used to pre-calculate complexity before executing queries.
 *
 * @param requestedLimit - The limit requested by the client
 * @param defaultLimit - Default limit if none specified
 * @param itemComplexity - Complexity per item in the list
 * @returns Total complexity for this list field
 */
export function calculateListComplexity(
  requestedLimit: number | undefined,
  defaultLimit: number,
  itemComplexity: number = 1
): number {
  const limit = Math.min(requestedLimit ?? defaultLimit, ARRAY_LIMITS.DEFAULT);
  return limit * itemComplexity;
}

// ============================================
// RESPONSE METADATA
// ============================================

/**
 * Standard page info for cursor-based pagination.
 */
export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
  totalCount?: number;
}

/**
 * Create PageInfo from a result set.
 *
 * @param items - The items returned
 * @param limit - The limit used in the query
 * @param cursor - The cursor used (if any)
 * @param getCursor - Function to extract cursor from an item
 */
export function createPageInfo<T>(
  items: T[],
  limit: number,
  cursor?: string,
  getCursor?: (item: T) => string
): PageInfo {
  const hasNextPage = items.length >= limit;
  const hasPreviousPage = !!cursor;

  const startCursor = items.length > 0 && getCursor ? getCursor(items[0]) : undefined;
  const endCursor =
    items.length > 0 && getCursor ? getCursor(items[items.length - 1]) : undefined;

  return {
    hasNextPage,
    hasPreviousPage,
    startCursor,
    endCursor,
  };
}
