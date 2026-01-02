/**
 * Billing Module
 *
 * Handles:
 * 1. Stripe subscriptions for the $1/month unlimited plan
 * 2. One-time credit purchases (100 credits for $1)
 */

import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { db, transaction } from '../../db/client';
import { authenticateToken } from '../auth';
import { asyncHandler, ValidationError } from '../../lib/errors';
import { loggers } from '../../lib/logger';
import { config } from '../../config';
import crypto from 'crypto';

const log = loggers.economy;

// Initialize Stripe
const stripe = config.STRIPE_SECRET_KEY
  ? new Stripe(config.STRIPE_SECRET_KEY)
  : null;

// Subscription pricing
const SUBSCRIPTION_PRICE_AMOUNT = 100; // $1.00 in cents
const SUBSCRIPTION_PRICE_CURRENCY = 'usd';

// Credit purchase pricing - Simple: 100 credits for $1
const CREDIT_PACK_AMOUNT = 100; // $1.00 in cents
const CREDIT_PACK_CREDITS = 100;

interface SubscriptionRecord {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export const billingService = {
  /**
   * Get or create Stripe customer for user
   */
  async getOrCreateCustomer(userId: string, email: string): Promise<string> {
    if (!stripe) throw new ValidationError('Stripe not configured');

    // Check if user already has a customer ID
    const sub = await db.queryOne<{ stripe_customer_id: string }>(
      'SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1 AND stripe_customer_id IS NOT NULL LIMIT 1',
      [userId]
    );

    if (sub?.stripe_customer_id) {
      return sub.stripe_customer_id;
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email,
      metadata: { userId },
    });

    log.info('Created Stripe customer', { userId, customerId: customer.id });
    return customer.id;
  },

  /**
   * Create a checkout session for the $1/month subscription
   */
  async createCheckoutSession(userId: string, email: string): Promise<string> {
    if (!stripe) throw new ValidationError('Stripe not configured');

    const customerId = await this.getOrCreateCustomer(userId, email);

    // Check if user already has an active subscription
    const existing = await db.queryOne(
      "SELECT id FROM subscriptions WHERE user_id = $1 AND status = 'active'",
      [userId]
    );

    if (existing) {
      throw new ValidationError('You already have an active subscription');
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: SUBSCRIPTION_PRICE_CURRENCY,
            product_data: {
              name: 'MuscleMap Unlimited',
              description: 'Unlimited access to all MuscleMap features - no credit limits',
            },
            unit_amount: SUBSCRIPTION_PRICE_AMOUNT,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${config.FRONTEND_URL}/wallet?subscription=success`,
      cancel_url: `${config.FRONTEND_URL}/wallet?subscription=canceled`,
      metadata: {
        userId,
      },
    });

    log.info('Created checkout session', { userId, sessionId: session.id });
    return session.url!;
  },

  /**
   * Create a billing portal session for managing subscription
   */
  async createPortalSession(userId: string): Promise<string> {
    if (!stripe) throw new ValidationError('Stripe not configured');

    const sub = await db.queryOne<{ stripe_customer_id: string }>(
      'SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1 AND stripe_customer_id IS NOT NULL LIMIT 1',
      [userId]
    );

    if (!sub?.stripe_customer_id) {
      throw new ValidationError('No billing account found');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${config.FRONTEND_URL}/wallet`,
    });

