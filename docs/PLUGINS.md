# MuscleMap Plugin Development

## Overview

Plugins extend MuscleMap without modifying core code. Drop a plugin folder into `/plugins/` and it will be automatically loaded.

## Plugin Structure
```
plugins/
└── my-plugin/
    ├── plugin.json        # Required: manifest
    ├── backend/
    │   └── index.js       # Backend entry point
    └── README.md          # Documentation
```

## Manifest (plugin.json)
```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "What this plugin does",
  "entry": {
    "backend": "./backend/index.js"
  },
  "capabilities": [
    "routes"
  ],
  "requires": {
    "host": ">=2.0.0"
  }
}
```

### Capabilities

- `routes` - Can register API endpoints
- `permissions` - Can register custom permissions
- `db:migrations` - Can run database migrations
- `economy:spend` - Can charge credits

## Backend Entry Point
```javascript
// backend/index.js
module.exports = function register(ctx) {
  const { db, logger, credits } = ctx;

  return {
    registerRoutes: (router) => {
      router.get('/hello', (req, res) => {
        res.json({ message: 'Hello from plugin!' });
      });
    },
  };
};
```

## Plugin Context

Your plugin receives:
```javascript
{
  pluginId: string,        // Your plugin ID
  db: Database,            // SQLite database instance
  logger: Logger,          // Pino logger (child of main)
  config: object,          // Plugin configuration
  credits: {
    charge(request),       // Charge credits
    canCharge(userId, amount),
    getBalance(userId),
  },
}
```

## Example: Charging Credits
```javascript
router.post('/premium-feature', async (req, res) => {
  const result = await ctx.credits.charge({
    userId: req.user.userId,
    action: 'premium-feature',
    cost: 50,
    idempotencyKey: `premium-${req.body.requestId}`,
  });

  if (!result.success) {
    return res.status(402).json({ error: result.error });
  }

  // Do the thing...
  res.json({ success: true });
});
```

## Existing Plugins

### leaderboard
Global TU and workout count leaderboards.
- `GET /api/plugins/leaderboard/tu/all-time`
- `GET /api/plugins/leaderboard/tu/weekly`
- `GET /api/plugins/leaderboard/tu/monthly`
- `GET /api/plugins/leaderboard/workouts?period=weekly`

### admin-tools
Administrative endpoints (requires admin role).
- `GET /api/plugins/admin-tools/stats`
- `GET /api/plugins/admin-tools/users`
- `POST /api/plugins/admin-tools/users/:id/grant-credits`
- `GET /api/plugins/admin-tools/plugins`
