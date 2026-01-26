/**
 * Circuit Breaker Pattern Implementation
 *
 * Provides resilience for external service calls by:
 * - Detecting failures and preventing cascading failures
 * - Allowing the system to recover gracefully
 * - Providing fallback behavior during outages
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit tripped, requests fail fast with fallback
 * - HALF_OPEN: Testing if service recovered, limited requests allowed
 *
 * Phase 7 of MASTER-IMPLEMENTATION-PLAN
 */

import { loggers } from './logger';

const log = loggers.api;

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  /** Name for logging and metrics */
  name: string;
  /** Number of failures before opening circuit (default: 5) */
  failureThreshold?: number;
  /** Number of successes in half-open before closing (default: 2) */
  successThreshold?: number;
  /** Time in ms to wait before transitioning from OPEN to HALF_OPEN (default: 30000) */
  resetTimeout?: number;
  /** Time window in ms to track failures (default: 60000) */
  failureWindow?: number;
  /** Optional fallback function when circuit is open */
  fallback?: <T>() => T | Promise<T>;
  /** Called when state changes */
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures: number[] = []; // Timestamps of recent failures
  private halfOpenSuccesses = 0;
  private lastStateChange = Date.now();
  private totalRequests = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;

  private readonly name: string;
  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly resetTimeout: number;
  private readonly failureWindow: number;
  private readonly fallback?: <T>() => T | Promise<T>;
  private readonly onStateChange?: (from: CircuitState, to: CircuitState) => void;

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.successThreshold = options.successThreshold ?? 2;
    this.resetTimeout = options.resetTimeout ?? 30000;
    this.failureWindow = options.failureWindow ?? 60000;
    this.fallback = options.fallback;
    this.onStateChange = options.onStateChange;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Clean up old failures outside the window
    const now = Date.now();
    this.failures = this.failures.filter(t => now - t < this.failureWindow);

    // Check if we should transition from OPEN to HALF_OPEN
    if (this.state === 'OPEN' && now - this.lastStateChange >= this.resetTimeout) {
      this.transitionTo('HALF_OPEN');
    }

    // If circuit is OPEN, fail fast
    if (this.state === 'OPEN') {
      log.warn({ circuit: this.name }, 'Circuit breaker OPEN - failing fast');
      if (this.fallback) {
        return this.fallback<T>();
      }
      throw new CircuitBreakerError(`Circuit breaker ${this.name} is OPEN`, this.name);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Execute with a fallback value if circuit is open or function fails
   */
  async executeWithFallback<T>(fn: () => Promise<T>, fallbackValue: T): Promise<T> {
    try {
      return await this.execute(fn);
    } catch (error) {
      if (error instanceof CircuitBreakerError) {
        return fallbackValue;
      }
      // For other errors, still return fallback but log the error
      log.warn({ circuit: this.name, error }, 'Circuit breaker caught error, using fallback');
      return fallbackValue;
    }
  }

  private onSuccess(): void {
    this.totalSuccesses++;

    if (this.state === 'HALF_OPEN') {
      this.halfOpenSuccesses++;
      if (this.halfOpenSuccesses >= this.successThreshold) {
        this.transitionTo('CLOSED');
      }
    }
  }

  private onFailure(error: unknown): void {
    this.totalFailures++;
    this.failures.push(Date.now());

    log.warn({ circuit: this.name, error, failureCount: this.failures.length }, 'Circuit breaker recorded failure');

    if (this.state === 'HALF_OPEN') {
      // Any failure in half-open immediately opens the circuit
      this.transitionTo('OPEN');
    } else if (this.state === 'CLOSED' && this.failures.length >= this.failureThreshold) {
      this.transitionTo('OPEN');
    }
  }

  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    if (oldState === newState) return;

    this.state = newState;
    this.lastStateChange = Date.now();

    if (newState === 'CLOSED') {
      this.failures = [];
      this.halfOpenSuccesses = 0;
    } else if (newState === 'HALF_OPEN') {
      this.halfOpenSuccesses = 0;
    }

    log.info({ circuit: this.name, from: oldState, to: newState }, 'Circuit breaker state change');

    if (this.onStateChange) {
      this.onStateChange(oldState, newState);
    }
  }

  /**
   * Get current circuit breaker stats
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures.length,
      successes: this.halfOpenSuccesses,
      lastFailureTime: this.failures.length > 0 ? this.failures[this.failures.length - 1] : null,
      lastSuccessTime: this.totalSuccesses > 0 ? Date.now() : null,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
    };
  }

  /**
   * Force the circuit to a specific state (for testing/admin)
   */
  forceState(state: CircuitState): void {
    log.warn({ circuit: this.name, state }, 'Circuit breaker state forced');
    this.transitionTo(state);
  }

  /**
   * Reset the circuit breaker to initial state
   */
  reset(): void {
    this.failures = [];
    this.halfOpenSuccesses = 0;
    this.transitionTo('CLOSED');
  }
}