    return session.url;
  },

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    log.info('Processing webhook', { type: event.type });

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Handle subscription checkout
        if (session.mode === 'subscription' && session.subscription && session.metadata?.userId) {
          await this.activateSubscription(
            session.metadata.userId,
            session.customer as string,
            session.subscription as string
          );
        }

        // Handle credit purchase
        if (session.mode === 'payment' && session.metadata?.type === 'credit_purchase') {
          const credits = parseInt(session.metadata.credits || '100', 10);
          await this.completeCreditPurchase(session.id, session.metadata.userId!, credits);
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.updateSubscriptionStatus(subscription);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          log.warn('Subscription payment failed', {
            subscriptionId: invoice.subscription,
            customerId: invoice.customer,
          });
        }
        break;
      }
    }
  },

  /**
   * Activate a new subscription
   */
  async activateSubscription(
    userId: string,
    customerId: string,
    subscriptionId: string
  ): Promise<void> {
    if (!stripe) return;

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    const id = `sub_${crypto.randomBytes(12).toString('hex')}`;
    const now = new Date().toISOString();

    await db.query(
      `INSERT INTO subscriptions (id, user_id, stripe_customer_id, stripe_subscription_id, status, current_period_start, current_period_end, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT(stripe_subscription_id) DO UPDATE SET
         status = EXCLUDED.status,
         current_period_start = EXCLUDED.current_period_start,
         current_period_end = EXCLUDED.current_period_end,
         updated_at = EXCLUDED.updated_at`,
      [
        id,
        userId,
        customerId,
        subscriptionId,
        subscription.status,
        new Date(subscription.current_period_start * 1000).toISOString(),
        new Date(subscription.current_period_end * 1000).toISOString(),
        now,
        now,
      ]
    );

    log.info('Subscription activated', { userId, subscriptionId, status: subscription.status });
  },

  /**
   * Update subscription status from webhook
   */
  async updateSubscriptionStatus(subscription: Stripe.Subscription): Promise<void> {
    const now = new Date().toISOString();

    await db.query(
      `UPDATE subscriptions
       SET status = $1,
           current_period_start = $2,
           current_period_end = $3,
           cancel_at_period_end = $4,
           updated_at = $5
       WHERE stripe_subscription_id = $6`,
      [
        subscription.status,
        new Date(subscription.current_period_start * 1000).toISOString(),
        new Date(subscription.current_period_end * 1000).toISOString(),
        subscription.cancel_at_period_end,
        now,
        subscription.id,
      ]
    );

    log.info('Subscription updated', { subscriptionId: subscription.id, status: subscription.status });
  },

  /**
   * Get user's subscription status
   */
  async getSubscription(userId: string): Promise<SubscriptionRecord | null> {
    return db.queryOne<SubscriptionRecord>(
      'SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
  },

  /**
   * Create a checkout session for credit purchase (100 credits for $1)
   */
  async createCreditCheckoutSession(userId: string, email: string): Promise<string> {
    if (!stripe) throw new ValidationError('Stripe not configured');

    const customerId = await this.getOrCreateCustomer(userId, email);

    // Create a one-time payment session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: SUBSCRIPTION_PRICE_CURRENCY,
            product_data: {
              name: 'MuscleMap Credits',
              description: '100 credits for workout prescriptions',
            },
            unit_amount: CREDIT_PACK_AMOUNT,
          },
          quantity: 1,
        },
      ],
      success_url: `${config.FRONTEND_URL}/wallet?credits=success`,
      cancel_url: `${config.FRONTEND_URL}/wallet?credits=canceled`,
      metadata: {
        userId,
        type: 'credit_purchase',
        credits: CREDIT_PACK_CREDITS.toString(),
      },
    });

    // Record the pending purchase
    const purchaseId = `purch_${crypto.randomBytes(12).toString('hex')}`;
    await db.query(
      `INSERT INTO purchases (id, user_id, tier_id, credits, amount_cents, status, stripe_session_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [purchaseId, userId, 'standard', CREDIT_PACK_CREDITS, CREDIT_PACK_AMOUNT, 'pending', session.id]
    );

    log.info('Created credit checkout session', { userId, sessionId: session.id, purchaseId });
    return session.url!;
  },

  /**
   * Complete a credit purchase (called from webhook)
   */
  async completeCreditPurchase(sessionId: string, userId: string, credits: number): Promise<void> {
    await transaction(async (client) => {
      const now = new Date().toISOString();

      // Mark purchase as completed
      await client.query(
        `UPDATE purchases SET status = 'completed', completed_at = $1
         WHERE stripe_session_id = $2 AND user_id = $3`,
        [now, sessionId, userId]
      );

      // Get or create credit balance
      const balanceResult = await client.query(
        'SELECT balance, version FROM credit_balances WHERE user_id = $1',
        [userId]
      );
      const balance = balanceResult.rows[0] as { balance: number; version: number } | undefined;

      if (!balance) {
        // Create credit account
        await client.query(
          'INSERT INTO credit_balances (user_id, balance, lifetime_earned) VALUES ($1, $2, $3)',
          [userId, credits, credits]
        );
      } else {
        // Add to existing balance
        const newBalance = balance.balance + credits;
        await client.query(
          'UPDATE credit_balances SET balance = $1, lifetime_earned = lifetime_earned + $2, version = version + 1 WHERE user_id = $3 AND version = $4',
          [newBalance, credits, userId, balance.version]
        );
      }

      // Record in ledger
      const ledgerId = `txn_${crypto.randomBytes(12).toString('hex')}`;
      const newBalance = (balance?.balance || 0) + credits;
      await client.query(
        'INSERT INTO credit_ledger (id, user_id, action, amount, balance_after, metadata, idempotency_key) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [
          ledgerId,
          userId,
          'credit_purchase',
          credits,
          newBalance,
          JSON.stringify({ sessionId, amount_cents: CREDIT_PACK_AMOUNT }),
          `purchase-${sessionId}`,
        ]
      );

      log.info('Credit purchase completed', { userId, credits, newBalance });
    });
  },
};

export const billingRouter = Router();

// Create checkout session for subscription
billingRouter.post('/checkout', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const user = await db.queryOne<{ email: string }>(
    'SELECT email FROM users WHERE id = $1',
    [req.user!.userId]
  );

  const url = await billingService.createCheckoutSession(req.user!.userId, user!.email);
  res.json({ data: { url } });
}));

// Create checkout session for credit purchase (100 credits for $1)
billingRouter.post('/credits/checkout', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const user = await db.queryOne<{ email: string }>(
    'SELECT email FROM users WHERE id = $1',
    [req.user!.userId]
  );

  const url = await billingService.createCreditCheckoutSession(req.user!.userId, user!.email);
  res.json({ data: { url } });
}));

// Create billing portal session
billingRouter.post('/portal', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const url = await billingService.createPortalSession(req.user!.userId);
  res.json({ data: { url } });
}));

// Get subscription status
billingRouter.get('/subscription', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const subscription = await billingService.getSubscription(req.user!.userId);
  res.json({
    data: subscription
      ? {
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end,
          cancelAtPeriodEnd: !!subscription.cancel_at_period_end,
        }
      : null,
  });
}));

// Stripe webhook handler (raw body required)
billingRouter.post('/webhook', asyncHandler(async (req: Request, res: Response) => {
  if (!stripe || !config.STRIPE_WEBHOOK_SECRET) {
    res.status(400).json({ error: 'Webhook not configured' });
    return;
  }

  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;
  try {
    // Note: req.body must be the raw buffer for signature verification
    event = stripe.webhooks.constructEvent(
      (req as any).rawBody || req.body,
      sig,
      config.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    log.error('Webhook signature verification failed', { error: err.message });
    res.status(400).json({ error: `Webhook Error: ${err.message}` });
    return;
  }

  await billingService.handleWebhook(event);
  res.json({ received: true });
}));
