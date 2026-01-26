/**
 * Type declarations for optional dependencies.
 *
 * These modules are optional - the system works without them.
 * These declarations prevent TypeScript errors when the modules aren't installed.
 */

// ioredis - Redis/DragonflyDB client (optional, for distributed state)
declare module 'ioredis' {
  export interface RedisOptions {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
    lazyConnect?: boolean;
    connectTimeout?: number;
    maxRetriesPerRequest?: number;
    retryStrategy?: (times: number) => number | void | null;
  }

  export default class Redis {
    constructor(url?: string, options?: RedisOptions);
    constructor(options?: RedisOptions);

    connect(): Promise<void>;
    disconnect(): void;
    quit(): Promise<'OK'>;

    // Basic operations
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ...args: unknown[]): Promise<'OK'>;
    del(...keys: string[]): Promise<number>;
    keys(pattern: string): Promise<string[]>;

    // Multi-key operations
    mget(...keys: string[]): Promise<Array<string | null>>;
    mset(...args: unknown[]): Promise<'OK'>;

    // Counters
    incr(key: string): Promise<number>;
    decr(key: string): Promise<number>;
    incrby(key: string, increment: number): Promise<number>;

    // Hash operations
    hset(key: string, field: string, value: string): Promise<number>;
    hget(key: string, field: string): Promise<string | null>;
    hgetall(key: string): Promise<Record<string, string>>;
    hdel(key: string, ...fields: string[]): Promise<number>;

    // Sorted sets
    zadd(key: string, score: number, member: string): Promise<number>;
    zrange(key: string, start: number, stop: number): Promise<string[]>;
    zrangebyscore(key: string, min: number | string, max: number | string): Promise<string[]>;
    zrem(key: string, ...members: string[]): Promise<number>;

    // Pub/Sub
    subscribe(channel: string): Promise<number>;
    publish(channel: string, message: string): Promise<number>;
    on(event: 'message', callback: (channel: string, message: string) => void): this;
    on(event: 'error', callback: (error: Error) => void): this;
    on(event: 'connect', callback: () => void): this;
    on(event: 'ready', callback: () => void): this;
    duplicate(): Redis;

    // Server info
    info(section?: string): Promise<string>;
    ping(): Promise<'PONG'>;

    // Lua scripting
    eval(script: string, numKeys: number, ...args: unknown[]): Promise<unknown>;

    status: string;
  }
}

// @rspack/core - Rspack bundler (optional)
declare module '@rspack/core' {
  export interface RspackOptions {
    entry?: string | string[] | Record<string, string>;
    output?: {
      path?: string;
      filename?: string;
      publicPath?: string;
      clean?: boolean;
    };
    mode?: 'development' | 'production' | 'none';
    target?: string | string[];
    devtool?: string | false;
    module?: {
      rules?: Array<{
        test?: RegExp;
        use?: unknown[];
        type?: string;
        exclude?: RegExp | RegExp[];
      }>;
    };
    plugins?: unknown[];
    resolve?: {
      extensions?: string[];
      alias?: Record<string, string>;
    };
    optimization?: {
      minimize?: boolean;
      splitChunks?: unknown;
    };
    externals?: Record<string, string> | Array<Record<string, string>>;
  }

  export interface Stats {
    hasErrors(): boolean;
    hasWarnings(): boolean;
    toString(options?: string | object): string;
    toJson(): {
      errors?: Array<{ message: string }>;
      warnings?: Array<{ message: string }>;
      assets?: Array<{
        name: string;
        size: number;
      }>;
      outputPath?: string;
      time?: number;
    };
  }

  export interface Compiler {
    run(callback: (err: Error | null, stats?: Stats) => void): void;
    watch(options: object, callback: (err: Error | null, stats?: Stats) => void): { close: (callback?: (err?: Error | null) => void) => void };
    close(callback: (err?: Error | null) => void): void;
  }

  export function rspack(options: RspackOptions): Compiler;
  export default function rspack(options: RspackOptions): Compiler;
}

// proper-lockfile - File locking (optional, for file-based state backend)
declare module 'proper-lockfile' {
  export interface LockOptions {
    stale?: number;
    update?: number;
    retries?: number | {
      retries?: number;
      factor?: number;
      minTimeout?: number;
      maxTimeout?: number;
      randomize?: boolean;
    };
    realpath?: boolean;
    fs?: unknown;
    onCompromised?: (err: Error) => void;
  }

  export interface UnlockOptions {
    realpath?: boolean;
    fs?: unknown;
  }

  export function lock(file: string, options?: LockOptions): Promise<() => Promise<void>>;
  export function unlock(file: string, options?: UnlockOptions): Promise<void>;
  export function check(file: string, options?: LockOptions): Promise<boolean>;
}

// eventemitter3 - Event emitter (optional, for memory backend pub/sub)
declare module 'eventemitter3' {
  // Using 'any' for callback to allow flexible typing with string messages
  type EventListener = (...args: any[]) => void;

  class EventEmitter<EventTypes extends string = string> {
    on(event: EventTypes, fn: EventListener, context?: unknown): this;
    once(event: EventTypes, fn: EventListener, context?: unknown): this;
    emit(event: EventTypes, ...args: any[]): boolean;
    off(event: EventTypes, fn?: EventListener, context?: unknown, once?: boolean): this;
    removeListener(event: EventTypes, fn?: EventListener, context?: unknown, once?: boolean): this;
    removeAllListeners(event?: EventTypes): this;
    listeners(event: EventTypes): EventListener[];
    listenerCount(event: EventTypes): number;
    eventNames(): EventTypes[];
  }

  export { EventEmitter };
  export default EventEmitter;
}
