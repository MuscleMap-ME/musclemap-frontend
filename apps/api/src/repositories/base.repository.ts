import { PoolClient } from 'pg';
import { query, queryOne, queryAll, transaction } from '../db/client';

export interface BaseEntity {
  id: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface PaginationOptions {
  limit: number;
  cursor?: { createdAt: Date; id: string };
}

export interface PaginatedResult<T> {
  data: T[];
  hasMore: boolean;
  nextCursor: string | null;
}

export abstract class BaseRepository<T extends BaseEntity> {
  protected abstract tableName: string;
  protected abstract columns: string[];

  protected get selectColumns(): string {
    return this.columns.join(', ');
  }

  async findById(id: string): Promise<T | undefined> {
    return queryOne<T>(
      `SELECT ${this.selectColumns} FROM ${this.tableName} WHERE id = $1`,
      [id]
    );
  }

  async findMany(options: PaginationOptions): Promise<PaginatedResult<T>> {
    const { limit, cursor } = options;
    const queryLimit = limit + 1;

    let sql = `SELECT ${this.selectColumns} FROM ${this.tableName}`;
    const params: unknown[] = [];

    if (cursor) {
      sql += ` WHERE (created_at, id) < ($1, $2)`;
      params.push(cursor.createdAt, cursor.id);
    }

    sql += ` ORDER BY created_at DESC, id DESC LIMIT $${params.length + 1}`;
    params.push(queryLimit);

    const results = await queryAll<T>(sql, params);
    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, -1) : results;

    const nextCursor = data.length > 0
      ? Buffer.from(JSON.stringify({
          createdAt: data[data.length - 1].created_at,
          id: data[data.length - 1].id
        })).toString('base64')
      : null;

    return { data, hasMore, nextCursor };
  }

  async create(data: Partial<T>, client?: PoolClient): Promise<T> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

    const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')})
                 VALUES (${placeholders})
                 RETURNING ${this.selectColumns}`;

    const result = client
      ? await client.query(sql, values)
      : await query(sql, values);

    return result.rows[0];
  }

  async update(id: string, data: Partial<T>, client?: PoolClient): Promise<T | null> {
    const entries = Object.entries(data);
    const setClause = entries.map(([key], i) => `${key} = $${i + 1}`).join(', ');
    const values = [...entries.map(([, v]) => v), id];

    const sql = `UPDATE ${this.tableName}
                 SET ${setClause}, updated_at = NOW()
                 WHERE id = $${values.length}
                 RETURNING ${this.selectColumns}`;

    const result = client
      ? await client.query(sql, values)
      : await query(sql, values);

    return result.rows[0] || null;
  }

  async delete(id: string, client?: PoolClient): Promise<boolean> {
    const sql = `DELETE FROM ${this.tableName} WHERE id = $1`;
    const result = client
      ? await client.query(sql, [id])
      : await query(sql, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async transaction<R>(fn: (client: PoolClient) => Promise<R>): Promise<R> {
    return transaction(fn);
  }
}
