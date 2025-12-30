/**
 * Global Leaderboard Plugin
 */

module.exports = function register(ctx) {
  const { db } = ctx;

  return {
    registerRoutes: (router) => {
      // All-time TU leaderboard
      router.get('/tu/all-time', (req, res) => {
        const limit = Math.min(parseInt(req.query.limit) || 25, 100);

        const leaders = db.prepare(`
          SELECT u.id, u.username, u.display_name,
                 COALESCE(SUM(w.total_tu), 0) as totalTU,
                 COUNT(w.id) as workoutCount
          FROM users u
          LEFT JOIN workouts w ON w.user_id = u.id
          GROUP BY u.id
          HAVING totalTU > 0
          ORDER BY totalTU DESC
          LIMIT ?
        `).all(limit);

        res.json({
          data: leaders.map((l, i) => ({
            rank: i + 1,
            userId: l.id,
            username: l.username,
            displayName: l.display_name,
            totalTU: l.totalTU,
            workoutCount: l.workoutCount,
          })),
        });
      });

      // Weekly TU leaderboard
      router.get('/tu/weekly', (req, res) => {
        const limit = Math.min(parseInt(req.query.limit) || 25, 100);

        const leaders = db.prepare(`
          SELECT u.id, u.username, u.display_name,
                 COALESCE(SUM(w.total_tu), 0) as totalTU,
                 COUNT(w.id) as workoutCount
          FROM users u
          LEFT JOIN workouts w ON w.user_id = u.id AND w.date >= date('now', '-7 days')
          GROUP BY u.id
          HAVING totalTU > 0
          ORDER BY totalTU DESC
          LIMIT ?
        `).all(limit);

        res.json({
          data: leaders.map((l, i) => ({
            rank: i + 1,
            userId: l.id,
            username: l.username,
            displayName: l.display_name,
            totalTU: l.totalTU,
            workoutCount: l.workoutCount,
          })),
        });
      });

      // Monthly TU leaderboard
      router.get('/tu/monthly', (req, res) => {
        const limit = Math.min(parseInt(req.query.limit) || 25, 100);

        const leaders = db.prepare(`
          SELECT u.id, u.username, u.display_name,
                 COALESCE(SUM(w.total_tu), 0) as totalTU,
                 COUNT(w.id) as workoutCount
          FROM users u
          LEFT JOIN workouts w ON w.user_id = u.id AND w.date >= date('now', '-30 days')
          GROUP BY u.id
          HAVING totalTU > 0
          ORDER BY totalTU DESC
          LIMIT ?
        `).all(limit);

        res.json({
          data: leaders.map((l, i) => ({
            rank: i + 1,
            userId: l.id,
            username: l.username,
            displayName: l.display_name,
            totalTU: l.totalTU,
            workoutCount: l.workoutCount,
          })),
        });
      });

      // Workout count leaderboard
      router.get('/workouts', (req, res) => {
        const limit = Math.min(parseInt(req.query.limit) || 25, 100);
        const period = req.query.period || 'all-time';

        let dateFilter = '';
        if (period === 'weekly') dateFilter = "AND w.date >= date('now', '-7 days')";
        else if (period === 'monthly') dateFilter = "AND w.date >= date('now', '-30 days')";

        const leaders = db.prepare(`
          SELECT u.id, u.username, u.display_name,
                 COUNT(w.id) as workoutCount,
                 COALESCE(SUM(w.total_tu), 0) as totalTU
          FROM users u
          LEFT JOIN workouts w ON w.user_id = u.id ${dateFilter}
          GROUP BY u.id
          HAVING workoutCount > 0
          ORDER BY workoutCount DESC
          LIMIT ?
        `).all(limit);

        res.json({
          data: leaders.map((l, i) => ({
            rank: i + 1,
            userId: l.id,
            username: l.username,
            displayName: l.display_name,
            workoutCount: l.workoutCount,
            totalTU: l.totalTU,
          })),
          meta: { period },
        });
      });
    },
  };
};
