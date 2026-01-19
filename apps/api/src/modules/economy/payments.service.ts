/**
 * Payments Service
 *
 * Handles real money to credits conversion:
 * - Credit package management
 * - Stripe checkout integration
 * - PayPal integration (planned)
 * - Purchase tracking and webhooks
 *
 * Core Equation: 1 penny = 1 credit = 1 Training Unit (TU)
 * Minimum Purchase: $1.00 = 100 credits
 */

import crypto from 'crypto';
import Stripe from 'stripe';
import { queryOne, queryAll, query } from '../../db/client';
import { loggers } from '../../lib/logger';
import { creditService } from './credit.service';
import { earnEventsService } from './earnEvents.service';

const log = loggers.economy;

// Initialize Stripe if key is available
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-12-15.clover' })
  : null;

export interface CreditPackage {
  id: string;
  name: string;
  description?: string;
  priceCents: number;
  credits: number;
  bonusCredits: number;
  bonusPercent: number;
  totalCredits: number;
  popular: boolean;
  bestValue: boolean;
  displayOrder: number;
  icon?: string;
  color?: string;
  enabled: boolean;
  stripePriceId?: string;
}

export interface Purchase {
  id: string;
  userId: string;
  packageId?: string;
  amountCents: number;
  credits: number;
  bonusCredits: number;
  paymentMethod: string;
  paymentProvider: string;
  stripePaymentId?: string;
  stripeSessionId?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  createdAt: Date;
  completedAt?: Date;
}

export interface CheckoutSession {
  sessionId: string;
  sessionUrl: string;
  packageId: string;
  credits: number;
  bonusCredits: number;
  amountCents: number;
}

