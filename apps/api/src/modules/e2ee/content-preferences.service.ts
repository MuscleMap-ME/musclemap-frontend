/**
 * Content Preferences & Age Verification Service
 *
 * Handles:
 * - Age verification (self-declaration, payment, ID)
 * - Minor protection enforcement
 * - Adult content preferences
 * - NSFW thresholds and auto-moderation
 * - Messaging privacy settings
 */

import crypto from 'crypto';
import { queryOne, queryAll, query, transaction } from '../../db/client';
import { loggers } from '../../lib/logger';
import { generateRandomId } from './crypto';

const log = loggers.core;

// ============================================
// TYPES
// ============================================

export interface ContentPreferences {
  userId: string;

  // Age verification
  isMinor: boolean;
  ageVerified: boolean;
  ageVerificationMethod?: 'self' | 'payment' | 'id';
  ageVerifiedAt?: Date;

  // Adult content
  allowAdultContent: boolean;
  showAdultContentWarning: boolean;
  canSendAdultContent: boolean;

  // Display
  displayAge: boolean;
  displayAgeValue?: number;

  // Thresholds
  nsfwBlockThreshold: number;
  nsfwBlurThreshold: number;

  // Auto-moderation
  autoBlockNsfw: boolean;
  autoReportIllegal: boolean;
}

export interface MessagingPrivacy {
  userId: string;
  whoCanMessage: 'everyone' | 'mutuals' | 'friends' | 'nobody';
  whoCanSendFiles: 'everyone' | 'mutuals' | 'friends' | 'nobody';
  whoCanSeeOnline: 'everyone' | 'mutuals' | 'friends' | 'nobody';
  whoCanSeeReadReceipts: 'everyone' | 'mutuals' | 'friends' | 'nobody';
  whoCanSeeTyping: 'everyone' | 'mutuals' | 'friends' | 'nobody';
  requireMessageRequest: boolean;
  autoDeleteMessages: boolean;
  autoDeleteHours: number;
  allowedFileTypes: {
    images: boolean;
    videos: boolean;
    audio: boolean;
    documents: boolean;
  };
  maxFileSizeMb: number;
  e2eeRequired: boolean;
  allowNonE2eeFallback: boolean;
}

export interface TrustScore {
  userId: string;
  trustScore: number;
  accountAgeScore: number;
  verificationScore: number;
  activityScore: number;
  reportScore: number;
  isTrustedSender: boolean;
  isRestricted: boolean;
  isShadowbanned: boolean;
  maxNewConversationsPerDay: number;
  maxMessagesPerMinute: number;
  maxFilesPerDay: number;
  totalReportsReceived: number;
  totalReportsUpheld: number;
  totalReportsDismissed: number;
}

export interface AgeVerificationResult {
  verified: boolean;
  isMinor: boolean;
  method: 'self' | 'payment' | 'id';
  error?: string;
}

// ============================================
// SERVICE
// ============================================

