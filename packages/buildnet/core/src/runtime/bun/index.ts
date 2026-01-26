/**
 * Bun Runtime Provider
 *
 * Native implementation using Bun's built-in APIs for maximum performance:
 * - bun:sqlite for state management (3-6x faster than better-sqlite3)
 * - Bun.serve for HTTP (2.5x more requests/second)
 * - Bun.spawn for process management
 * - Bun Shell $`` for cross-platform scripting
 * - Bun.build for bundling (100x faster than webpack)
 */

import type {
  RuntimeProvider,
  RuntimeCapabilities,
  FileSystemProvider,
  ProcessProvider,
  HttpProvider,
  CryptoProvider,
  ShellProvider,
  SqliteProvider,
  BundlerProvider,
  FileStat,
  WatchEvent,
  Watcher,
  BunFile,
  SpawnOptions,
  ChildProcess,
  WorkerOptions,
  ServeOptions,
  HttpServer,
  RequestHandler,
  WebSocketHandler,
  ShellResult,
  ShellOptions,
  SqliteDatabase,
  SqliteStatement,
  SqliteOptions,
  BundleOptions,
  BundleOutput,
} from '../types.js';

// ============================================================================
// Bun Runtime Provider
// ============================================================================

class BunRuntimeProvider implements RuntimeProvider {
  name = 'bun' as const;
  version: string;
  capabilities: RuntimeCapabilities;

  fs: FileSystemProvider;
  process: ProcessProvider;
  http: HttpProvider;
  crypto: CryptoProvider;
  shell: ShellProvider;
  sqlite: SqliteProvider;
  bundler: BundlerProvider;

  constructor() {
    // @ts-expect-error - Bun global
    this.version = Bun.version;

    this.capabilities = {
      nativeSqlite: true,
      nativeHttp: true,
      nativeShell: true,
      nativeFfi: true,
      nativeBundler: true,
      hotReload: true,
      sharedArrayBuffer: true,
      webStreams: true,
      nativeWatch: true,
      nativeTypeScript: true,
    };

    this.fs = new BunFileSystemProvider();
    this.process = new BunProcessProvider();
    this.http = new BunHttpProvider();
    this.crypto = new BunCryptoProvider();
    this.shell = new BunShellProvider();
    this.sqlite = new BunSqliteProvider();
    this.bundler = new BunBundlerProvider();
  }
}

// ============================================================================
// File System Provider (Bun.file, Bun.write)
// ============================================================================

class BunFileSystemProvider implements FileSystemProvider {
  async readFile(path: string): Promise<Uint8Array> {
    // @ts-expect-error - Bun global
    const file = Bun.file(path);
    return new Uint8Array(await file.arrayBuffer());
  }

  async readTextFile(path: string): Promise<string> {
    // @ts-expect-error - Bun global
    return Bun.file(path).text();
  }

  async readJson<T = unknown>(path: string): Promise<T> {
    // @ts-expect-error - Bun global
    return Bun.file(path).json();
  }

  async writeFile(path: string, data: Uint8Array | string): Promise<void> {
    // @ts-expect-error - Bun global
    await Bun.write(path, data);
  }

  async writeJson(path: string, data: unknown, pretty = true): Promise<void> {
    const json = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    // @ts-expect-error - Bun global
    await Bun.write(path, json);
  }

  async appendFile(path: string, data: Uint8Array | string): Promise<void> {
    // @ts-expect-error - Bun global
    const file = Bun.file(path);
    const existing = await file.exists() ? await file.arrayBuffer() : new ArrayBuffer(0);
    const newData = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    const combined = new Uint8Array(existing.byteLength + newData.length);
    combined.set(new Uint8Array(existing), 0);
    combined.set(newData, existing.byteLength);
    // @ts-expect-error - Bun global
    await Bun.write(path, combined);
  }

  async readDir(path: string): Promise<string[]> {
    const { readdir } = await import('node:fs/promises');
    return readdir(path);
  }