export const paymentsService = {
  /**
   * Get all credit packages
   */
  async getPackages(enabledOnly: boolean = true): Promise<CreditPackage[]> {
    const rows = await queryAll<{
      id: string;
      name: string;
      description: string | null;
      price_cents: number;
      credits: number;
      bonus_credits: number;
      bonus_percent: string;
      popular: boolean;
      best_value: boolean;
      display_order: number;
      icon: string | null;
      color: string | null;
      enabled: boolean;
      stripe_price_id: string | null;
    }>(
      enabledOnly
        ? 'SELECT * FROM credit_packages WHERE enabled = true ORDER BY display_order'
        : 'SELECT * FROM credit_packages ORDER BY display_order',
      []
    );

    return rows.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description || undefined,
      priceCents: r.price_cents,
      credits: r.credits,
      bonusCredits: r.bonus_credits,
      bonusPercent: parseFloat(r.bonus_percent),
      totalCredits: r.credits + r.bonus_credits,
      popular: r.popular,
      bestValue: r.best_value,
      displayOrder: r.display_order,
      icon: r.icon || undefined,
      color: r.color || undefined,
      enabled: r.enabled,
      stripePriceId: r.stripe_price_id || undefined,
    }));
  },

  /**
   * Get a specific package by ID
   */
  async getPackage(packageId: string): Promise<CreditPackage | null> {
    const row = await queryOne<{
      id: string;
      name: string;
      description: string | null;
      price_cents: number;
      credits: number;
      bonus_credits: number;
      bonus_percent: string;
      popular: boolean;
      best_value: boolean;
      display_order: number;
      icon: string | null;
      color: string | null;
      enabled: boolean;
      stripe_price_id: string | null;
    }>('SELECT * FROM credit_packages WHERE id = $1', [packageId]);

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      priceCents: row.price_cents,
      credits: row.credits,
      bonusCredits: row.bonus_credits,
      bonusPercent: parseFloat(row.bonus_percent),
      totalCredits: row.credits + row.bonus_credits,
      popular: row.popular,
      bestValue: row.best_value,
      displayOrder: row.display_order,
      icon: row.icon || undefined,
      color: row.color || undefined,
      enabled: row.enabled,
      stripePriceId: row.stripe_price_id || undefined,
    };
  },

  /**
   * Create a Stripe checkout session for a credit package
   */
  async createStripeCheckout(
    userId: string,
    packageId: string,
    options: {
      successUrl: string;
      cancelUrl: string;
      quantity?: number;
    }
  ): Promise<CheckoutSession> {
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    const pkg = await this.getPackage(packageId);
    if (!pkg || !pkg.enabled) {
      throw new Error('Invalid or disabled package');
    }

    const quantity = options.quantity || 1;
    const totalCredits = pkg.totalCredits * quantity;
    const totalBonusCredits = pkg.bonusCredits * quantity;
    const totalAmountCents = pkg.priceCents * quantity;

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${pkg.name} - ${pkg.credits} Credits`,
              description: pkg.bonusCredits > 0
                ? `Plus ${pkg.bonusCredits} bonus credits (${pkg.bonusPercent}% bonus)!`
                : `${pkg.credits} MuscleMap Credits`,
              images: ['https://musclemap.me/logo.png'],
            },
            unit_amount: pkg.priceCents,
          },
          quantity,
        },
      ],
      metadata: {
        userId,
        packageId,
        credits: String(pkg.credits * quantity),
        bonusCredits: String(totalBonusCredits),
        totalCredits: String(totalCredits),
      },
      success_url: options.successUrl,
      cancel_url: options.cancelUrl,
      customer_email: undefined, // Will be filled from user data if available
    });

    // Record pending purchase
    const purchaseId = `pur_${crypto.randomBytes(12).toString('hex')}`;
    await query(
      `INSERT INTO purchases (id, user_id, package_id, amount_cents, credits, bonus_credits, payment_method, payment_provider, stripe_session_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'card', 'stripe', $7, 'pending')`,
      [purchaseId, userId, packageId, totalAmountCents, pkg.credits * quantity, totalBonusCredits, session.id]
    );

    log.info({
      purchaseId,
      userId,
      packageId,
      sessionId: session.id,
      credits: totalCredits,
      amountCents: totalAmountCents,
    }, 'Created Stripe checkout session');

    return {
      sessionId: session.id,
      sessionUrl: session.url!,
      packageId,
      credits: pkg.credits * quantity,
      bonusCredits: totalBonusCredits,
      amountCents: totalAmountCents,
    };
  },

  /**
   * Handle Stripe webhook for completed checkout
   */
  async handleStripeWebhook(event: Stripe.Event): Promise<void> {
    if (event.type !== 'checkout.session.completed') {
      return;
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const { userId, packageId, credits, bonusCredits, totalCredits } = session.metadata || {};

    if (!userId || !totalCredits) {
      log.error({ sessionId: session.id }, 'Missing metadata in checkout session');
      return;
    }

    const numCredits = parseInt(credits || '0');
    const numBonusCredits = parseInt(bonusCredits || '0');
    const numTotalCredits = parseInt(totalCredits);

    // Check if already processed
    const existingPurchase = await queryOne<{ id: string; status: string }>(
      'SELECT id, status FROM purchases WHERE stripe_session_id = $1',
      [session.id]
    );

    if (existingPurchase?.status === 'completed') {
      log.info({ sessionId: session.id }, 'Checkout already processed');
      return;
    }

    // Award credits
    const idempotencyKey = `stripe-checkout-${session.id}`;
    const creditResult = await creditService.addCredits(
      userId,
      numTotalCredits,
      'purchase.stripe',
      {
        sessionId: session.id,
        packageId,
        baseCredits: numCredits,
        bonusCredits: numBonusCredits,
        amountCents: session.amount_total,
        paymentIntentId: session.payment_intent,
      },
      idempotencyKey
    );

    if (!creditResult.success) {
      log.error({ sessionId: session.id, error: creditResult.error }, 'Failed to add credits');
      return;
    }

    // Update purchase record
    if (existingPurchase) {
      await query(
        `UPDATE purchases SET
           status = 'completed',
           stripe_payment_id = $1,
           completed_at = NOW()
         WHERE id = $2`,
        [session.payment_intent, existingPurchase.id]
      );
    } else {
      // Create purchase record if it doesn't exist
      const purchaseId = `pur_${crypto.randomBytes(12).toString('hex')}`;
      await query(
        `INSERT INTO purchases (id, user_id, package_id, amount_cents, credits, bonus_credits, payment_method, payment_provider, stripe_session_id, stripe_payment_id, status, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'card', 'stripe', $7, $8, 'completed', NOW())`,
        [purchaseId, userId, packageId, session.amount_total, numCredits, numBonusCredits, session.id, session.payment_intent]
      );
    }

    // Create earn event for UI celebration
    await earnEventsService.createEvent({
      userId,
      amount: numTotalCredits,
      source: 'purchase',
      sourceId: session.id,
      description: `Purchased ${numCredits} credits${numBonusCredits > 0 ? ` + ${numBonusCredits} bonus` : ''}`,
      forceAnimationType: 'celebration',
      forceIcon: 'credit-card',
      forceColor: '#22C55E',
    });

    log.info({
      userId,
      sessionId: session.id,
      totalCredits: numTotalCredits,
      amountCents: session.amount_total,
    }, 'Stripe checkout completed, credits awarded');
  },

  /**
   * Get user's purchase history
   */
  async getUserPurchases(
    userId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<Purchase[]> {
    const { limit = 50, offset = 0 } = options;

    const rows = await queryAll<{
      id: string;
      user_id: string;
      package_id: string | null;
      amount_cents: number;
      credits: number;
      bonus_credits: number | null;
      payment_method: string | null;
      payment_provider: string | null;
      stripe_payment_id: string | null;
      stripe_session_id: string | null;
      status: string;
      created_at: Date;
      completed_at: Date | null;
    }>(
      `SELECT * FROM purchases
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      packageId: r.package_id || undefined,
      amountCents: r.amount_cents,
      credits: r.credits,
      bonusCredits: r.bonus_credits || 0,
      paymentMethod: r.payment_method || 'card',
      paymentProvider: r.payment_provider || 'stripe',
      stripePaymentId: r.stripe_payment_id || undefined,
      stripeSessionId: r.stripe_session_id || undefined,
      status: r.status as Purchase['status'],
      createdAt: r.created_at,
      completedAt: r.completed_at || undefined,
    }));
  },

  /**
   * Get total revenue stats (admin)
   */
  async getRevenueStats(): Promise<{
    totalRevenueCents: number;
    totalCreditsIssued: number;
    purchaseCount: number;
    uniqueBuyers: number;
    todayRevenueCents: number;
    weekRevenueCents: number;
    monthRevenueCents: number;
  }> {
    const stats = await queryOne<{
      total_revenue: string;
      total_credits: string;
      purchase_count: string;
      unique_buyers: string;
    }>(
      `SELECT
         COALESCE(SUM(amount_cents), 0) as total_revenue,
         COALESCE(SUM(credits + COALESCE(bonus_credits, 0)), 0) as total_credits,
         COUNT(*) as purchase_count,
         COUNT(DISTINCT user_id) as unique_buyers
       FROM purchases
       WHERE status = 'completed'`,
      []
    );

    const todayStats = await queryOne<{ revenue: string }>(
      `SELECT COALESCE(SUM(amount_cents), 0) as revenue
       FROM purchases
       WHERE status = 'completed' AND completed_at >= CURRENT_DATE`,
      []
    );

    const weekStats = await queryOne<{ revenue: string }>(
      `SELECT COALESCE(SUM(amount_cents), 0) as revenue
       FROM purchases
       WHERE status = 'completed' AND completed_at >= DATE_TRUNC('week', CURRENT_DATE)`,
      []
    );

    const monthStats = await queryOne<{ revenue: string }>(
      `SELECT COALESCE(SUM(amount_cents), 0) as revenue
       FROM purchases
       WHERE status = 'completed' AND completed_at >= DATE_TRUNC('month', CURRENT_DATE)`,
      []
    );

    return {
      totalRevenueCents: parseInt(stats?.total_revenue || '0'),
      totalCreditsIssued: parseInt(stats?.total_credits || '0'),
      purchaseCount: parseInt(stats?.purchase_count || '0'),
      uniqueBuyers: parseInt(stats?.unique_buyers || '0'),
      todayRevenueCents: parseInt(todayStats?.revenue || '0'),
      weekRevenueCents: parseInt(weekStats?.revenue || '0'),
      monthRevenueCents: parseInt(monthStats?.revenue || '0'),
    };
  },

  /**
   * Calculate price for custom amount (for custom purchases)
   * 1 penny = 1 credit, minimum $1.00
   */
  calculateCustomPrice(credits: number): { credits: number; priceCents: number; bonusCredits: number } {
    if (credits < 100) {
      throw new Error('Minimum purchase is 100 credits ($1.00)');
    }

    // Bonus tiers for custom amounts
    let bonusPercent = 0;
    if (credits >= 20000) bonusPercent = 30;
    else if (credits >= 10000) bonusPercent = 25;
    else if (credits >= 5000) bonusPercent = 20;
    else if (credits >= 2500) bonusPercent = 15;
    else if (credits >= 1000) bonusPercent = 10;
    else if (credits >= 500) bonusPercent = 5;

    const bonusCredits = Math.floor(credits * (bonusPercent / 100));

    return {
      credits,
      priceCents: credits, // 1 penny = 1 credit
      bonusCredits,
    };
  },

  /**
   * Verify Stripe webhook signature
   */
  verifyStripeWebhook(payload: string, signature: string): Stripe.Event | null {
    if (!stripe) return null;

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      log.error('STRIPE_WEBHOOK_SECRET not configured');
      return null;
    }

    try {
      return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      log.error({ err }, 'Stripe webhook signature verification failed');
      return null;
    }
  },

  /**
   * Get the Stripe client instance (for subscription management)
   */
  getStripeClient(): Stripe | null {
    return stripe;
  },
};

export default paymentsService;
