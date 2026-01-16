/**
 * Economy Routes (Fastify)
 *
 * Handles credit balance, transactions, and charging.
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from './auth';
import { economyService } from '../../modules/economy';
import { queryAll } from '../../db/client';
import { PRICING_TIERS, PRICING_RATE } from '@musclemap/core';

const chargeSchema = z.object({
  action: z.string(),
  amount: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
  idempotencyKey: z.string(),
});

export async function registerEconomyRoutes(app: FastifyInstance) {
  // Get pricing tiers
  app.get('/economy/pricing', async (request, reply) => {
    return reply.send({ tiers: PRICING_TIERS, rate: PRICING_RATE });
  });

  // Get balance
  app.get('/economy/balance', { preHandler: authenticate }, async (request, reply) => {
    const balance = await economyService.getBalance(request.user!.userId);
    return reply.send({ data: { balance } });
  });

  // Alias for credits
  app.get('/credits/balance', { preHandler: authenticate }, async (request, reply) => {
    const balance = await economyService.getBalance(request.user!.userId);
    return reply.send({ data: { balance } });
  });

  // Get transaction history
  app.get('/economy/history', { preHandler: authenticate }, async (request, reply) => {
    const query = request.query as { limit?: string; offset?: string };
    const limit = Math.min(parseInt(query.limit || '50'), 100);
    const offset = parseInt(query.offset || '0');

    const [transactions, total] = await Promise.all([
      economyService.getHistory(request.user!.userId, limit, offset),
      economyService.getHistoryCount(request.user!.userId),
    ]);

    return reply.send({
      data: transactions.map((t) => ({
        ...t,
        metadata: t.metadata || null,
      })),
      meta: { limit, offset, total },
    });
  });

  // Charge credits
  app.post('/economy/charge', { preHandler: authenticate }, async (request, reply) => {
    const data = chargeSchema.parse(request.body);
    const result = await economyService.charge({
      userId: request.user!.userId,
      action: data.action,
      amount: data.amount,
      metadata: data.metadata,
      idempotencyKey: data.idempotencyKey,
    });

    if (!result.success) {
      const balance = await economyService.getBalance(request.user!.userId);
      if (result.error?.includes('Insufficient')) {
        return reply.status(402).send({
          error: {
            code: 'INSUFFICIENT_CREDITS',
            message: result.error,
            statusCode: 402,
            required: data.amount || 0,
            available: balance,
          },
        });
      }
      return reply.status(400).send({
        error: { code: 'CHARGE_FAILED', message: result.error || 'Charge failed', statusCode: 400 },
      });
    }

    return reply.send({ data: result });
  });

  // Get available credit actions
  app.get('/economy/actions', async (request, reply) => {
    const actions = await queryAll(
      'SELECT id, name, description, default_cost, plugin_id FROM credit_actions WHERE enabled = TRUE'
    );
    return reply.send({ data: actions });
  });

  // Wallet endpoint (alias)
  app.get('/economy/wallet', { preHandler: authenticate }, async (request, reply) => {
    const balance = await economyService.getBalance(request.user!.userId);
    return reply.send({ data: { balance } });
  });

  // Transactions endpoint (alias)
  app.get('/economy/transactions', { preHandler: authenticate }, async (request, reply) => {
    const query = request.query as { limit?: string; offset?: string };
    const limit = Math.min(parseInt(query.limit || '50'), 100);
    const offset = parseInt(query.offset || '0');

    const transactions = await economyService.getHistory(request.user!.userId, limit, offset);

    return reply.send({
      data: transactions.map((t) => ({
        ...t,
        metadata: t.metadata || null,
      })),
      meta: { limit, offset },
    });
  });
}