/**
 * Error thrown when circuit breaker is open
 */
export class CircuitBreakerError extends Error {
  constructor(message: string, public readonly circuitName: string) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

// ============================================
// Pre-configured Circuit Breakers
// ============================================

/** Circuit breaker for database operations */
export const databaseCircuit = new CircuitBreaker({
  name: 'database',
  failureThreshold: 5,
  successThreshold: 2,
  resetTimeout: 30000, // 30 seconds
  failureWindow: 60000, // 1 minute
  onStateChange: (from, to) => {
    if (to === 'OPEN') {
      log.error({ from, to }, 'DATABASE CIRCUIT BREAKER OPENED - Database may be unavailable');
    }
  },
});

/** Circuit breaker for Redis operations */
export const redisCircuit = new CircuitBreaker({
  name: 'redis',
  failureThreshold: 3,
  successThreshold: 2,
  resetTimeout: 15000, // 15 seconds (faster recovery for cache)
  failureWindow: 30000, // 30 seconds
  onStateChange: (from, to) => {
    if (to === 'OPEN') {
      log.warn({ from, to }, 'Redis circuit breaker opened - falling back to in-memory cache');
    }
  },
});

/** Circuit breaker for external API calls */
export const externalApiCircuit = new CircuitBreaker({
  name: 'external-api',
  failureThreshold: 3,
  successThreshold: 2,
  resetTimeout: 60000, // 1 minute
  failureWindow: 120000, // 2 minutes
});

/** Circuit breaker for email/notification services */
export const notificationCircuit = new CircuitBreaker({
  name: 'notifications',
  failureThreshold: 5,
  successThreshold: 3,
  resetTimeout: 120000, // 2 minutes
  failureWindow: 300000, // 5 minutes
});

// ============================================
// Circuit Breaker Registry
// ============================================

const circuitRegistry = new Map<string, CircuitBreaker>();

// Register default circuits
circuitRegistry.set('database', databaseCircuit);
circuitRegistry.set('redis', redisCircuit);
circuitRegistry.set('external-api', externalApiCircuit);
circuitRegistry.set('notifications', notificationCircuit);

/**
 * Get or create a circuit breaker by name
 */
export function getCircuitBreaker(name: string, options?: Partial<CircuitBreakerOptions>): CircuitBreaker {
  let circuit = circuitRegistry.get(name);
  if (!circuit) {
    circuit = new CircuitBreaker({ name, ...options });
    circuitRegistry.set(name, circuit);
  }
  return circuit;
}

/**
 * Get stats for all registered circuit breakers
 */
export function getAllCircuitStats(): Record<string, CircuitBreakerStats> {
  const stats: Record<string, CircuitBreakerStats> = {};
  for (const [name, circuit] of circuitRegistry) {
    stats[name] = circuit.getStats();
  }
  return stats;
}

/**
 * Reset all circuit breakers (for testing)
 */
export function resetAllCircuits(): void {
  for (const circuit of circuitRegistry.values()) {
    circuit.reset();
  }
}

export default CircuitBreaker;
