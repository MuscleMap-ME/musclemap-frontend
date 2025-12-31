/**
 * Billing Module
 *
 * Handles Stripe subscriptions for the $1/month unlimited plan.
 */

import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { db } from '../../db/client';
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

// $1/month subscription price (you'll need to create this in Stripe Dashboard)
// Or we create it dynamically
const SUBSCRIPTION_PRICE_AMOUNT = 100; // $1.00 in cents
const SUBSCRIPTION_PRICE_CURRENCY = 'usd';

interface SubscriptionRecord {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: number;
}

export const billingService = {
  /**
   * Get or create Stripe customer for user
   */
  async getOrCreateCustomer(userId: string, email: string): Promise<string> {
    if (!stripe) throw new ValidationError('Stripe not configured');

    // Check if user already has a customer ID
    const sub = db.prepare(
      'SELECT stripe_customer_id FROM subscriptions WHERE user_id = ? AND stripe_customer_id IS NOT NULL LIMIT 1'
    ).get(userId) as { stripe_customer_id: string } | undefined;

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
    const existing = db.prepare(
      "SELECT id FROM subscriptions WHERE user_id = ? AND status = 'active'"
    ).get(userId);

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

    const sub = db.prepare(
      'SELECT stripe_customer_id FROM subscriptions WHERE user_id = ? AND stripe_customer_id IS NOT NULL LIMIT 1'
    ).get(userId) as { stripe_customer_id: string } | undefined;

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
        if (session.mode === 'subscription' && session.subscription) {
          await this.activateSubscription(
            session.metadata?.userId!,
            session.customer as string,
            session.subscription as string
          );
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

    db.prepare(`
      INSERT INTO subscriptions (id, user_id, stripe_customer_id, stripe_subscription_id, status, current_period_start, current_period_end, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(stripe_subscription_id) DO UPDATE SET
        status = excluded.status,
        current_period_start = excluded.current_period_start,
        current_period_end = excluded.current_period_end,
        updated_at = excluded.updated_at
    `).run(
      id,
      userId,
      customerId,
      subscriptionId,
      subscription.status,
      new Date(subscription.current_period_start * 1000).toISOString(),
      new Date(subscription.current_period_end * 1000).toISOString(),
      now,
      now
    );

    log.info('Subscription activated', { userId, subscriptionId, status: subscription.status });
  },

  /**
   * Update subscription status from webhook
   */
  async updateSubscriptionStatus(subscription: Stripe.Subscription): Promise<void> {
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE subscriptions
      SET status = ?,
          current_period_start = ?,
          current_period_end = ?,
          cancel_at_period_end = ?,
          updated_at = ?
      WHERE stripe_subscription_id = ?
    `).run(
      subscription.status,
      new Date(subscription.current_period_start * 1000).toISOString(),
      new Date(subscription.current_period_end * 1000).toISOString(),
      subscription.cancel_at_period_end ? 1 : 0,
      now,
      subscription.id
    );

    log.info('Subscription updated', { subscriptionId: subscription.id, status: subscription.status });
  },

  /**
   * Get user's subscription status
   */
  getSubscription(userId: string): SubscriptionRecord | null {
    return db.prepare(
      'SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(userId) as SubscriptionRecord | null;
  },
};

export const billingRouter = Router();

// Create checkout session for subscription
billingRouter.post('/checkout', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const user = db.prepare('SELECT email FROM users WHERE id = ?').get(req.user!.userId) as { email: string };

  const url = await billingService.createCheckoutSession(req.user!.userId, user.email);
  res.json({ data: { url } });
}));

// Create billing portal session
billingRouter.post('/portal', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const url = await billingService.createPortalSession(req.user!.userId);
  res.json({ data: { url } });
}));

// Get subscription status
billingRouter.get('/subscription', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const subscription = billingService.getSubscription(req.user!.userId);
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
