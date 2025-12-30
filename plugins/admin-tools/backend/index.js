/**
 * Admin Tools Plugin
 */

function requireAdmin(req, res, next) {
  const user = req.user;
  if (!user || !user.roles?.includes('admin')) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Admin access required' } });
    return;
  }
  next();
}

module.exports = function register(ctx) {
  const { db, logger } = ctx;

  return {
    registerRoutes: (router) => {
      // Get system stats
      router.get('/stats', requireAdmin, (req, res) => {
        const users = db.prepare('SELECT COUNT(*) as count FROM users').get();
        const workouts = db.prepare('SELECT COUNT(*) as count FROM workouts').get();
        const competitions = db.prepare('SELECT COUNT(*) as count FROM competitions').get();
        const totalTU = db.prepare('SELECT COALESCE(SUM(total_tu), 0) as total FROM workouts').get();

        res.json({
          data: {
            users: users.count,
            workouts: workouts.count,
            competitions: competitions.count,
            totalTU: totalTU.total,
            timestamp: new Date().toISOString(),
          },
        });
      });

      // List all users
      router.get('/users', requireAdmin, (req, res) => {
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const offset = parseInt(req.query.offset) || 0;

        const users = db.prepare(`
          SELECT u.id, u.email, u.username, u.display_name, u.roles, u.created_at,
                 cb.balance as credits
          FROM users u
          LEFT JOIN credit_balances cb ON cb.user_id = u.id
          ORDER BY u.created_at DESC
          LIMIT ? OFFSET ?
        `).all(limit, offset);

        res.json({
          data: users.map(u => ({
            ...u,
            roles: JSON.parse(u.roles || '["user"]'),
          })),
          meta: { limit, offset },
        });
      });

      // Grant credits
      router.post('/users/:userId/grant-credits', requireAdmin, (req, res) => {
        const { userId } = req.params;
        const { amount, reason } = req.body;

        if (!amount || amount <= 0) {
          res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Amount must be positive' } });
          return;
        }

        const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
        if (!user) {
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
          return;
        }

        db.prepare(`
          UPDATE credit_balances 
          SET balance = balance + ?, lifetime_earned = lifetime_earned + ?
          WHERE user_id = ?
        `).run(amount, amount, userId);

        const newBalance = db.prepare('SELECT balance FROM credit_balances WHERE user_id = ?').get(userId);

        logger.info({ userId, amount, reason }, 'Admin granted credits');

        res.json({
          data: { userId, amount, reason, newBalance: newBalance.balance },
        });
      });

      // List plugins
      router.get('/plugins', requireAdmin, (req, res) => {
        const plugins = db.prepare('SELECT * FROM installed_plugins').all();
        res.json({ data: plugins });
      });
    },
  };
};
