/**
 * Dispute Service
 *
 * Handles disputes for classes, transfers, and other economy transactions.
 * Provides a workflow for reporting, investigating, and resolving disputes.
 */

import crypto from 'crypto';
import { queryOne, queryAll, query } from '../../db/client';
import { loggers } from '../../lib/logger';
import { ValidationError, NotFoundError, ForbiddenError } from '../../lib/errors';
import { escrowService } from './escrow.service';

const log = loggers.economy;

// Types
export type DisputeType = 'class_noshow' | 'class_quality' | 'transfer_fraud' | 'refund_request' | 'other';
export type DisputeStatus = 'open' | 'investigating' | 'pending_response' | 'resolved_reporter' | 'resolved_respondent' | 'resolved_split' | 'dismissed' | 'escalated';

export interface Dispute {
  id: string;
  reporterId: string;
  respondentId: string;
  disputeType: DisputeType;
  referenceType: string;
  referenceId: string;
  amountDisputed?: number;
  escrowId?: string;
  description: string;
  evidence: Array<{ type: string; url?: string; text?: string; uploadedAt: string }>;
  status: DisputeStatus;
  resolution?: string;
  resolutionAmount?: number;
  resolvedBy?: string;
  resolvedAt?: Date;
  deadline?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DisputeMessage {
  id: string;
  disputeId: string;
  senderId: string;
  isAdmin: boolean;
  message: string;
  attachments: string[];
  createdAt: Date;
}

export interface CreateDisputeInput {
  reporterId: string;
  respondentId: string;
  disputeType: DisputeType;
  referenceType: string;
  referenceId: string;
  amountDisputed?: number;
  escrowId?: string;
  description: string;
  evidence?: Array<{ type: string; url?: string; text?: string }>;
}

export const disputeService = {
  /**
   * Get economy setting value
   */
  async getSetting(key: string, defaultValue: number): Promise<number> {
    const row = await queryOne<{ value: string }>(
      `SELECT value FROM economy_settings WHERE key = $1`,
      [key]
    );
    return row ? JSON.parse(row.value) : defaultValue;
  },

  /**
   * Create a new dispute
   */
  async createDispute(input: CreateDisputeInput): Promise<Dispute> {
    const {
      reporterId,
      respondentId,
      disputeType,
      referenceType,
      referenceId,
      amountDisputed,
      escrowId,
      description,
      evidence = [],
    } = input;

    // Validate reporter and respondent are different
    if (reporterId === respondentId) {
      throw new ValidationError('Cannot create a dispute against yourself');
    }

    // Check for existing open dispute on same reference
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM economy_disputes
       WHERE reference_type = $1 AND reference_id = $2 AND status NOT IN ('dismissed', 'resolved_reporter', 'resolved_respondent', 'resolved_split')`,
      [referenceType, referenceId]
    );

    if (existing) {
      throw new ValidationError('A dispute is already open for this reference');
    }

    // Check dispute window for class disputes
    if (disputeType === 'class_noshow' || disputeType === 'class_quality') {
      const disputeWindowHours = await this.getSetting('dispute_window_hours', 48);
      const classRow = await queryOne<{ start_at: Date; status: string }>(
        `SELECT start_at, status FROM trainer_classes WHERE id = $1`,
        [referenceId]
      );

      if (classRow) {
        const classTime = new Date(classRow.start_at);
        const windowEnd = new Date(classTime.getTime() + disputeWindowHours * 60 * 60 * 1000);

        if (new Date() > windowEnd) {
          throw new ValidationError(`Dispute window has expired. Disputes must be filed within ${disputeWindowHours} hours of class completion.`);
        }
      }
    }

    // Mark escrow as disputed if provided
    if (escrowId) {
      await escrowService.dispute(escrowId);
    }

    const disputeId = `dispute_${crypto.randomBytes(12).toString('hex')}`;
    const disputeWindowHours = await this.getSetting('dispute_window_hours', 48);
    const deadline = new Date(Date.now() + disputeWindowHours * 60 * 60 * 1000);

    await query(
      `INSERT INTO economy_disputes (id, reporter_id, respondent_id, dispute_type, reference_type, reference_id, amount_disputed, escrow_id, description, evidence, deadline)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [disputeId, reporterId, respondentId, disputeType, referenceType, referenceId, amountDisputed || null, escrowId || null, description, JSON.stringify(evidence.map(e => ({ ...e, uploadedAt: new Date().toISOString() }))), deadline]
    );

    log.info({ disputeId, reporterId, respondentId, disputeType, referenceId }, 'Dispute created');

    return (await this.getDispute(disputeId))!;
  },

