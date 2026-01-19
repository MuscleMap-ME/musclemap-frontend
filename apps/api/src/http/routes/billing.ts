/**
 * Billing Routes
 *
 * Provides simplified billing endpoints for the frontend Wallet page.
 * These wrap Stripe functionality for subscriptions and credit purchases.
 */

import { FastifyInstance } from 'fastify';
import { authenticate } from './auth';
import { config } from '../../config';
import { loggers } from '../../lib/logger';

const log = loggers.economy;

// Public URL for redirects
const PUBLIC_URL = process.env.PUBLIC_URL || 'https://musclemap.me';

// Stripe configuration from environment
const STRIPE_SUBSCRIPTION_PRICE_ID = process.env.STRIPE_SUBSCRIPTION_PRICE_ID;
const STRIPE_CREDITS_PRICE_ID = process.env.STRIPE_CREDITS_PRICE_ID;

// Note: This requires Stripe to be configured. If not, these routes will return errors.
let stripe: any = null;
try {
  if (config.STRIPE_SECRET_KEY) {
    // Dynamic import to avoid errors when Stripe is not configured
    import('stripe').then((Stripe) => {
      stripe = new Stripe.default(config.STRIPE_SECRET_KEY!, {
        apiVersion: '2025-12-15.clover' as any,
      });
    });
  }
} catch {
  log.warn('Stripe not configured - billing endpoints will return errors');
}

export async function registerBillingRoutes(app: FastifyInstance) {
  // Check if Stripe is configured
  const checkStripe = () => {
    if (!stripe || !config.STRIPE_SECRET_KEY) {
      throw new Error('Stripe is not configured');
    }
  };

  // Create subscription checkout session
  app.post('/billing/checkout', { preHandler: authenticate }, async (request, reply) => {
    try {
      checkStripe();
      const userId = request.user!.userId;

      // Create a Stripe checkout session for subscription
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: STRIPE_SUBSCRIPTION_PRICE_ID || 'price_default',
            quantity: 1,
          },
        ],
        success_url: `${PUBLIC_URL}/wallet?success=true`,
        cancel_url: `${PUBLIC_URL}/wallet?canceled=true`,
        client_reference_id: userId,
        metadata: {
          userId,
          type: 'subscription',
        },
      });

      return reply.send({ data: { url: session.url, sessionId: session.id } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Checkout failed';
      log.error({ err }, 'Billing checkout failed');
      return reply.status(400).send({
        error: { code: 'CHECKOUT_FAILED', message, statusCode: 400 },
      });
    }
  });

  // Create billing portal session for subscription management
  app.post('/billing/portal', { preHandler: authenticate }, async (request, reply) => {
    try {
      checkStripe();
      const userId = request.user!.userId;

      // Get user's Stripe customer ID
      const { queryOne } = await import('../../db/client');
      const user = await queryOne<{ stripe_customer_id: string | null }>(
        `SELECT stripe_customer_id FROM users WHERE id = $1`,
        [userId]
      );

      if (!user?.stripe_customer_id) {
        return reply.status(400).send({
          error: { code: 'NO_CUSTOMER', message: 'No billing account found', statusCode: 400 },
        });
      }

      // Create portal session
      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripe_customer_id,
        return_url: `${PUBLIC_URL}/wallet`,
      });

      return reply.send({ data: { url: session.url } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Portal creation failed';
      log.error({ err }, 'Billing portal failed');
      return reply.status(400).send({
        error: { code: 'PORTAL_FAILED', message, statusCode: 400 },
      });
    }
  });

  // Create credit purchase checkout session
  app.post('/billing/credits/checkout', { preHandler: authenticate }, async (request, reply) => {
    try {
      checkStripe();
      const userId = request.user!.userId;
      const body = request.body as { packageId?: string; credits?: number } | undefined;

      // Default credit package or use specified
      const packageId = body?.packageId || 'credits_500';

      // Create one-time payment session for credits
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price: STRIPE_CREDITS_PRICE_ID || 'price_credits_default',
            quantity: 1,
          },
        ],
        success_url: `${PUBLIC_URL}/wallet?credits_success=true`,
        cancel_url: `${PUBLIC_URL}/wallet?canceled=true`,
        client_reference_id: userId,
        metadata: {
          userId,
          type: 'credits',
          packageId,
        },
      });

      return reply.send({ data: { url: session.url, sessionId: session.id } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Checkout failed';
      log.error({ err }, 'Credits checkout failed');
      return reply.status(400).send({
        error: { code: 'CHECKOUT_FAILED', message, statusCode: 400 },
      });
    }
  });
}
