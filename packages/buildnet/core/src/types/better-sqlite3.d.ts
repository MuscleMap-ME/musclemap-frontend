/**
 * Type declarations for better-sqlite3
 *
 * This is a minimal subset of better-sqlite3 types needed for the BuildNet SQLite backend.
 * The full types are available via @types/better-sqlite3 if installed.
 */

declare module 'better-sqlite3' {
  interface Statement<BindParameters extends unknown[] = unknown[]> {
    run(...params: BindParameters): Database.RunResult;
    get(...params: BindParameters): unknown;
    all(...params: BindParameters): unknown[];
    iterate(...params: BindParameters): IterableIterator<unknown>;
    bind(...params: BindParameters): this;
  }

  interface Database {
    readonly name: string;
    readonly open: boolean;
    readonly inTransaction: boolean;
    readonly readonly: boolean;
    readonly memory: boolean;

    prepare<BindParameters extends unknown[] = unknown[]>(
      source: string
    ): Statement<BindParameters>;

    exec(source: string): this;
    close(): this;

    pragma(source: string, options?: { simple?: boolean }): unknown;

    transaction<F extends (...args: unknown[]) => unknown>(fn: F): F;

    function(
      name: string,
      fn: (...args: unknown[]) => unknown
    ): this;
    function(
      name: string,
      options: { deterministic?: boolean; varargs?: boolean },
      fn: (...args: unknown[]) => unknown
    ): this;

    aggregate(
      name: string,
      options: {
        start?: unknown;
        step: (total: unknown, next: unknown) => unknown;
        result?: (total: unknown) => unknown;
        inverse?: (total: unknown, dropped: unknown) => unknown;
        deterministic?: boolean;
        varargs?: boolean;
      }
    ): this;

    loadExtension(path: string): this;
    backup(destinationFile: string): Promise<Database.BackupMetadata>;
  }

  namespace Database {
    interface RunResult {
      changes: number;
      lastInsertRowid: number | bigint;
    }

    interface BackupMetadata {
      totalPages: number;
      remainingPages: number;
    }

    interface Options {
      readonly?: boolean;
      fileMustExist?: boolean;
      timeout?: number;
      verbose?: (message?: unknown, ...additionalArgs: unknown[]) => void;
    }
  }

  function Database(filename: string, options?: Database.Options): Database;

  export = Database;
}
