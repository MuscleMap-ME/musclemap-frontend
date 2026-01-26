/**
 * BuildNet Runtime Abstraction Types
 *
 * These interfaces define the contract between BuildNet and the underlying
 * JavaScript runtime (Bun, Node.js, Deno). Each runtime implements these
 * interfaces using its native APIs for maximum performance.
 */

// ============================================================================
// Core Runtime Provider
// ============================================================================

export type RuntimeName = 'bun' | 'node' | 'deno';

export interface RuntimeCapabilities {
  /** Native SQLite support (bun:sqlite) */
  nativeSqlite: boolean;
  /** Native HTTP server (Bun.serve) */
  nativeHttp: boolean;
  /** Native shell scripting (Bun Shell $``) */
  nativeShell: boolean;
  /** Foreign Function Interface (bun:ffi) */
  nativeFfi: boolean;
  /** Native bundler (Bun.build) */
  nativeBundler: boolean;
  /** Hot reload support (--hot) */
  hotReload: boolean;
  /** SharedArrayBuffer for worker communication */
  sharedArrayBuffer: boolean;
  /** Web Streams API */
  webStreams: boolean;
  /** Native file watching */
  nativeWatch: boolean;
  /** Native TypeScript execution */
  nativeTypeScript: boolean;
}

export interface RuntimeProvider {
  /** Runtime identifier */
  name: RuntimeName;
  /** Runtime version string */
  version: string;
  /** Feature capabilities */
  capabilities: RuntimeCapabilities;

  // Sub-providers
  fs: FileSystemProvider;
  process: ProcessProvider;
  http: HttpProvider;
  crypto: CryptoProvider;
  shell: ShellProvider;

  // Optional providers (runtime-specific)
  sqlite?: SqliteProvider;
  ffi?: FfiProvider;
  bundler?: BundlerProvider;
}

// ============================================================================
// File System Provider
// ============================================================================

export interface FileStat {
  size: number;
  mtime: Date;
  atime: Date;
  ctime: Date;
  isFile: boolean;
  isDirectory: boolean;
  isSymbolicLink: boolean;
  mode: number;
}

export interface WatchEvent {
  type: 'create' | 'modify' | 'delete' | 'rename';
  path: string;
  timestamp: Date;
}

export interface Watcher {
  close(): void;
  on(event: 'change', callback: (event: WatchEvent) => void): void;
  on(event: 'error', callback: (error: Error) => void): void;
}

export interface FileSystemProvider {
  // Read operations
  readFile(path: string): Promise<Uint8Array>;
  readTextFile(path: string): Promise<string>;
  readJson<T = unknown>(path: string): Promise<T>;

  // Write operations
  writeFile(path: string, data: Uint8Array | string): Promise<void>;
  writeJson(path: string, data: unknown, pretty?: boolean): Promise<void>;
  appendFile(path: string, data: Uint8Array | string): Promise<void>;

  // Directory operations
  readDir(path: string): Promise<string[]>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>;
  rename(oldPath: string, newPath: string): Promise<void>;
  copy(src: string, dest: string, options?: { recursive?: boolean }): Promise<void>;

  // Info operations
  stat(path: string): Promise<FileStat>;
  exists(path: string): Promise<boolean>;
  realpath(path: string): Promise<string>;

  // Watch
  watch(path: string, options?: { recursive?: boolean }): Watcher;

  // Bun-specific (optional)
  openFile?(path: string): BunFile | null;
}

/** Bun's lazy file handle */
export interface BunFile {
  size: number;
  type: string;
  name: string;
  lastModified: number;
  text(): Promise<string>;
  json<T = unknown>(): Promise<T>;
  arrayBuffer(): Promise<ArrayBuffer>;
  stream(): ReadableStream<Uint8Array>;
  slice(start?: number, end?: number): BunFile;
  exists(): Promise<boolean>;
}

// ============================================================================
// Process Provider
// ============================================================================

