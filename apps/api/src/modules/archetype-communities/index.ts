/**
 * Archetype Communities Service
 *
 * Handles automatic community joining based on user archetypes:
 * - Link archetypes to default communities
 * - Auto-join users when they select an archetype
 * - Suggest archetype-related communities
 */

import { queryOne, queryAll, query, transaction } from '../../db/client';
import { loggers } from '../../lib/logger';

const log = loggers.core;

// ============================================
// TYPES
// ============================================

export interface ArchetypeCommunityLink {
  id: string;
  archetypeId: string;
  communityId: number;
  isDefault: boolean;
  priority: number;
  createdAt: Date;
}

export interface LinkedCommunity {
  communityId: number;
  communityName: string;
  communityDescription?: string;
  communitySlug: string;
  memberCount: number;
  isDefault: boolean;
  priority: number;
}

export interface ArchetypeSuggestion {
  archetypeId: string;
  archetypeName: string;
  communities: LinkedCommunity[];
}

// ============================================
// SERVICE
// ============================================

export const archetypeCommunitiesService = {
  /**
   * Link a community to an archetype
   */
  async linkCommunity(
    archetypeId: string,
    communityId: number,
    options: { isDefault?: boolean; priority?: number } = {}
  ): Promise<ArchetypeCommunityLink> {
    const { isDefault = false, priority = 100 } = options;

    const id = `acl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await query(
      `INSERT INTO archetype_community_links (id, archetype_id, community_id, is_default, priority)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (archetype_id, community_id) DO UPDATE SET
         is_default = EXCLUDED.is_default,
         priority = EXCLUDED.priority`,
      [id, archetypeId, communityId, isDefault, priority]
    );

    return {
      id,
      archetypeId,
      communityId,
      isDefault,
      priority,
      createdAt: new Date(),
    };
  },

  /**
   * Unlink a community from an archetype
   */
  async unlinkCommunity(archetypeId: string, communityId: number): Promise<void> {
    await query(
      'DELETE FROM archetype_community_links WHERE archetype_id = $1 AND community_id = $2',
      [archetypeId, communityId]
    );
  },

  /**
   * Get linked communities for an archetype
   */
  async getLinkedCommunities(archetypeId: string): Promise<LinkedCommunity[]> {
    const rows = await queryAll<{
      community_id: number;
      name: string;
      description: string | null;
      slug: string;
      member_count: string;
      is_default: boolean;
      priority: number;
    }>(
      `SELECT c.id as community_id, c.name, c.description, c.slug,
              (SELECT COUNT(*) FROM community_members WHERE community_id = c.id AND status = 'active') as member_count,
              acl.is_default, acl.priority
       FROM archetype_community_links acl
       JOIN communities c ON c.id = acl.community_id
       WHERE acl.archetype_id = $1
       ORDER BY acl.priority ASC, c.name ASC`,
      [archetypeId]
    );

    return rows.map((r) => ({
      communityId: r.community_id,
      communityName: r.name,
      communityDescription: r.description || undefined,
      communitySlug: r.slug,
      memberCount: parseInt(r.member_count),
      isDefault: r.is_default,
      priority: r.priority,
    }));
  },

  /**
   * Get default communities for an archetype (ones to auto-join)
   */
  async getDefaultCommunities(archetypeId: string): Promise<LinkedCommunity[]> {
    const rows = await queryAll<{
      community_id: number;
      name: string;
      description: string | null;
      slug: string;
      member_count: string;
      is_default: boolean;
      priority: number;
    }>(
      `SELECT c.id as community_id, c.name, c.description, c.slug,
              (SELECT COUNT(*) FROM community_members WHERE community_id = c.id AND status = 'active') as member_count,
              acl.is_default, acl.priority
       FROM archetype_community_links acl
       JOIN communities c ON c.id = acl.community_id
       WHERE acl.archetype_id = $1 AND acl.is_default = true
       ORDER BY acl.priority ASC`,
      [archetypeId]
    );

    return rows.map((r) => ({
      communityId: r.community_id,
      communityName: r.name,
      communityDescription: r.description || undefined,
      communitySlug: r.slug,
      memberCount: parseInt(r.member_count),
      isDefault: r.is_default,
      priority: r.priority,
    }));
  },

  /**
   * Auto-join user to archetype's default communities
   * Called when user selects an archetype
   */
  async autoJoinDefaultCommunities(userId: string, archetypeId: string): Promise<number[]> {
    const defaultCommunities = await this.getDefaultCommunities(archetypeId);

    if (defaultCommunities.length === 0) {
      log.info({ userId, archetypeId }, 'No default communities for archetype');
      return [];
    }

    const joinedCommunityIds: number[] = [];

    await transaction(async (client) => {
      for (const community of defaultCommunities) {
        // Check if already a member
        const existing = await client.query(
          'SELECT id, status FROM community_members WHERE user_id = $1 AND community_id = $2',
          [userId, community.communityId]
        );

        if (existing.rowCount && existing.rowCount > 0) {
          const member = existing.rows[0];
          if (member.status === 'active') {
            // Already an active member
            continue;
          }
          // Reactivate membership
          await client.query(
            `UPDATE community_members SET status = 'active', joined_at = NOW() WHERE id = $1`,
            [member.id]
          );
        } else {
          // Create new membership
          const memberId = `cm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await client.query(
            `INSERT INTO community_members (id, user_id, community_id, role, status, joined_by)
             VALUES ($1, $2, $3, 'member', 'active', 'archetype_auto_join')`,
            [memberId, userId, community.communityId]
          );
        }

        joinedCommunityIds.push(community.communityId);
        log.info({ userId, communityId: community.communityId, archetypeId }, 'Auto-joined user to archetype community');
      }
    });

    return joinedCommunityIds;
  },

  /**
   * Get suggested communities for a user based on their archetype
   * Excludes communities they're already a member of
   */
  async getSuggestedCommunities(userId: string): Promise<LinkedCommunity[]> {
    // Get user's archetype
    const user = await queryOne<{ archetype: string | null }>('SELECT archetype FROM users WHERE id = $1', [userId]);

    if (!user?.archetype) {
      return [];
    }

    const rows = await queryAll<{
      community_id: number;
      name: string;
      description: string | null;
      slug: string;
      member_count: string;
      is_default: boolean;
      priority: number;
    }>(
      `SELECT c.id as community_id, c.name, c.description, c.slug,
              (SELECT COUNT(*) FROM community_members WHERE community_id = c.id AND status = 'active') as member_count,
              acl.is_default, acl.priority
       FROM archetype_community_links acl
       JOIN communities c ON c.id = acl.community_id
       WHERE acl.archetype_id = $1
         AND NOT EXISTS (
           SELECT 1 FROM community_members cm
           WHERE cm.user_id = $2 AND cm.community_id = c.id AND cm.status = 'active'
         )
       ORDER BY acl.priority ASC, c.name ASC`,
      [user.archetype, userId]
    );

    return rows.map((r) => ({
      communityId: r.community_id,
      communityName: r.name,
      communityDescription: r.description || undefined,
      communitySlug: r.slug,
      memberCount: parseInt(r.member_count),
      isDefault: r.is_default,
      priority: r.priority,
    }));
  },

  /**
   * Get all archetypes with their linked communities
   */
  async getAllArchetypesWithCommunities(): Promise<ArchetypeSuggestion[]> {
    const archetypes = await queryAll<{ id: string; name: string }>(
      'SELECT id, name FROM archetypes WHERE enabled = true ORDER BY name'
    );

    const results: ArchetypeSuggestion[] = [];

    for (const archetype of archetypes) {
      const communities = await this.getLinkedCommunities(archetype.id);
      results.push({
        archetypeId: archetype.id,
        archetypeName: archetype.name,
        communities,
      });
    }

    return results;
  },

  /**
   * Handle archetype change for a user
   * - Leave old archetype's auto-join communities (optional)
   * - Join new archetype's default communities
   */
  async handleArchetypeChange(
    userId: string,
    oldArchetypeId: string | null,
    newArchetypeId: string,
    options: { leaveOldCommunities?: boolean } = {}
  ): Promise<{ joined: number[]; left: number[] }> {
    const { leaveOldCommunities = false } = options;

    let leftCommunities: number[] = [];
    let joinedCommunities: number[] = [];

    await transaction(async (client) => {
      // Optionally leave old archetype's auto-joined communities
      if (leaveOldCommunities && oldArchetypeId) {
        const oldDefaults = await this.getDefaultCommunities(oldArchetypeId);
        const newDefaults = await this.getDefaultCommunities(newArchetypeId);
        const newDefaultIds = new Set(newDefaults.map((c) => c.communityId));

        for (const community of oldDefaults) {
          // Only leave if not also in new archetype's defaults
          if (!newDefaultIds.has(community.communityId)) {
            // Check if joined via auto-join
            const membership = await client.query(
              `SELECT id FROM community_members
               WHERE user_id = $1 AND community_id = $2 AND joined_by = 'archetype_auto_join'`,
              [userId, community.communityId]
            );

            if (membership.rowCount && membership.rowCount > 0) {
              await client.query(
                `UPDATE community_members SET status = 'left', left_at = NOW()
                 WHERE user_id = $1 AND community_id = $2`,
                [userId, community.communityId]
              );
              leftCommunities.push(community.communityId);
            }
          }
        }
      }
    });

    // Join new archetype's default communities
    joinedCommunities = await this.autoJoinDefaultCommunities(userId, newArchetypeId);

    return {
      joined: joinedCommunities,
      left: leftCommunities,
    };
  },

  /**
   * Bulk link communities to an archetype (admin function)
   */
  async bulkLinkCommunities(
    archetypeId: string,
    communityLinks: Array<{ communityId: number; isDefault?: boolean; priority?: number }>
  ): Promise<number> {
    let linked = 0;

    await transaction(async (client) => {
      for (const link of communityLinks) {
        await client.query(
          `INSERT INTO archetype_community_links (id, archetype_id, community_id, is_default, priority)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (archetype_id, community_id) DO UPDATE SET
             is_default = EXCLUDED.is_default,
             priority = EXCLUDED.priority`,
          [
            `acl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            archetypeId,
            link.communityId,
            link.isDefault ?? false,
            link.priority ?? 100,
          ]
        );
        linked++;
      }
    });

    return linked;
  },
};

export default archetypeCommunitiesService;
