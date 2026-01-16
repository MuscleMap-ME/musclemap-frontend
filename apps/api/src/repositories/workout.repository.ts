import { BaseRepository, BaseEntity, PaginationOptions, PaginatedResult } from './base.repository';
import { queryOne, queryAll } from '../db/client';

export interface Workout extends BaseEntity {
  user_id: string;
  name: string | null;
  date: Date;
  duration_seconds: number;
  exercise_data: unknown[];
  notes: string | null;
  completed: boolean;
}

export interface WorkoutFilters {
  userId: string;
  startDate?: Date;
  endDate?: Date;
  completed?: boolean;
}

class WorkoutRepository extends BaseRepository<Workout> {
  protected tableName = 'workouts';
  protected columns = [
    'id', 'user_id', 'name', 'date', 'duration_seconds',
    'exercise_data', 'notes', 'completed', 'created_at', 'updated_at'
  ];

  async findByUser(userId: string, options: PaginationOptions): Promise<PaginatedResult<Workout>> {
    const { limit, cursor } = options;
    const queryLimit = limit + 1;
    const params: unknown[] = [userId];

    let sql = `SELECT ${this.selectColumns} FROM ${this.tableName} WHERE user_id = $1`;

    if (cursor) {
      sql += ` AND (date, id) < ($2, $3)`;
      params.push(cursor.createdAt, cursor.id);
    }

    sql += ` ORDER BY date DESC, id DESC LIMIT $${params.length + 1}`;
    params.push(queryLimit);

    const results = await queryAll<Workout>(sql, params);
    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, -1) : results;

    const nextCursor = data.length > 0
      ? Buffer.from(JSON.stringify({
          createdAt: data[data.length - 1].date,
          id: data[data.length - 1].id
        })).toString('base64')
      : null;

    return { data, hasMore, nextCursor };
  }

  async getRecentWorkouts(userId: string, days: number): Promise<Workout[]> {
    return queryAll<Workout>(
      `SELECT ${this.selectColumns} FROM ${this.tableName}
       WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '1 day' * $2
       ORDER BY date DESC`,
      [userId, days]
    );
  }

  async getWorkoutStats(userId: string): Promise<{ total: number; thisWeek: number; thisMonth: number }> {
    const result = await queryOne<{ total: string; this_week: string; this_month: string }>(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE date >= CURRENT_DATE - INTERVAL '7 days') as this_week,
         COUNT(*) FILTER (WHERE date >= CURRENT_DATE - INTERVAL '30 days') as this_month
       FROM ${this.tableName}
       WHERE user_id = $1 AND completed = true`,
      [userId]
    );

    return {
      total: parseInt(result?.total ?? '0', 10),
      thisWeek: parseInt(result?.this_week ?? '0', 10),
      thisMonth: parseInt(result?.this_month ?? '0', 10),
    };
  }
}

export const workoutRepository = new WorkoutRepository();
