import { BaseRepository, BaseEntity } from './base.repository';
import { queryOne, queryAll } from '../db/client';

export interface User extends BaseEntity {
  username: string;
  email: string;
  password_hash: string;
  avatar_url: string | null;
  archetype: string | null;
  level: number;
  xp: number;
  credit_balance: number;
  wealth_tier: number;
  is_active: boolean;
  last_login_at: Date | null;
}

export interface UserPublicProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  archetype: string | null;
  level: number;
  wealth_tier: number;
}

class UserRepository extends BaseRepository<User> {
  protected tableName = 'users';
  protected columns = [
    'id', 'username', 'email', 'password_hash', 'avatar_url',
    'archetype', 'level', 'xp', 'credit_balance', 'wealth_tier',
    'is_active', 'last_login_at', 'created_at', 'updated_at'
  ];

  async findByEmail(email: string): Promise<User | undefined> {
    return queryOne<User>(
      `SELECT ${this.selectColumns} FROM ${this.tableName} WHERE LOWER(email) = LOWER($1)`,
      [email]
    );
  }

  async findByUsername(username: string): Promise<User | undefined> {
    return queryOne<User>(
      `SELECT ${this.selectColumns} FROM ${this.tableName} WHERE LOWER(username) = LOWER($1)`,
      [username]
    );
  }

  async getPublicProfile(id: string): Promise<UserPublicProfile | undefined> {
    return queryOne<UserPublicProfile>(
      `SELECT id, username, avatar_url, archetype, level, wealth_tier
       FROM ${this.tableName} WHERE id = $1`,
      [id]
    );
  }

  async updateCredits(id: string, amount: number): Promise<number> {
    const result = await queryOne<{ credit_balance: number }>(
      `UPDATE ${this.tableName}
       SET credit_balance = credit_balance + $2, updated_at = NOW()
       WHERE id = $1
       RETURNING credit_balance`,
      [id, amount]
    );
    return result?.credit_balance ?? 0;
  }

  async updateLastLogin(id: string): Promise<void> {
    await queryOne(
      `UPDATE ${this.tableName} SET last_login_at = NOW() WHERE id = $1`,
      [id]
    );
  }

  async searchByUsername(searchQuery: string, limit = 10): Promise<UserPublicProfile[]> {
    return queryAll<UserPublicProfile>(
      `SELECT id, username, avatar_url, archetype, level, wealth_tier
       FROM ${this.tableName}
       WHERE username ILIKE $1 AND is_active = true
       ORDER BY level DESC, username ASC
       LIMIT $2`,
      [`%${searchQuery}%`, limit]
    );
  }
}

export const userRepository = new UserRepository();
