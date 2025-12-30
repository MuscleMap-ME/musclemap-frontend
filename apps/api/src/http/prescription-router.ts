import { Router } from 'express';

const prescriptionRouter = Router();

/**
 * POST /api/prescription/plan
 *
 * Temporary stub to prevent 404s from the onboarding "Start training" flow.
 * Replace with real plan generation later.
 */
prescriptionRouter.post('/plan', async (_req, res) => {
  return res.status(200).json({
    ok: true,
    plan: {
      id: 'plan_stub',
      createdAt: new Date().toISOString(),
      items: []
    }
  });
});

export default prescriptionRouter;