export interface SpawnOptions {
  cwd?: string;
  env?: Record<string, string>;
  stdin?: 'inherit' | 'pipe' | 'ignore';
  stdout?: 'inherit' | 'pipe' | 'ignore';
  stderr?: 'inherit' | 'pipe' | 'ignore';
  timeout?: number;
  detached?: boolean;
  killSignal?: string;
}

export interface ChildProcess {
  pid: number;
  stdin: WritableStream<Uint8Array> | null;
  stdout: ReadableStream<Uint8Array> | null;
  stderr: ReadableStream<Uint8Array> | null;
  exitCode: Promise<number>;
  exited: Promise<void>;
  kill(signal?: string): void;
  ref(): void;
  unref(): void;
}

export interface WorkerOptions {
  name?: string;
  type?: 'classic' | 'module';
  credentials?: 'omit' | 'same-origin' | 'include';
}

export interface ProcessProvider {
  /** Current process ID */
  pid: number;
  /** Parent process ID */
  ppid: number;
  /** Command line arguments */
  argv: string[];
  /** Environment variables */
  env: Record<string, string | undefined>;
  /** Current working directory */
  cwd(): string;

  // Spawn
  spawn(cmd: string, args?: string[], options?: SpawnOptions): ChildProcess;

  // Worker threads
  createWorker(script: string | URL, options?: WorkerOptions): Worker;

  // Exit handling
  exit(code?: number): never;
  onExit(callback: (code: number) => void): void;
  onSignal(signal: string, callback: () => void): void;

  // Memory
  memoryUsage(): { heapUsed: number; heapTotal: number; external: number; rss: number };
}

// ============================================================================
// HTTP Provider
// ============================================================================

export interface ServeOptions {
  port: number;
  hostname?: string;
  development?: boolean;
  reusePort?: boolean;
  tls?: {
    key: string | Uint8Array;
    cert: string | Uint8Array;
  };
}

export interface HttpServer {
  port: number;
  hostname: string;
  stop(): Promise<void>;
  reload?(options: Partial<ServeOptions>): void;
  upgrade?(req: Request, options?: { data?: unknown }): boolean;
}

export type RequestHandler = (req: Request) => Response | Promise<Response>;

export interface WebSocketHandler {
  open?(ws: WebSocket): void;
  message?(ws: WebSocket, message: string | Uint8Array): void;
  close?(ws: WebSocket, code: number, reason: string): void;
  drain?(ws: WebSocket): void;
}

export interface HttpProvider {
  serve(options: ServeOptions, handler: RequestHandler, ws?: WebSocketHandler): HttpServer;
  fetch(url: string | URL, options?: RequestInit): Promise<Response>;
}

// ============================================================================
// Crypto Provider
// ============================================================================

export interface CryptoProvider {
  randomUUID(): string;
  randomBytes(length: number): Uint8Array;

  // Hashing
  hash(algorithm: 'sha256' | 'sha512' | 'md5', data: string | Uint8Array): Promise<string>;
  hashSync(algorithm: 'sha256' | 'sha512' | 'md5', data: string | Uint8Array): string;

  // HMAC
  hmac(algorithm: 'sha256' | 'sha512', key: string | Uint8Array, data: string | Uint8Array): Promise<string>;

  // Constant-time comparison
  timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean;
}

// ============================================================================
// Shell Provider
// ============================================================================

export interface ShellResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface ShellOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  quiet?: boolean;
}

export interface ShellProvider {
  /** Execute a shell command */
  exec(command: string, options?: ShellOptions): Promise<ShellResult>;

  /** Execute multiple commands in sequence */
  execMany(commands: string[], options?: ShellOptions): Promise<ShellResult[]>;

  /** Check if a command exists */
  which(command: string): Promise<string | null>;

  /**
   * Bun Shell template literal (Bun only)
   * @example await shell.$`echo "hello"`
   */
  $?(strings: TemplateStringsArray, ...values: unknown[]): Promise<ShellResult>;
}