  async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    const { mkdir } = await import('node:fs/promises');
    await mkdir(path, options);
  }

  async rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void> {
    const { rm } = await import('node:fs/promises');
    await rm(path, options);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    const { rename } = await import('node:fs/promises');
    await rename(oldPath, newPath);
  }

  async copy(src: string, dest: string, options?: { recursive?: boolean }): Promise<void> {
    const { cp } = await import('node:fs/promises');
    await cp(src, dest, options);
  }

  async stat(path: string): Promise<FileStat> {
    const { stat } = await import('node:fs/promises');
    const s = await stat(path);
    return {
      size: s.size,
      mtime: s.mtime,
      atime: s.atime,
      ctime: s.ctime,
      isFile: s.isFile(),
      isDirectory: s.isDirectory(),
      isSymbolicLink: s.isSymbolicLink(),
      mode: s.mode,
    };
  }

  async exists(path: string): Promise<boolean> {
    // @ts-expect-error - Bun global
    return Bun.file(path).exists();
  }

  async realpath(path: string): Promise<string> {
    const { realpath } = await import('node:fs/promises');
    return realpath(path);
  }

  watch(path: string, options?: { recursive?: boolean }): Watcher {
    const { watch } = require('node:fs');
    const watcher = watch(path, { recursive: options?.recursive });

    const callbacks: {
      change: ((event: WatchEvent) => void)[];
      error: ((error: Error) => void)[];
    } = { change: [], error: [] };

    watcher.on('change', (eventType: string, filename: string) => {
      const event: WatchEvent = {
        type: eventType === 'rename' ? 'rename' : 'modify',
        path: filename,
        timestamp: new Date(),
      };
      for (const cb of callbacks.change) cb(event);
    });

    watcher.on('error', (error: Error) => {
      for (const cb of callbacks.error) cb(error);
    });

    return {
      close: () => watcher.close(),
      on: (event: 'change' | 'error', callback: (arg: WatchEvent | Error) => void) => {
        if (event === 'change') callbacks.change.push(callback as (event: WatchEvent) => void);
        if (event === 'error') callbacks.error.push(callback as (error: Error) => void);
      },
    };
  }

  openFile(path: string): BunFile | null {
    // @ts-expect-error - Bun global
    const file = Bun.file(path);
    return file;
  }
}

// ============================================================================
// Process Provider (Bun.spawn)
// ============================================================================

class BunProcessProvider implements ProcessProvider {
  get pid(): number {
    return process.pid;
  }

  get ppid(): number {
    return process.ppid;
  }

  get argv(): string[] {
    // @ts-expect-error - Bun global
    return Bun.argv;
  }

  get env(): Record<string, string | undefined> {
    // @ts-expect-error - Bun global
    return Bun.env;
  }

  cwd(): string {
    return process.cwd();
  }

  spawn(cmd: string, args: string[] = [], options: SpawnOptions = {}): ChildProcess {
    // @ts-expect-error - Bun global
    const proc = Bun.spawn([cmd, ...args], {
      cwd: options.cwd,
      env: options.env,
      stdin: options.stdin ?? 'inherit',
      stdout: options.stdout ?? 'inherit',
      stderr: options.stderr ?? 'inherit',
    });

    return {
      pid: proc.pid,
      stdin: proc.stdin,
      stdout: proc.stdout,
      stderr: proc.stderr,
      exitCode: proc.exited.then(() => proc.exitCode ?? 0),
      exited: proc.exited,
      kill: (signal?: string) => proc.kill(signal as NodeJS.Signals),
      ref: () => proc.ref(),
      unref: () => proc.unref(),
    };
  }

  createWorker(script: string | URL, options?: WorkerOptions): Worker {
    return new Worker(script, {
      type: options?.type ?? 'module',
      name: options?.name,
    });
  }

  exit(code?: number): never {
    process.exit(code);
  }

  onExit(callback: (code: number) => void): void {
    process.on('exit', callback);
  }

  onSignal(signal: string, callback: () => void): void {
    process.on(signal as NodeJS.Signals, callback);
  }

  memoryUsage(): { heapUsed: number; heapTotal: number; external: number; rss: number } {
    const usage = process.memoryUsage();
    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
    };
  }
}

// ============================================================================
// HTTP Provider (Bun.serve)
// ============================================================================

class BunHttpProvider implements HttpProvider {
  serve(options: ServeOptions, handler: RequestHandler, ws?: WebSocketHandler): HttpServer {
    // @ts-expect-error - Bun global
    const server = Bun.serve({
      port: options.port,
      hostname: options.hostname ?? '0.0.0.0',
      development: options.development ?? false,
      reusePort: options.reusePort,
      tls: options.tls,
      fetch: handler,
      websocket: ws
        ? {
            open: ws.open,
            message: ws.message,
            close: ws.close,
            drain: ws.drain,
          }
        : undefined,
    });

    return {
      port: server.port,
      hostname: server.hostname,
      stop: async () => server.stop(),
      reload: (opts) => server.reload(opts),
      upgrade: (req, opts) => server.upgrade(req, opts),
    };
  }

  async fetch(url: string | URL, options?: RequestInit): Promise<Response> {
    return fetch(url, options);
  }
}

// ============================================================================
// Crypto Provider
// ============================================================================

class BunCryptoProvider implements CryptoProvider {
  randomUUID(): string {
    return crypto.randomUUID();
  }

  randomBytes(length: number): Uint8Array {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes;
  }

  async hash(algorithm: 'sha256' | 'sha512' | 'md5', data: string | Uint8Array): Promise<string> {
    // @ts-expect-error - Bun global
    const hasher = new Bun.CryptoHasher(algorithm);
    hasher.update(data);
    return hasher.digest('hex');
  }