  /**
   * Get dispute by ID
   */
  async getDispute(disputeId: string): Promise<Dispute | null> {
    const row = await queryOne<{
      id: string;
      reporter_id: string;
      respondent_id: string;
      dispute_type: string;
      reference_type: string;
      reference_id: string;
      amount_disputed: number | null;
      escrow_id: string | null;
      description: string;
      evidence: string;
      status: string;
      resolution: string | null;
      resolution_amount: number | null;
      resolved_by: string | null;
      resolved_at: Date | null;
      deadline: Date | null;
      created_at: Date;
      updated_at: Date;
    }>(`SELECT * FROM economy_disputes WHERE id = $1`, [disputeId]);

    if (!row) return null;

    return {
      id: row.id,
      reporterId: row.reporter_id,
      respondentId: row.respondent_id,
      disputeType: row.dispute_type as DisputeType,
      referenceType: row.reference_type,
      referenceId: row.reference_id,
      amountDisputed: row.amount_disputed ?? undefined,
      escrowId: row.escrow_id ?? undefined,
      description: row.description,
      evidence: JSON.parse(row.evidence || '[]'),
      status: row.status as DisputeStatus,
      resolution: row.resolution ?? undefined,
      resolutionAmount: row.resolution_amount ?? undefined,
      resolvedBy: row.resolved_by ?? undefined,
      resolvedAt: row.resolved_at ?? undefined,
      deadline: row.deadline ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  /**
   * Get disputes for a user (as reporter or respondent)
   */
  async getUserDisputes(userId: string, options: {
    role?: 'reporter' | 'respondent' | 'all';
    status?: DisputeStatus;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ disputes: Dispute[]; total: number }> {
    const { role = 'all', status, limit = 50, offset = 0 } = options;

    let whereClause = role === 'reporter'
      ? 'reporter_id = $1'
      : role === 'respondent'
        ? 'respondent_id = $1'
        : '(reporter_id = $1 OR respondent_id = $1)';

    const params: unknown[] = [userId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    params.push(limit, offset);

    const rows = await queryAll<{
      id: string;
      reporter_id: string;
      respondent_id: string;
      dispute_type: string;
      reference_type: string;
      reference_id: string;
      amount_disputed: number | null;
      escrow_id: string | null;
      description: string;
      evidence: string;
      status: string;
      resolution: string | null;
      resolution_amount: number | null;
      resolved_by: string | null;
      resolved_at: Date | null;
      deadline: Date | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT * FROM economy_disputes WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM economy_disputes WHERE ${whereClause}`,
      params.slice(0, -2)
    );

    return {
      disputes: rows.map((row) => ({
        id: row.id,
        reporterId: row.reporter_id,
        respondentId: row.respondent_id,
        disputeType: row.dispute_type as DisputeType,
        referenceType: row.reference_type,
        referenceId: row.reference_id,
        amountDisputed: row.amount_disputed ?? undefined,
        escrowId: row.escrow_id ?? undefined,
        description: row.description,
        evidence: JSON.parse(row.evidence || '[]'),
        status: row.status as DisputeStatus,
        resolution: row.resolution ?? undefined,
        resolutionAmount: row.resolution_amount ?? undefined,
        resolvedBy: row.resolved_by ?? undefined,
        resolvedAt: row.resolved_at ?? undefined,
        deadline: row.deadline ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      total: parseInt(countResult?.count || '0'),
    };
  },

  /**
   * Add message to dispute
   */
  async addMessage(disputeId: string, senderId: string, message: string, isAdmin: boolean = false, attachments: string[] = []): Promise<DisputeMessage> {
    const dispute = await this.getDispute(disputeId);
    if (!dispute) {
      throw new NotFoundError('Dispute not found');
    }

    // Verify sender is involved or is admin
    if (!isAdmin && senderId !== dispute.reporterId && senderId !== dispute.respondentId) {
      throw new ForbiddenError('You are not authorized to message in this dispute');
    }

    // Check dispute is still open
    if (['dismissed', 'resolved_reporter', 'resolved_respondent', 'resolved_split'].includes(dispute.status)) {
      throw new ValidationError('Dispute is already closed');
    }

    const messageId = `dmsg_${crypto.randomBytes(12).toString('hex')}`;

    await query(
      `INSERT INTO dispute_messages (id, dispute_id, sender_id, is_admin, message, attachments)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [messageId, disputeId, senderId, isAdmin, message, JSON.stringify(attachments)]
    );

    // Update dispute status if respondent is replying
    if (senderId === dispute.respondentId && dispute.status === 'open') {
      await query(
        `UPDATE economy_disputes SET status = 'pending_response', updated_at = NOW() WHERE id = $1`,
        [disputeId]
      );
    }

    return {
      id: messageId,
      disputeId,
      senderId,
      isAdmin,
      message,
      attachments,
      createdAt: new Date(),
    };
  },

  /**
   * Get messages for a dispute
   */
  async getMessages(disputeId: string): Promise<DisputeMessage[]> {
    const rows = await queryAll<{
      id: string;
      dispute_id: string;
      sender_id: string;
      is_admin: boolean;
      message: string;
      attachments: string;
      created_at: Date;
    }>(
      `SELECT * FROM dispute_messages WHERE dispute_id = $1 ORDER BY created_at ASC`,
      [disputeId]
    );

    return rows.map((row) => ({
      id: row.id,
      disputeId: row.dispute_id,
      senderId: row.sender_id,
      isAdmin: row.is_admin,
      message: row.message,
      attachments: JSON.parse(row.attachments || '[]'),
      createdAt: row.created_at,
    }));
  },

  /**
   * Update dispute status (admin)
   */
  async updateStatus(disputeId: string, status: DisputeStatus, adminId: string): Promise<void> {
    const dispute = await this.getDispute(disputeId);
    if (!dispute) {
      throw new NotFoundError('Dispute not found');
    }

    await query(
      `UPDATE economy_disputes SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, disputeId]
    );

    log.info({ disputeId, status, adminId }, 'Dispute status updated');
  },

  /**
   * Resolve dispute (admin)
   */
  async resolve(disputeId: string, adminId: string, resolution: {
    status: 'resolved_reporter' | 'resolved_respondent' | 'resolved_split' | 'dismissed';
    resolution: string;
    resolutionAmount?: number;
    splitRatio?: number; // 0-1, amount to reporter
  }): Promise<void> {
    const dispute = await this.getDispute(disputeId);
    if (!dispute) {
      throw new NotFoundError('Dispute not found');
    }

    if (['dismissed', 'resolved_reporter', 'resolved_respondent', 'resolved_split'].includes(dispute.status)) {
      throw new ValidationError('Dispute is already resolved');
    }

    // Handle escrow if exists
    if (dispute.escrowId) {
      const hold = await escrowService.getHold(dispute.escrowId);
      if (hold && hold.status === 'disputed') {
        switch (resolution.status) {
          case 'resolved_reporter':
            // Refund to reporter
            await escrowService.refund(dispute.escrowId, adminId, `Dispute resolved in favor of reporter: ${resolution.resolution}`);
            break;
          case 'resolved_respondent':
            // Release to respondent
            await escrowService.release({
              escrowId: dispute.escrowId,
              releaseTo: dispute.respondentId,
              releasedBy: adminId,
              reason: `Dispute resolved in favor of respondent: ${resolution.resolution}`,
            });
            break;
          case 'resolved_split':
            // Split the escrow
            const splitRatio = resolution.splitRatio ?? 0.5;
            const reporterAmount = Math.floor(hold.amount * splitRatio);
            const _respondentAmount = hold.amount - reporterAmount;

            // First refund reporter's portion
            // Note: This is simplified - in production you'd want atomic handling
            await escrowService.release({
              escrowId: dispute.escrowId,
              releaseTo: dispute.reporterId,
              releaseAmount: reporterAmount,
              releasedBy: adminId,
              reason: `Dispute split resolution - reporter portion`,
            });
            break;
          case 'dismissed':
            // Release to original intended recipient
            if (hold.releaseTo) {
              await escrowService.release({
                escrowId: dispute.escrowId,
                releasedBy: adminId,
                reason: `Dispute dismissed: ${resolution.resolution}`,
              });
            }
            break;
        }
      }
    }

    // Update dispute
    await query(
      `UPDATE economy_disputes SET
         status = $1,
         resolution = $2,
         resolution_amount = $3,
         resolved_by = $4,
         resolved_at = NOW(),
         updated_at = NOW()
       WHERE id = $5`,
      [resolution.status, resolution.resolution, resolution.resolutionAmount || null, adminId, disputeId]
    );

    log.info({ disputeId, status: resolution.status, adminId }, 'Dispute resolved');
  },

  /**
   * Get pending disputes (admin)
   */
  async getPendingDisputes(options: {
    status?: DisputeStatus[];
    disputeType?: DisputeType;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ disputes: Dispute[]; total: number }> {
    const { status = ['open', 'investigating', 'pending_response'], disputeType, limit = 50, offset = 0 } = options;

    let whereClause = `status = ANY($1)`;
    const params: unknown[] = [status];
    let paramIndex = 2;

    if (disputeType) {
      whereClause += ` AND dispute_type = $${paramIndex++}`;
      params.push(disputeType);
    }

    params.push(limit, offset);

    const rows = await queryAll<{
      id: string;
      reporter_id: string;
      respondent_id: string;
      dispute_type: string;
      reference_type: string;
      reference_id: string;
      amount_disputed: number | null;
      escrow_id: string | null;
      description: string;
      evidence: string;
      status: string;
      resolution: string | null;
      resolution_amount: number | null;
      resolved_by: string | null;
      resolved_at: Date | null;
      deadline: Date | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT * FROM economy_disputes WHERE ${whereClause} ORDER BY deadline ASC NULLS LAST, created_at ASC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM economy_disputes WHERE ${whereClause}`,
      params.slice(0, -2)
    );

    return {
      disputes: rows.map((row) => ({
        id: row.id,
        reporterId: row.reporter_id,
        respondentId: row.respondent_id,
        disputeType: row.dispute_type as DisputeType,
        referenceType: row.reference_type,
        referenceId: row.reference_id,
        amountDisputed: row.amount_disputed ?? undefined,
        escrowId: row.escrow_id ?? undefined,
        description: row.description,
        evidence: JSON.parse(row.evidence || '[]'),
        status: row.status as DisputeStatus,
        resolution: row.resolution ?? undefined,
        resolutionAmount: row.resolution_amount ?? undefined,
        resolvedBy: row.resolved_by ?? undefined,
        resolvedAt: row.resolved_at ?? undefined,
        deadline: row.deadline ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      total: parseInt(countResult?.count || '0'),
    };
  },
};

export default disputeService;