// ============================================================================
// SQLite Provider (Optional - Bun native)
// ============================================================================

export interface SqliteStatement {
  run(...params: unknown[]): { changes: number; lastInsertRowid: number };
  get<T = unknown>(...params: unknown[]): T | null;
  all<T = unknown>(...params: unknown[]): T[];
  values<T extends unknown[] = unknown[]>(...params: unknown[]): T[];
  finalize(): void;
}

export interface SqliteDatabase {
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
  transaction<T>(fn: () => T): T;
  close(): void;
  readonly inTransaction: boolean;
}

export interface SqliteOptions {
  readonly?: boolean;
  create?: boolean;
  readwrite?: boolean;
}

export interface SqliteProvider {
  open(path: string, options?: SqliteOptions): SqliteDatabase;
}

// ============================================================================
// FFI Provider (Optional - Bun native)
// ============================================================================

export interface FfiSymbol {
  args: FfiType[];
  returns: FfiType;
}

export type FfiType =
  | 'void'
  | 'bool'
  | 'i8'
  | 'u8'
  | 'i16'
  | 'u16'
  | 'i32'
  | 'u32'
  | 'i64'
  | 'u64'
  | 'f32'
  | 'f64'
  | 'ptr'
  | 'cstring';

export interface FfiLibrary {
  symbols: Record<string, (...args: unknown[]) => unknown>;
  close(): void;
}

export interface FfiProvider {
  /** Load a dynamic library */
  dlopen(path: string, symbols: Record<string, FfiSymbol>): FfiLibrary;

  /** Compile C code at runtime (Bun only) */
  cc?(options: { source: string; symbols: Record<string, FfiSymbol> }): Record<string, (...args: unknown[]) => unknown>;
}

// ============================================================================
// Bundler Provider (Optional - Bun native)
// ============================================================================

export interface BundleOptions {
  entrypoints: string[];
  outdir?: string;
  target?: 'browser' | 'bun' | 'node';
  format?: 'esm' | 'cjs' | 'iife';
  splitting?: boolean;
  minify?: boolean | { whitespace?: boolean; syntax?: boolean; identifiers?: boolean };
  sourcemap?: 'none' | 'inline' | 'external' | 'linked';
  external?: string[];
  define?: Record<string, string>;
  plugins?: BundlePlugin[];
  naming?: {
    entry?: string;
    chunk?: string;
    asset?: string;
  };
}

export interface BundlePlugin {
  name: string;
  setup(builder: BundleBuilder): void;
}

export interface BundleBuilder {
  onResolve(filter: { filter: RegExp; namespace?: string }, callback: (args: { path: string; importer: string }) => { path?: string; external?: boolean } | null | undefined): void;
  onLoad(filter: { filter: RegExp; namespace?: string }, callback: (args: { path: string }) => { contents?: string; loader?: string } | null | undefined): void;
}

export interface BundleArtifact {
  path: string;
  hash: string;
  size: number;
  kind: 'entry-point' | 'chunk' | 'asset' | 'sourcemap';
  loader: string;
}

export interface BundleOutput {
  success: boolean;
  outputs: BundleArtifact[];
  logs: Array<{ level: 'error' | 'warning' | 'info'; message: string; position?: { file: string; line: number; column: number } }>;
}

export interface BundlerProvider {
  build(options: BundleOptions): Promise<BundleOutput>;
}

// ============================================================================
// Runtime Detection
// ============================================================================

export function detectRuntime(): RuntimeName {
  // @ts-expect-error - Bun global
  if (typeof Bun !== 'undefined') {
    return 'bun';
  }
  // @ts-expect-error - Deno global
  if (typeof Deno !== 'undefined') {
    return 'deno';
  }
  return 'node';
}

export function isBun(): boolean {
  return detectRuntime() === 'bun';
}

export function isNode(): boolean {
  return detectRuntime() === 'node';
}

export function isDeno(): boolean {
  return detectRuntime() === 'deno';
}
