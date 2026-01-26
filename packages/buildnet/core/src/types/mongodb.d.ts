/**
 * Type declarations for mongodb
 *
 * This is a minimal subset of mongodb types needed for the BuildNet MongoDB backend.
 * The full types are available from the mongodb package directly.
 */

declare module 'mongodb' {
  export interface MongoClientOptions {
    connectTimeoutMS?: number;
    serverSelectionTimeoutMS?: number;
    maxPoolSize?: number;
    minPoolSize?: number;
    readPreference?:
      | 'primary'
      | 'primaryPreferred'
      | 'secondary'
      | 'secondaryPreferred'
      | 'nearest';
    w?: number | 'majority';
    j?: boolean;
    wtimeoutMS?: number;
  }

  export interface Document {
    [key: string]: unknown;
  }

  export interface Filter<TSchema = Document> {
    [key: string]: unknown;
  }

  export interface UpdateFilter<TSchema = Document> {
    $set?: Partial<TSchema>;
    $unset?: { [key in keyof TSchema]?: '' | true | 1 };
    $inc?: { [key in keyof TSchema]?: number };
    [key: string]: unknown;
  }

  export interface FindOptions<TSchema = Document> {
    limit?: number;
    skip?: number;
    sort?: { [key: string]: 1 | -1 };
    projection?: { [key in keyof TSchema]?: 0 | 1 };
  }

  export interface UpdateOptions {
    upsert?: boolean;
  }

  export interface DeleteResult {
    acknowledged: boolean;
    deletedCount: number;
  }

  export interface UpdateResult {
    acknowledged: boolean;
    matchedCount: number;
    modifiedCount: number;
    upsertedCount: number;
    upsertedId?: unknown;
  }

  export interface InsertOneResult {
    acknowledged: boolean;
    insertedId: unknown;
  }

  export interface FindCursor<TSchema = Document> {
    toArray(): Promise<TSchema[]>;
    forEach(callback: (doc: TSchema) => void): Promise<void>;
    hasNext(): Promise<boolean>;
    next(): Promise<TSchema | null>;
    close(): Promise<void>;
  }

  export interface Collection<TSchema = Document> {
    findOne(filter: Filter<TSchema>): Promise<TSchema | null>;
    find(filter?: Filter<TSchema>, options?: FindOptions<TSchema>): FindCursor<TSchema>;
    insertOne(doc: TSchema): Promise<InsertOneResult>;
    updateOne(
      filter: Filter<TSchema>,
      update: UpdateFilter<TSchema>,
      options?: UpdateOptions
    ): Promise<UpdateResult>;
    deleteOne(filter: Filter<TSchema>): Promise<DeleteResult>;
    deleteMany(filter: Filter<TSchema>): Promise<DeleteResult>;
    countDocuments(filter?: Filter<TSchema>): Promise<number>;
    createIndex(keys: { [key: string]: 1 | -1 }, options?: { unique?: boolean }): Promise<string>;
  }

  export interface Db {
    collection<TSchema = Document>(name: string): Collection<TSchema>;
    command(command: Document): Promise<Document>;
  }

  export class MongoClient {
    constructor(url: string, options?: MongoClientOptions);
    connect(): Promise<MongoClient>;
    close(force?: boolean): Promise<void>;
    db(name?: string): Db;
  }

  export class ObjectId {
    constructor(id?: string | Buffer | number);
    toHexString(): string;
    toString(): string;
    static createFromTime(time: number): ObjectId;
    static isValid(id: unknown): boolean;
  }
}
