/**
 * Result Pattern - Type-safe error handling
 *
 * Use Result<T, E> instead of throwing exceptions for expected failures.
 * This forces callers to handle both success and error cases explicitly.
 *
 * See: docs/CODING-STYLE-GUIDE.md Section 7.2
 *
 * @example
 * ```typescript
 * // Returning results from functions
 * function parseNumber(str: string): Result<number, ParseError> {
 *   const num = parseInt(str, 10);
 *   if (isNaN(num)) {
 *     return err(new ParseError(`Invalid number: ${str}`));
 *   }
 *   return ok(num);
 * }
 *
 * // Using results
 * const result = parseNumber(input);
 * if (!result.success) {
 *   console.error(result.error.message);
 *   return;
 * }
 * console.log(result.data); // Type is `number`
 *
 * // Mapping results
 * const doubled = mapResult(parseNumber(input), n => n * 2);
 *
 * // Async results
 * async function fetchUser(id: string): AsyncResult<User, NotFoundError> {
 *   const user = await db.findUser(id);
 *   if (!user) return err(new NotFoundError('User'));
 *   return ok(user);
 * }
 * ```
 */

/**
 * Success result type
 */
export interface Success<T> {
  readonly success: true;
  readonly data: T;
}

/**
 * Failure result type
 */
export interface Failure<E> {
  readonly success: false;
  readonly error: E;
}

/**
 * Result type - either success with data or failure with error
 */
export type Result<T, E = Error> = Success<T> | Failure<E>;

/**
 * Async result type - Promise that resolves to a Result
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Create a success result
 *
 * @example
 * ```typescript
 * return ok(user);
 * return ok({ id: '123', name: 'John' });
 * ```
 */
export function ok<T>(data: T): Success<T> {
  return { success: true, data };
}

/**
 * Create a failure result
 *
 * @example
 * ```typescript
 * return err(new NotFoundError('User'));
 * return err({ code: 'INVALID_INPUT', message: 'Email is required' });
 * ```
 */
export function err<E>(error: E): Failure<E> {
  return { success: false, error };
}

/**
 * Check if a result is successful
 *
 * @example
 * ```typescript
 * if (isOk(result)) {
 *   console.log(result.data); // Type narrowed to Success<T>
 * }
 * ```
 */
export function isOk<T, E>(result: Result<T, E>): result is Success<T> {
  return result.success === true;
}

/**
 * Check if a result is a failure
 *
 * @example
 * ```typescript
 * if (isErr(result)) {
 *   console.error(result.error); // Type narrowed to Failure<E>
 * }
 * ```
 */
export function isErr<T, E>(result: Result<T, E>): result is Failure<E> {
  return result.success === false;
}

/**
 * Map the success value of a result
 *
 * @example
 * ```typescript
 * const result = ok(5);
 * const doubled = mapResult(result, n => n * 2); // ok(10)
 *
 * const errResult = err(new Error('oops'));
 * const mapped = mapResult(errResult, n => n * 2); // err(Error('oops'))
 * ```
 */
export function mapResult<T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => U
): Result<U, E> {
  if (result.success) {
    return ok(fn(result.data));
  }
  return result;
}

/**
 * Map the error value of a result
 *
 * @example
 * ```typescript
 * const result = err('not found');
 * const mapped = mapError(result, e => new NotFoundError(e));
 * ```
 */
export function mapError<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> {
  if (result.success) {
    return result;
  }
  return err(fn(result.error));
}

/**
 * FlatMap (bind) the success value of a result
 *
 * @example
 * ```typescript
 * const parseAndDouble = (str: string) =>
 *   flatMapResult(parseNumber(str), n => ok(n * 2));
 * ```
 */
export function flatMapResult<T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => Result<U, E>
): Result<U, E> {
  if (result.success) {
    return fn(result.data);
  }
  return result;
}

/**
 * Unwrap a result, throwing the error if it's a failure
 *
 * @example
 * ```typescript
 * const value = unwrap(result); // Throws if failure
 * ```
 */
export function unwrap<T, E extends Error>(result: Result<T, E>): T {
  if (result.success) {
    return result.data;
  }
  throw result.error;
}

/**
 * Unwrap a result with a default value if it's a failure
 *
 * @example
 * ```typescript
 * const value = unwrapOr(result, defaultValue);
 * ```
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  if (result.success) {
    return result.data;
  }
  return defaultValue;
}

/**
 * Try executing a function and return a Result
 *
 * @example
 * ```typescript
 * const result = trySync(() => JSON.parse(jsonString));
 * ```
 */
export function trySync<T>(fn: () => T): Result<T, Error> {
  try {
    return ok(fn());
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Try executing an async function and return a Result
 *
 * @example
 * ```typescript
 * const result = await tryAsync(() => fetch('/api/data').then(r => r.json()));
 * ```
 */
export async function tryAsync<T>(fn: () => Promise<T>): AsyncResult<T, Error> {
  try {
    const data = await fn();
    return ok(data);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Combine multiple results into a single result
 * Returns the first error encountered, or all successes
 *
 * @example
 * ```typescript
 * const results = await Promise.all([
 *   fetchUser(id1),
 *   fetchUser(id2),
 *   fetchUser(id3),
 * ]);
 * const combined = combineResults(results);
 * if (combined.success) {
 *   console.log(combined.data); // [user1, user2, user3]
 * }
 * ```
 */
export function combineResults<T, E>(results: Result<T, E>[]): Result<T[], E> {
  const data: T[] = [];
  for (const result of results) {
    if (!result.success) {
      return result;
    }
    data.push(result.data);
  }
  return ok(data);
}

/**
 * Match on a result and return a value based on success/failure
 *
 * @example
 * ```typescript
 * const message = matchResult(result, {
 *   ok: (user) => `Hello, ${user.name}!`,
 *   err: (error) => `Error: ${error.message}`,
 * });
 * ```
 */
export function matchResult<T, E, U>(
  result: Result<T, E>,
  handlers: {
    ok: (data: T) => U;
    err: (error: E) => U;
  }
): U {
  if (result.success) {
    return handlers.ok(result.data);
  }
  return handlers.err(result.error);
}