  hashSync(algorithm: 'sha256' | 'sha512' | 'md5', data: string | Uint8Array): string {
    // @ts-expect-error - Bun global
    const hasher = new Bun.CryptoHasher(algorithm);
    hasher.update(data);
    return hasher.digest('hex');
  }

  async hmac(algorithm: 'sha256' | 'sha512', key: string | Uint8Array, data: string | Uint8Array): Promise<string> {
    const keyData = typeof key === 'string' ? new TextEncoder().encode(key) : key;
    const dataBytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;

    const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: algorithm.toUpperCase() }, false, ['sign']);

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBytes);
    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a[i] ^ b[i];
    }
    return result === 0;
  }
}

// ============================================================================
// Shell Provider (Bun Shell $``)
// ============================================================================

class BunShellProvider implements ShellProvider {
  async exec(command: string, options?: ShellOptions): Promise<ShellResult> {
    // @ts-expect-error - Bun global
    const $ = (await import('bun')).$ as any;

    const result = await $`${command}`
      .cwd(options?.cwd ?? process.cwd())
      .env(options?.env ?? {})
      .quiet(options?.quiet ?? false)
      .nothrow();

    return {
      exitCode: result.exitCode,
      stdout: result.stdout?.toString() ?? '',
      stderr: result.stderr?.toString() ?? '',
    };
  }

  async execMany(commands: string[], options?: ShellOptions): Promise<ShellResult[]> {
    const results: ShellResult[] = [];
    for (const cmd of commands) {
      results.push(await this.exec(cmd, options));
    }
    return results;
  }

  async which(command: string): Promise<string | null> {
    // @ts-expect-error - Bun global
    return Bun.which(command);
  }

  async $(strings: TemplateStringsArray, ...values: unknown[]): Promise<ShellResult> {
    // @ts-expect-error - Bun global
    const $ = (await import('bun')).$;
    const result = await $(strings, ...values).nothrow();
    return {
      exitCode: result.exitCode,
      stdout: result.stdout?.toString() ?? '',
      stderr: result.stderr?.toString() ?? '',
    };
  }
}

// ============================================================================
// SQLite Provider (bun:sqlite)
// ============================================================================

class BunSqliteProvider implements SqliteProvider {
  open(path: string, options?: SqliteOptions): SqliteDatabase {
    // @ts-expect-error - bun:sqlite import
    const { Database } = require('bun:sqlite');

    const db = new Database(path, {
      readonly: options?.readonly,
      create: options?.create ?? true,
      readwrite: options?.readwrite ?? true,
    });

    // Enable WAL mode for better concurrent performance
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA synchronous = NORMAL');
    db.exec('PRAGMA busy_timeout = 5000');
    db.exec('PRAGMA cache_size = -64000'); // 64MB cache

    return {
      exec: (sql: string) => db.exec(sql),
      prepare: (sql: string) => {
        const stmt = db.prepare(sql);
        return {
          run: (...params: unknown[]) => stmt.run(...params),
          get: <T>(...params: unknown[]) => stmt.get(...params) as T | null,
          all: <T>(...params: unknown[]) => stmt.all(...params) as T[],
          values: <T extends unknown[]>(...params: unknown[]) => stmt.values(...params) as T[],
          finalize: () => stmt.finalize(),
        };
      },
      transaction: <T>(fn: () => T) => db.transaction(fn)(),
      close: () => db.close(),
      get inTransaction() {
        return db.inTransaction;
      },
    };
  }
}

// ============================================================================
// Bundler Provider (Bun.build)
// ============================================================================

class BunBundlerProvider implements BundlerProvider {
  async build(options: BundleOptions): Promise<BundleOutput> {
    // @ts-expect-error - Bun global
    const result = await Bun.build({
      entrypoints: options.entrypoints,
      outdir: options.outdir,
      target: options.target ?? 'browser',
      format: options.format ?? 'esm',
      splitting: options.splitting ?? false,
      minify: options.minify ?? false,
      sourcemap: options.sourcemap ?? 'none',
      external: options.external,
      define: options.define,
      plugins: options.plugins,
      naming: options.naming,
    });

    return {
      success: result.success,
      outputs: result.outputs.map((output: any) => ({
        path: output.path,
        hash: output.hash ?? '',
        size: output.size,
        kind: output.kind,
        loader: output.loader,
      })),
      logs: result.logs.map((log: any) => ({
        level: log.level,
        message: log.message,
        position: log.position,
      })),
    };
  }
}

// ============================================================================
// Export
// ============================================================================

export function createBunRuntime(): RuntimeProvider {
  return new BunRuntimeProvider();
}

export { BunRuntimeProvider };
