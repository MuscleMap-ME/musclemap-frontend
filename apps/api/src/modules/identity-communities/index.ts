/**
 * Identity Communities Service
 *
 * Handles automatic community joining based on user identities:
 * - Link identities to default communities
 * - Auto-join users when they select an identity
 * - Suggest identity-related communities
 *
 * Note: This module uses the new "identity" terminology but queries
 * the renamed tables (identities, identity_community_links)
 */

import { queryOne, queryAll, query, transaction } from '../../db/client';
import { loggers } from '../../lib/logger';

const log = loggers.core;

// ============================================
// TYPES
// ============================================

export interface IdentityCommunityLink {
  id: string;
  identityId: string;
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

export interface IdentitySuggestion {
  identityId: string;
  identityName: string;
  communities: LinkedCommunity[];
}

export interface Identity {
  id: string;
  name: string;
  philosophy?: string;
  description?: string;
  focusAreas?: string[];
  iconUrl?: string;
  categoryId?: string;
  ptTestId?: string;
  institution?: string;
  recommendedEquipment?: string[];
}

// ============================================
// SERVICE
// ============================================

export const identityCommunitiesService = {
  /**
   * Get all identities
   */
  async getAllIdentities(): Promise<Identity[]> {
    const rows = await queryAll<{
      id: string;
      name: string;
      philosophy: string | null;
      description: string | null;
      focus_areas: string[] | null;
      icon_url: string | null;
      category_id: string | null;
      pt_test_id: string | null;
      institution: string | null;
      recommended_equipment: string[] | null;
    }>('SELECT * FROM identities ORDER BY name');

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      philosophy: r.philosophy || undefined,
      description: r.description || undefined,
      focusAreas: r.focus_areas || undefined,
      iconUrl: r.icon_url || undefined,
      categoryId: r.category_id || undefined,
      ptTestId: r.pt_test_id || undefined,
      institution: r.institution || undefined,
      recommendedEquipment: r.recommended_equipment || undefined,
    }));
  },

  /**
   * Get identity by ID
   */
  async getIdentityById(identityId: string): Promise<Identity | null> {
    const row = await queryOne<{
      id: string;
      name: string;
      philosophy: string | null;
      description: string | null;
      focus_areas: string[] | null;
      icon_url: string | null;
      category_id: string | null;
      pt_test_id: string | null;
      institution: string | null;
      recommended_equipment: string[] | null;
    }>('SELECT * FROM identities WHERE id = $1', [identityId]);

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      philosophy: row.philosophy || undefined,
      description: row.description || undefined,
      focusAreas: row.focus_areas || undefined,
      iconUrl: row.icon_url || undefined,
      categoryId: row.category_id || undefined,
      ptTestId: row.pt_test_id || undefined,
      institution: row.institution || undefined,
      recommendedEquipment: row.recommended_equipment || undefined,
    };
  },

  /**
   * Get identities by category
   */
  async getIdentitiesByCategory(categoryId: string): Promise<Identity[]> {
    const rows = await queryAll<{
      id: string;
      name: string;
      philosophy: string | null;
      description: string | null;
      focus_areas: string[] | null;
      icon_url: string | null;
      category_id: string | null;
      pt_test_id: string | null;
      institution: string | null;
      recommended_equipment: string[] | null;
    }>('SELECT * FROM identities WHERE category_id = $1 ORDER BY name', [categoryId]);

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      philosophy: r.philosophy || undefined,
      description: r.description || undefined,
      focusAreas: r.focus_areas || undefined,
      iconUrl: r.icon_url || undefined,
      categoryId: r.category_id || undefined,
      ptTestId: r.pt_test_id || undefined,
      institution: r.institution || undefined,
      recommendedEquipment: r.recommended_equipment || undefined,
    }));
  },

  /**
   * Link a community to an identity
   */
  async linkCommunity(
    identityId: string,
    communityId: number,
    options: { isDefault?: boolean; priority?: number } = {}
  ): Promise<IdentityCommunityLink> {
    const { isDefault = false, priority = 100 } = options;

    const id = `icl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await query(
      `INSERT INTO identity_community_links (id, identity_id, community_id, auto_join, recommended, priority)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [id, identityId, communityId, isDefault, true, priority]
    );

    return {
      id,
      identityId,
      communityId,
      isDefault,
      priority,
      createdAt: new Date(),
    };
  },

  /**
   * Unlink a community from an identity
   */
  async unlinkCommunity(identityId: string, communityId: number): Promise<void> {
    await query(
      'DELETE FROM identity_community_links WHERE identity_id = $1 AND community_id = $2',
      [identityId, communityId]
    );
  },

  /**
   * Get linked communities for an identity
   */
  async getLinkedCommunities(identityId: string): Promise<LinkedCommunity[]> {
    const rows = await queryAll<{
      community_id: number;
      name: string;
      description: string | null;
      slug: string;
      member_count: string;
      auto_join: boolean;
      priority: number;
    }>(
      `SELECT c.id as community_id, c.name, c.description, c.slug,
              (SELECT COUNT(*) FROM community_members WHERE community_id = c.id AND status = 'active') as member_count,
              icl.auto_join, icl.priority
       FROM identity_community_links icl
       JOIN communities c ON c.id = icl.community_id
       WHERE icl.identity_id = $1
       ORDER BY icl.priority ASC, c.name ASC`,
      [identityId]
    );

    return rows.map((r) => ({
      communityId: r.community_id,
      communityName: r.name,
      communityDescription: r.description || undefined,
      communitySlug: r.slug,
      memberCount: parseInt(r.member_count),
      isDefault: r.auto_join,
      priority: r.priority,
    }));
  },

  /**
   * Get default communities for an identity (ones to auto-join)
   */
  async getDefaultCommunities(identityId: string): Promise<LinkedCommunity[]> {
    const rows = await queryAll<{
      community_id: number;
      name: string;
      description: string | null;
      slug: string;
      member_count: string;
      auto_join: boolean;
      priority: number;
    }>(
      `SELECT c.id as community_id, c.name, c.description, c.slug,
              (SELECT COUNT(*) FROM community_members WHERE community_id = c.id AND status = 'active') as member_count,
              icl.auto_join, icl.priority
       FROM identity_community_links icl
       JOIN communities c ON c.id = icl.community_id
       WHERE icl.identity_id = $1 AND icl.auto_join = true
       ORDER BY icl.priority ASC`,
      [identityId]
    );

    return rows.map((r) => ({
      communityId: r.community_id,
      communityName: r.name,
      communityDescription: r.description || undefined,
      communitySlug: r.slug,
      memberCount: parseInt(r.member_count),
      isDefault: r.auto_join,
      priority: r.priority,
    }));
  },

  /**
   * Auto-join user to identity's default communities
   * Called when user selects an identity
   */
  async autoJoinDefaultCommunities(userId: string, identityId: string): Promise<number[]> {
    const defaultCommunities = await this.getDefaultCommunities(identityId);

    if (defaultCommunities.length === 0) {
      log.info({ userId, identityId }, 'No default communities for identity');
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
             VALUES ($1, $2, $3, 'member', 'active', 'identity_auto_join')`,
            [memberId, userId, community.communityId]
          );
        }

        joinedCommunityIds.push(community.communityId);
        log.info({ userId, communityId: community.communityId, identityId }, 'Auto-joined user to identity community');
      }
    });

    return joinedCommunityIds;
  },

  /**
   * Get suggested communities for a user based on their identity
   * Excludes communities they're already a member of
   */
  async getSuggestedCommunities(userId: string): Promise<LinkedCommunity[]> {
    // Get user's identity
    const user = await queryOne<{ current_identity_id: string | null }>(
      'SELECT current_identity_id FROM users WHERE id = $1',
      [userId]
    );

    if (!user?.current_identity_id) {
      return [];
    }

    const rows = await queryAll<{
      community_id: number;
      name: string;
      description: string | null;
      slug: string;
      member_count: string;
      auto_join: boolean;
      priority: number;
    }>(
      `SELECT c.id as community_id, c.name, c.description, c.slug,
              (SELECT COUNT(*) FROM community_members WHERE community_id = c.id AND status = 'active') as member_count,
              icl.auto_join, icl.priority
       FROM identity_community_links icl
       JOIN communities c ON c.id = icl.community_id
       WHERE icl.identity_id = $1
         AND NOT EXISTS (
           SELECT 1 FROM community_members cm
           WHERE cm.user_id = $2 AND cm.community_id = c.id AND cm.status = 'active'
         )
       ORDER BY icl.priority ASC, c.name ASC`,
      [user.current_identity_id, userId]
    );

    return rows.map((r) => ({
      communityId: r.community_id,
      communityName: r.name,
      communityDescription: r.description || undefined,
      communitySlug: r.slug,
      memberCount: parseInt(r.member_count),
      isDefault: r.auto_join,
      priority: r.priority,
    }));
  },

  /**
   * Get all identities with their linked communities
   */
  async getAllIdentitiesWithCommunities(): Promise<IdentitySuggestion[]> {
    const identities = await queryAll<{ id: string; name: string }>(
      'SELECT id, name FROM identities ORDER BY name'
    );

    const results: IdentitySuggestion[] = [];

    for (const identity of identities) {
      const communities = await this.getLinkedCommunities(identity.id);
      results.push({
        identityId: identity.id,
        identityName: identity.name,
        communities,
      });
    }

    return results;
  },

  /**
   * Handle identity change for a user
   * - Leave old identity's auto-join communities (optional)
   * - Join new identity's default communities
   */
  async handleIdentityChange(
    userId: string,
    oldIdentityId: string | null,
    newIdentityId: string,
    options: { leaveOldCommunities?: boolean } = {}
  ): Promise<{ joined: number[]; left: number[] }> {
    const { leaveOldCommunities = false } = options;

    let leftCommunities: number[] = [];
    let joinedCommunities: number[] = [];

    await transaction(async (client) => {
      // Optionally leave old identity's auto-joined communities
      if (leaveOldCommunities && oldIdentityId) {
        const oldDefaults = await this.getDefaultCommunities(oldIdentityId);
        const newDefaults = await this.getDefaultCommunities(newIdentityId);
        const newDefaultIds = new Set(newDefaults.map((c) => c.communityId));

        for (const community of oldDefaults) {
          // Only leave if not also in new identity's defaults
          if (!newDefaultIds.has(community.communityId)) {
            // Check if joined via auto-join
            const membership = await client.query(
              `SELECT id FROM community_members
               WHERE user_id = $1 AND community_id = $2 AND joined_by = 'identity_auto_join'`,
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

      // Update user's current identity
      await client.query(
        'UPDATE users SET current_identity_id = $1, updated_at = NOW() WHERE id = $2',
        [newIdentityId, userId]
      );
    });

    // Join new identity's default communities
    joinedCommunities = await this.autoJoinDefaultCommunities(userId, newIdentityId);

    return {
      joined: joinedCommunities,
      left: leftCommunities,
    };
  },

  /**
   * Bulk link communities to an identity (admin function)
   */
  async bulkLinkCommunities(
    identityId: string,
    communityLinks: Array<{ communityId: number; isDefault?: boolean; priority?: number }>
  ): Promise<number> {
    let linked = 0;

    await transaction(async (client) => {
      for (const link of communityLinks) {
        await client.query(
          `INSERT INTO identity_community_links (id, identity_id, community_id, auto_join, recommended, priority)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT DO NOTHING`,
          [
            `icl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            identityId,
            link.communityId,
            link.isDefault ?? false,
            true,
            link.priority ?? 100,
          ]
        );
        linked++;
      }
    });

    return linked;
  },
};

export default identityCommunitiesService;