export const contentPreferencesService = {
  // ==========================================
  // CONTENT PREFERENCES
  // ==========================================

  /**
   * Get or create content preferences for a user
   */
  async getContentPreferences(userId: string): Promise<ContentPreferences> {
    let prefs = await queryOne<{
      user_id: string;
      is_minor: boolean;
      age_verified: boolean;
      age_verification_method: string | null;
      age_verified_at: Date | null;
      allow_adult_content: boolean;
      show_adult_content_warning: boolean;
      can_send_adult_content: boolean;
      display_age: boolean;
      display_age_value: number | null;
      nsfw_block_threshold: number;
      nsfw_blur_threshold: number;
      auto_block_nsfw: boolean;
      auto_report_illegal: boolean;
    }>(
      `SELECT * FROM user_content_preferences WHERE user_id = $1`,
      [userId]
    );

    // Create default if not exists
    if (!prefs) {
      await query(
        `INSERT INTO user_content_preferences (user_id) VALUES ($1)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );

      prefs = await queryOne(
        `SELECT * FROM user_content_preferences WHERE user_id = $1`,
        [userId]
      );
    }

    if (!prefs) {
      throw new Error('Failed to create content preferences');
    }

    return {
      userId: prefs.user_id,
      isMinor: prefs.is_minor,
      ageVerified: prefs.age_verified,
      ageVerificationMethod: prefs.age_verification_method as 'self' | 'payment' | 'id' | undefined,
      ageVerifiedAt: prefs.age_verified_at || undefined,
      allowAdultContent: prefs.allow_adult_content,
      showAdultContentWarning: prefs.show_adult_content_warning,
      canSendAdultContent: prefs.can_send_adult_content,
      displayAge: prefs.display_age,
      displayAgeValue: prefs.display_age_value || undefined,
      nsfwBlockThreshold: prefs.nsfw_block_threshold,
      nsfwBlurThreshold: prefs.nsfw_blur_threshold,
      autoBlockNsfw: prefs.auto_block_nsfw,
      autoReportIllegal: prefs.auto_report_illegal,
    };
  },

  /**
   * Update content preferences
   */
  async updateContentPreferences(
    userId: string,
    updates: Partial<Omit<ContentPreferences, 'userId' | 'isMinor' | 'ageVerified' | 'ageVerificationMethod' | 'ageVerifiedAt'>>
  ): Promise<ContentPreferences> {
    // Check if user is a minor - they cannot enable adult content
    const currentPrefs = await this.getContentPreferences(userId);

    if (currentPrefs.isMinor) {
      // Force-disable adult content for minors
      updates.allowAdultContent = false;
      updates.canSendAdultContent = false;
    }

    // Build update query
    const setClauses: string[] = ['updated_at = NOW()'];
    const params: any[] = [userId];
    let paramIndex = 2;

    if (updates.allowAdultContent !== undefined) {
      setClauses.push(`allow_adult_content = $${paramIndex}`);
      params.push(updates.allowAdultContent);
      paramIndex++;
    }

    if (updates.showAdultContentWarning !== undefined) {
      setClauses.push(`show_adult_content_warning = $${paramIndex}`);
      params.push(updates.showAdultContentWarning);
      paramIndex++;
    }

    if (updates.canSendAdultContent !== undefined) {
      // Can only enable if age verified and not minor
      const canEnable = !currentPrefs.isMinor && currentPrefs.ageVerified;
      setClauses.push(`can_send_adult_content = $${paramIndex}`);
      params.push(canEnable ? updates.canSendAdultContent : false);
      paramIndex++;
    }

    if (updates.displayAge !== undefined) {
      setClauses.push(`display_age = $${paramIndex}`);
      params.push(updates.displayAge);
      paramIndex++;
    }

    if (updates.displayAgeValue !== undefined) {
      setClauses.push(`display_age_value = $${paramIndex}`);
      params.push(updates.displayAgeValue);
      paramIndex++;
    }

    if (updates.nsfwBlockThreshold !== undefined) {
      setClauses.push(`nsfw_block_threshold = $${paramIndex}`);
      params.push(Math.max(0, Math.min(1, updates.nsfwBlockThreshold)));
      paramIndex++;
    }

    if (updates.nsfwBlurThreshold !== undefined) {
      setClauses.push(`nsfw_blur_threshold = $${paramIndex}`);
      params.push(Math.max(0, Math.min(1, updates.nsfwBlurThreshold)));
      paramIndex++;
    }

    if (updates.autoBlockNsfw !== undefined) {
      setClauses.push(`auto_block_nsfw = $${paramIndex}`);
      params.push(updates.autoBlockNsfw);
      paramIndex++;
    }

    if (updates.autoReportIllegal !== undefined) {
      setClauses.push(`auto_report_illegal = $${paramIndex}`);
      params.push(updates.autoReportIllegal);
      paramIndex++;
    }

    await query(
      `UPDATE user_content_preferences SET ${setClauses.join(', ')} WHERE user_id = $1`,
      params
    );

    return this.getContentPreferences(userId);
  },

  // ==========================================
  // AGE VERIFICATION
  // ==========================================

  /**
   * Verify user's age via self-declaration
   */
  async verifyAgeSelfDeclaration(
    userId: string,
    dateOfBirth: Date
  ): Promise<AgeVerificationResult> {
    // Calculate age
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }

    // Minimum age check (13 for platform, 18 for adult content)
    if (age < 13) {
      return {
        verified: false,
        isMinor: true,
        method: 'self',
        error: 'You must be at least 13 years old to use MuscleMap',
      };
    }

    const isMinor = age < 18;

    await transaction(async (client) => {
      // Update content preferences
      await client.query(
        `UPDATE user_content_preferences SET
           is_minor = $2,
           age_verified = TRUE,
           age_verification_method = 'self',
           age_verified_at = NOW(),
           allow_adult_content = CASE WHEN $2 THEN FALSE ELSE allow_adult_content END,
           can_send_adult_content = CASE WHEN $2 THEN FALSE ELSE can_send_adult_content END,
           updated_at = NOW()
         WHERE user_id = $1`,
        [userId, isMinor]
      );

      // Update users table
      await client.query(
        `UPDATE users SET is_minor = $2 WHERE id = $1`,
        [userId, isMinor]
      );

      // If minor, enforce restrictions immediately
      if (isMinor) {
        await this.enforceMinorRestrictionsInternal(client, userId);
      }
    });

    log.info(
      { userId, isMinor, method: 'self' },
      'Age verification completed'
    );

    return {
      verified: true,
      isMinor,
      method: 'self',
    };
  },

  /**
   * Enforce minor restrictions
   */
  async enforceMinorRestrictions(userId: string): Promise<void> {
    await transaction(async (client) => {
      await this.enforceMinorRestrictionsInternal(client, userId);
    });
  },

  /**
   * Internal: Enforce minor restrictions within transaction
   */
  async enforceMinorRestrictionsInternal(client: any, userId: string): Promise<void> {
    // Disable adult content
    await client.query(
      `UPDATE user_content_preferences SET
         allow_adult_content = FALSE,
         can_send_adult_content = FALSE,
         updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );

    // Set restrictive messaging privacy
    await client.query(
      `UPDATE user_messaging_privacy SET
         who_can_message = 'friends',
         who_can_send_files = 'friends',
         require_message_request = TRUE,
         updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );

    // Update trust score to restrict new conversations
    await client.query(
      `UPDATE user_trust_scores SET
         max_new_conversations_per_day = 10,
         updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );

    log.info({ userId }, 'Minor restrictions enforced');
  },

  // ==========================================
  // MESSAGING PRIVACY
  // ==========================================

  /**
   * Get or create messaging privacy settings
   */
  async getMessagingPrivacy(userId: string): Promise<MessagingPrivacy> {
    let privacy = await queryOne<{
      user_id: string;
      who_can_message: string;
      who_can_send_files: string;
      who_can_see_online: string;
      who_can_see_read_receipts: string;
      who_can_see_typing: string;
      require_message_request: boolean;
      auto_delete_messages: boolean;
      auto_delete_hours: number;
      allowed_file_types: { images: boolean; videos: boolean; audio: boolean; documents: boolean };
      max_file_size_mb: number;
      e2ee_required: boolean;
      allow_non_e2ee_fallback: boolean;
    }>(
      `SELECT * FROM user_messaging_privacy WHERE user_id = $1`,
      [userId]
    );

    if (!privacy) {
      await query(
        `INSERT INTO user_messaging_privacy (user_id) VALUES ($1)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );

      privacy = await queryOne(
        `SELECT * FROM user_messaging_privacy WHERE user_id = $1`,
        [userId]
      );
    }

    if (!privacy) {
      throw new Error('Failed to create messaging privacy');
    }

    return {
      userId: privacy.user_id,
      whoCanMessage: privacy.who_can_message as MessagingPrivacy['whoCanMessage'],
      whoCanSendFiles: privacy.who_can_send_files as MessagingPrivacy['whoCanSendFiles'],
      whoCanSeeOnline: privacy.who_can_see_online as MessagingPrivacy['whoCanSeeOnline'],
      whoCanSeeReadReceipts: privacy.who_can_see_read_receipts as MessagingPrivacy['whoCanSeeReadReceipts'],
      whoCanSeeTyping: privacy.who_can_see_typing as MessagingPrivacy['whoCanSeeTyping'],
      requireMessageRequest: privacy.require_message_request,
      autoDeleteMessages: privacy.auto_delete_messages,
      autoDeleteHours: privacy.auto_delete_hours,
      allowedFileTypes: privacy.allowed_file_types,
      maxFileSizeMb: privacy.max_file_size_mb,
      e2eeRequired: privacy.e2ee_required,
      allowNonE2eeFallback: privacy.allow_non_e2ee_fallback,
    };
  },

  /**
   * Update messaging privacy settings
   */
  async updateMessagingPrivacy(
    userId: string,
    updates: Partial<Omit<MessagingPrivacy, 'userId'>>
  ): Promise<MessagingPrivacy> {
    const setClauses: string[] = ['updated_at = NOW()'];
    const params: any[] = [userId];
    let paramIndex = 2;

    const privacyLevelFields = [
      'whoCanMessage',
      'whoCanSendFiles',
      'whoCanSeeOnline',
      'whoCanSeeReadReceipts',
      'whoCanSeeTyping',
    ] as const;

    const columnNames: Record<string, string> = {
      whoCanMessage: 'who_can_message',
      whoCanSendFiles: 'who_can_send_files',
      whoCanSeeOnline: 'who_can_see_online',
      whoCanSeeReadReceipts: 'who_can_see_read_receipts',
      whoCanSeeTyping: 'who_can_see_typing',
    };

    for (const field of privacyLevelFields) {
      if (updates[field] !== undefined) {
        const validValues = ['everyone', 'mutuals', 'friends', 'nobody'];
        if (!validValues.includes(updates[field]!)) {
          throw new Error(`Invalid value for ${field}`);
        }
        setClauses.push(`${columnNames[field]} = $${paramIndex}`);
        params.push(updates[field]);
        paramIndex++;
      }
    }

    if (updates.requireMessageRequest !== undefined) {
      setClauses.push(`require_message_request = $${paramIndex}`);
      params.push(updates.requireMessageRequest);
      paramIndex++;
    }

    if (updates.autoDeleteMessages !== undefined) {
      setClauses.push(`auto_delete_messages = $${paramIndex}`);
      params.push(updates.autoDeleteMessages);
      paramIndex++;
    }

    if (updates.autoDeleteHours !== undefined) {
      const hours = Math.max(1, Math.min(8760, updates.autoDeleteHours)); // 1 hour to 1 year
      setClauses.push(`auto_delete_hours = $${paramIndex}`);
      params.push(hours);
      paramIndex++;
    }

    if (updates.allowedFileTypes !== undefined) {
      setClauses.push(`allowed_file_types = $${paramIndex}`);
      params.push(JSON.stringify(updates.allowedFileTypes));
      paramIndex++;
    }

    if (updates.maxFileSizeMb !== undefined) {
      const maxSize = Math.max(1, Math.min(50, updates.maxFileSizeMb)); // 1-50 MB
      setClauses.push(`max_file_size_mb = $${paramIndex}`);
      params.push(maxSize);
      paramIndex++;
    }

    if (updates.e2eeRequired !== undefined) {
      setClauses.push(`e2ee_required = $${paramIndex}`);
      params.push(updates.e2eeRequired);
      paramIndex++;
    }

    if (updates.allowNonE2eeFallback !== undefined) {
      setClauses.push(`allow_non_e2ee_fallback = $${paramIndex}`);
      params.push(updates.allowNonE2eeFallback);
      paramIndex++;
    }

    await query(
      `UPDATE user_messaging_privacy SET ${setClauses.join(', ')} WHERE user_id = $1`,
      params
    );

    return this.getMessagingPrivacy(userId);
  },

  // ==========================================
  // TRUST SCORES
  // ==========================================

  /**
   * Get or create trust score for a user
   */
  async getTrustScore(userId: string): Promise<TrustScore> {
    let score = await queryOne<{
      user_id: string;
      trust_score: number;
      account_age_score: number;
      verification_score: number;
      activity_score: number;
      report_score: number;
      is_trusted_sender: boolean;
      is_restricted: boolean;
      is_shadowbanned: boolean;
      max_new_conversations_per_day: number;
      max_messages_per_minute: number;
      max_files_per_day: number;
      total_reports_received: number;
      total_reports_upheld: number;
      total_reports_dismissed: number;
    }>(
      `SELECT * FROM user_trust_scores WHERE user_id = $1`,
      [userId]
    );

    if (!score) {
      // Get user's account age for initial score
      const user = await queryOne<{ created_at: Date }>(
        `SELECT created_at FROM users WHERE id = $1`,
        [userId]
      );

      const accountAgeDays = user
        ? Math.floor((Date.now() - user.created_at.getTime()) / (24 * 60 * 60 * 1000))
        : 0;

      const accountAgeScore = Math.min(30, accountAgeDays);
      const initialTrustScore = 50 + accountAgeScore;

      await query(
        `INSERT INTO user_trust_scores (user_id, account_age_score, trust_score)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId, accountAgeScore, initialTrustScore]
      );

      score = await queryOne(
        `SELECT * FROM user_trust_scores WHERE user_id = $1`,
        [userId]
      );
    }

    if (!score) {
      throw new Error('Failed to create trust score');
    }

    return {
      userId: score.user_id,
      trustScore: score.trust_score,
      accountAgeScore: score.account_age_score,
      verificationScore: score.verification_score,
      activityScore: score.activity_score,
      reportScore: score.report_score,
      isTrustedSender: score.is_trusted_sender,
      isRestricted: score.is_restricted,
      isShadowbanned: score.is_shadowbanned,
      maxNewConversationsPerDay: score.max_new_conversations_per_day,
      maxMessagesPerMinute: score.max_messages_per_minute,
      maxFilesPerDay: score.max_files_per_day,
      totalReportsReceived: score.total_reports_received,
      totalReportsUpheld: score.total_reports_upheld,
      totalReportsDismissed: score.total_reports_dismissed,
    };
  },

  /**
   * Recalculate trust score for a user
   */
  async recalculateTrustScore(userId: string): Promise<TrustScore> {
    const user = await queryOne<{ created_at: Date; e2ee_enabled: boolean }>(
      `SELECT created_at, e2ee_enabled FROM users WHERE id = $1`,
      [userId]
    );

    if (!user) {
      throw new Error('User not found');
    }

    const prefs = await this.getContentPreferences(userId);

    // Calculate component scores
    const accountAgeDays = Math.floor(
      (Date.now() - user.created_at.getTime()) / (24 * 60 * 60 * 1000)
    );
    const accountAgeScore = Math.min(30, accountAgeDays); // Max 30 points

    let verificationScore = 0;
    if (prefs.ageVerified) {
      verificationScore += 10;
      if (prefs.ageVerificationMethod === 'id') {
        verificationScore += 10; // Bonus for ID verification
      }
    }

    // Get activity score based on messages sent in last 30 days
    const activityResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM encrypted_messages
       WHERE sender_id = $1 AND created_at > NOW() - INTERVAL '30 days'`,
      [userId]
    );
    const messageCount = parseInt(activityResult?.count || '0');
    const activityScore = Math.min(20, Math.floor(messageCount / 10)); // Max 20 points

    // Get report score from existing record
    const currentScore = await queryOne<{ report_score: number }>(
      `SELECT report_score FROM user_trust_scores WHERE user_id = $1`,
      [userId]
    );
    const reportScore = currentScore?.report_score || 50;

    // Calculate total trust score
    const trustScore = Math.min(100, Math.max(0,
      accountAgeScore + verificationScore + activityScore + (reportScore - 50)
    ));

    // Update trust score
    await query(
      `UPDATE user_trust_scores SET
         account_age_score = $2,
         verification_score = $3,
         activity_score = $4,
         trust_score = $5,
         calculated_at = NOW(),
         updated_at = NOW()
       WHERE user_id = $1`,
      [userId, accountAgeScore, verificationScore, activityScore, trustScore]
    );

    return this.getTrustScore(userId);
  },

  // ==========================================
  // PERMISSION CHECKS
  // ==========================================

  /**
   * Check if sender can message recipient
   */
  async canMessageUser(
    senderId: string,
    recipientId: string
  ): Promise<{ canMessage: boolean; reason?: string; requiresRequest: boolean }> {
    // Get recipient's privacy settings
    const privacy = await this.getMessagingPrivacy(recipientId);

    // Check recipient's messaging setting
    if (privacy.whoCanMessage === 'nobody') {
      return { canMessage: false, reason: 'User has disabled messaging', requiresRequest: false };
    }

    // Check if sender is blocked
    const isBlocked = await queryOne<{ id: string }>(
      `SELECT id FROM user_blocks
       WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)`,
      [senderId, recipientId]
    );

    if (isBlocked) {
      return { canMessage: false, reason: 'Cannot message this user', requiresRequest: false };
    }

    // Get sender's trust score and content preferences
    const senderTrust = await this.getTrustScore(senderId);
    const senderPrefs = await this.getContentPreferences(senderId);
    const recipientPrefs = await this.getContentPreferences(recipientId);

    // Check if sender is restricted or shadowbanned
    if (senderTrust.isRestricted || senderTrust.isShadowbanned) {
      return { canMessage: false, reason: 'Your account is restricted', requiresRequest: false };
    }

    // Minor protection: adults with adult content enabled cannot message minors
    if (senderPrefs.canSendAdultContent && recipientPrefs.isMinor) {
      return { canMessage: false, reason: 'Cannot message this user', requiresRequest: false };
    }

    // Check relationship-based permissions
    if (privacy.whoCanMessage === 'friends') {
      const areFriends = await this.areFriends(senderId, recipientId);
      if (!areFriends) {
        return { canMessage: false, reason: 'Only friends can message this user', requiresRequest: true };
      }
    } else if (privacy.whoCanMessage === 'mutuals') {
      const areMutual = await this.areMutualFollowers(senderId, recipientId);
      if (!areMutual) {
        return { canMessage: false, reason: 'Only mutual followers can message this user', requiresRequest: true };
      }
    }

    // Check if message request is required
    const existingConversation = await queryOne<{ id: string }>(
      `SELECT c.id FROM conversations c
       JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = $1
       JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = $2
       WHERE c.type = 'direct'`,
      [senderId, recipientId]
    );

    const requiresRequest = !existingConversation && privacy.requireMessageRequest;

    return { canMessage: true, requiresRequest };
  },

  /**
   * Check if users are friends
   */
  async areFriends(userId1: string, userId2: string): Promise<boolean> {
    const result = await queryOne<{ status: string }>(
      `SELECT status FROM friendships
       WHERE ((user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1))
         AND status = 'accepted'`,
      [userId1, userId2]
    );

    return !!result;
  },

  /**
   * Check if users are mutual followers
   */
  async areMutualFollowers(userId1: string, userId2: string): Promise<boolean> {
    const result = await queryOne<{ mutual: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM follows f1
         JOIN follows f2 ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id
         WHERE f1.follower_id = $1 AND f1.following_id = $2
       ) as mutual`,
      [userId1, userId2]
    );

    return result?.mutual || false;
  },

  /**
   * Check if sender can send files to recipient
   */
  async canSendFiles(
    senderId: string,
    recipientId: string
  ): Promise<{ canSend: boolean; reason?: string; allowedTypes?: string[] }> {
    const privacy = await this.getMessagingPrivacy(recipientId);

    if (privacy.whoCanSendFiles === 'nobody') {
      return { canSend: false, reason: 'User has disabled file attachments' };
    }

    if (privacy.whoCanSendFiles === 'friends') {
      const areFriends = await this.areFriends(senderId, recipientId);
      if (!areFriends) {
        return { canSend: false, reason: 'Only friends can send files to this user' };
      }
    } else if (privacy.whoCanSendFiles === 'mutuals') {
      const areMutual = await this.areMutualFollowers(senderId, recipientId);
      if (!areMutual) {
        return { canSend: false, reason: 'Only mutual followers can send files to this user' };
      }
    }

    // Get allowed file types
    const allowedTypes = Object.entries(privacy.allowedFileTypes)
      .filter(([_, allowed]) => allowed)
      .map(([type]) => type);

    return { canSend: true, allowedTypes };
  },
};

export default contentPreferencesService;
