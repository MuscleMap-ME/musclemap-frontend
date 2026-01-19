# MuscleMap Plugin Development

## Overview

Plugins extend MuscleMap without modifying core code. Drop a plugin folder into `/plugins/` and it will be automatically loaded. The plugin system supports both backend (API) and frontend (UI) extensions.

## Quick Start

```bash
# 1. Create plugin directory
mkdir plugins/my-plugin

# 2. Create manifest
cat > plugins/my-plugin/plugin.json << 'EOF'
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "What this plugin does",
  "author": "Your Name",
  "entry": {
    "backend": "./backend/index.js"
  },
  "capabilities": ["routes"],
  "requires": {
    "host": ">=2.0.0"
  }
}
EOF

# 3. Create backend entry point
mkdir plugins/my-plugin/backend
cat > plugins/my-plugin/backend/index.js << 'EOF'
module.exports = function register(ctx) {
  return {
    registerRoutes: (router) => {
      router.get('/hello', (req, res) => {
        res.json({ message: 'Hello from plugin!' });
      });
    },
  };
};
EOF

# 4. Restart server - plugin is now available at /api/plugins/my-plugin/hello
```

## Plugin Structure

```
plugins/
└── my-plugin/
    ├── plugin.json           # Required: manifest file
    ├── backend/
    │   └── index.js          # Backend entry point
    ├── frontend/
    │   └── index.js          # Frontend entry point (optional)
    ├── migrations/           # Database migrations (optional)
    │   └── 001_create_tables.sql
    └── README.md             # Documentation
```

## Plugin Manifest (plugin.json)

```json
{
  "id": "my-plugin",
  "name": "My Plugin Display Name",
  "version": "1.0.0",
  "description": "Detailed description of what this plugin does",
  "author": "Author Name",
  "homepage": "https://github.com/example/my-plugin",
  "repository": "https://github.com/example/my-plugin",
  "license": "MIT",
  "entry": {
    "backend": "./backend/index.js",
    "frontend": "./frontend/index.js"
  },
  "capabilities": [
    "routes",
    "permissions",
    "db:migrations",
    "economy:spend"
  ],
  "requires": {
    "host": ">=2.0.0"
  },
  "creditActions": [
    {
      "action": "premium-analysis",
      "defaultCost": 50,
      "description": "Advanced workout analysis"
    }
  ]
}
```

### Capabilities

| Capability | Description |
|------------|-------------|
| `routes` | Register custom API endpoints |
| `permissions` | Define custom permissions |
| `db:migrations` | Run database migrations |
| `economy:spend` | Charge user credits |

---

## Backend Plugin API

### Entry Point

```javascript
// backend/index.js
const { definePlugin, requireAuth, requirePermissions } = require('@musclemap/plugin-sdk');

module.exports = definePlugin((ctx) => {
  const { pluginId, db, logger, credits, config } = ctx;

  return {
    registerRoutes: (router) => { /* ... */ },
    registerHooks: () => ({ /* ... */ }),
    registerCreditActions: () => [ /* ... */ ],
    registerAdminPanels: () => [ /* ... */ ],
  };
});
```

### Plugin Context

Your plugin receives a context object with these services:

```typescript
interface PluginContext {
  pluginId: string;              // Your plugin ID from manifest
  config: Record<string, any>;   // Plugin configuration
  logger: PluginLogger;          // Pino logger (child of main)
  credits: CreditService;        // Credit operations
  db: PluginDatabase;            // Database access
  request?: {                    // Current request context
    requestId: string;
    userId?: string;
    ip: string;
    userAgent?: string;
  };
}
```

### Logging

```javascript
module.exports = function register(ctx) {
  const { logger } = ctx;

  logger.debug('Plugin initializing');
  logger.info('Plugin ready', { version: '1.0.0' });
  logger.warn('Deprecated feature used', { feature: 'oldApi' });
  logger.error('Operation failed', new Error('Connection timeout'), {
    userId: 'abc123'
  });

  return { /* ... */ };
};
```

### Database Access

```javascript
module.exports = function register(ctx) {
  const { db } = ctx;

  return {
    registerRoutes: (router) => {
      router.get('/stats', async (req, res) => {
        // Query multiple rows
        const users = await db.query(
          'SELECT id, username FROM users WHERE created_at > $1',
          [new Date('2024-01-01')]
        );

        // Execute update/insert
        const result = await db.execute(
          'UPDATE settings SET value = $1 WHERE key = $2',
          ['new-value', 'my-setting']
        );

        // Transaction support
        const newRecord = await db.transaction(async () => {
          await db.execute('INSERT INTO logs (message) VALUES ($1)', ['Starting']);
          const id = await db.execute('INSERT INTO records (data) VALUES ($1)', ['data']);
          await db.execute('INSERT INTO logs (message) VALUES ($1)', ['Complete']);
          return id;
        });

        res.json({ data: users });
      });
    },
  };
};
```

### Credit System

```javascript
module.exports = function register(ctx) {
  const { credits, logger } = ctx;

  return {
    registerRoutes: (router) => {
      router.post('/premium-feature', async (req, res) => {
        const userId = req.user?.userId;

        // Check if user can afford the action
        const canAfford = await credits.canCharge(userId, 50);
        if (!canAfford) {
          return res.status(402).json({
            error: { code: 'INSUFFICIENT_CREDITS', message: 'Need 50 credits' }
          });
        }

        // Charge credits with idempotency key (prevents double charges)
        const result = await credits.charge({
          userId,
          action: 'premium-feature',
          cost: 50,
          idempotencyKey: `premium-${req.body.requestId}`,
          metadata: { feature: 'advanced-analysis' }
        });

        if (!result.success) {
          return res.status(402).json({ error: { message: result.error } });
        }

        logger.info({ userId, ledgerId: result.ledgerEntryId }, 'Charged for premium feature');

        // Perform the premium action...
        res.json({
          success: true,
          creditsRemaining: result.newBalance
        });
      });

      router.get('/balance', async (req, res) => {
        const balance = await credits.getBalance(req.user.userId);
        res.json({ balance });
      });
    },

    registerCreditActions: () => [
      { action: 'premium-feature', defaultCost: 50, description: 'Premium feature access' }
    ],
  };
};
```

### Lifecycle Hooks

```javascript
module.exports = function register(ctx) {
  const { logger } = ctx;

  return {
    registerHooks: () => ({
      // Called when server starts
      async onServerStart(ctx) {
        logger.info('Plugin server hook: starting up');
        // Initialize resources, warm caches, etc.
      },

      // Called when a new user registers
      async onUserCreated(user, ctx) {
        logger.info({ userId: user.id }, 'New user registered');
        // Send welcome email, create default data, etc.
      },

      // Called when credits are charged
      async onCreditsCharged(event, ctx) {
        const { userId, action, amount, balanceAfter } = event;
        logger.info({ userId, action, amount }, 'Credits charged');
        // Track analytics, trigger notifications, etc.
      },

      // Called when a workout is completed
      async onWorkoutCompleted(event, ctx) {
        const { workoutId, userId, totalTU, exerciseCount } = event;
        logger.info({ workoutId, totalTU }, 'Workout completed');
        // Update leaderboards, check achievements, etc.
      },

      // Called on every request (use sparingly)
      async onRequest(req, res, ctx) {
        // Add custom headers, logging, etc.
      },

      // Called when server is shutting down
      async onShutdown(ctx) {
        logger.info('Plugin shutting down');
        // Cleanup resources, flush buffers, etc.
      }
    }),
  };
};
```

### Middleware Helpers

```javascript
const { requireAuth, requirePermissions } = require('@musclemap/plugin-sdk');

module.exports = function register(ctx) {
  return {
    registerRoutes: (router) => {
      // Require authentication
      router.get('/protected', requireAuth((req, res) => {
        res.json({ userId: req.user.userId });
      }));

      // Require specific permissions
      router.post('/admin-action', requirePermissions(['admin:manage'], (req, res) => {
        res.json({ success: true });
      }));
    },
  };
};
```

### Admin Panels

```javascript
module.exports = function register(ctx) {
  return {
    registerAdminPanels: () => [
      {
        id: 'my-plugin-dashboard',
        title: 'My Plugin Stats',
        description: 'View plugin statistics and metrics',
        icon: 'chart-bar',
        route: '/admin/plugins/my-plugin',
        requiredPermission: 'admin:view'
      }
    ],
  };
};
```

---

## Frontend Plugin API

### Entry Point

```javascript
// frontend/index.js
import { defineFrontendPlugin } from '@musclemap/plugin-sdk';

export default defineFrontendPlugin((ctx) => {
  const { pluginId, api, notify, navigate } = ctx;

  return {
    routes: [ /* ... */ ],
    widgets: [ /* ... */ ],
    navItems: [ /* ... */ ],
    commands: [ /* ... */ ],
  };
});
```

### Frontend Context

```typescript
interface FrontendPluginContext {
  pluginId: string;
  capabilities: string[];
  api: PluginApiClient;      // HTTP client for API calls
  notify: NotificationService;
  navigate: (path: string) => void;
}
```

### Routes

```javascript
export default defineFrontendPlugin((ctx) => {
  return {
    routes: [
      {
        path: '/my-plugin',
        component: MyPluginPage,
        requiredPerms: ['plugin:my-plugin'],
        meta: {
          title: 'My Plugin',
          description: 'Plugin main page',
          icon: 'puzzle-piece'
        }
      },
      {
        path: '/my-plugin/:id',
        component: MyPluginDetailPage,
      }
    ],
  };
});

function MyPluginPage({ pluginId, params }) {
  return <div>Plugin page for {pluginId}</div>;
}
```

### Widgets

Widgets are components that can be injected into predefined slots in the host application.

```javascript
export default defineFrontendPlugin((ctx) => {
  return {
    widgets: [
      {
        id: 'workout-summary-widget',
        slot: 'workout.summary',
        component: WorkoutSummaryWidget,
        order: 10,  // Lower numbers appear first
        meta: {
          title: 'Custom Stats',
          minWidth: 200,
          minHeight: 100
        }
      },
      {
        id: 'dashboard-widget',
        slot: 'dashboard.main',
        component: DashboardWidget,
        order: 5,
        requiredPerms: ['plugin:my-plugin']
      }
    ],
  };
});
```

#### Available Widget Slots

| Slot | Description |
|------|-------------|
| `dashboard.main` | Main dashboard content area |
| `dashboard.sidebar` | Dashboard sidebar |
| `profile.tabs` | User profile tab sections |
| `workout.summary` | Post-workout summary page |
| `muscle.detail` | Muscle detail view |
| `admin.dashboard` | Admin control panel |

### Navigation Items

```javascript
export default defineFrontendPlugin((ctx) => {
  return {
    navItems: [
      {
        id: 'my-plugin-nav',
        label: 'My Plugin',
        path: '/my-plugin',
        icon: 'chart-bar',
        location: 'main',    // main, footer, settings, admin
        order: 50,
        requiredPerms: ['plugin:my-plugin']
      }
    ],
  };
});
```

### Commands (Command Palette)

```javascript
export default defineFrontendPlugin((ctx) => {
  const { navigate, notify } = ctx;

  return {
    commands: [
      {
        id: 'open-my-plugin',
        name: 'Open My Plugin',
        description: 'Navigate to the plugin page',
        keywords: ['plugin', 'custom'],
        icon: 'puzzle-piece',
        handler: () => navigate('/my-plugin')
      },
      {
        id: 'sync-data',
        name: 'Sync Plugin Data',
        description: 'Force sync plugin data',
        handler: async () => {
          await ctx.api.post('/my-plugin/sync');
          notify.success('Data synced successfully');
        }
      }
    ],
  };
});
```

### API Client

```javascript
export default defineFrontendPlugin((ctx) => {
  const { api, notify } = ctx;

  return {
    routes: [{
      path: '/my-plugin',
      component: () => {
        const [data, setData] = useState(null);

        useEffect(() => {
          api.get('/my-plugin/data')
            .then(setData)
            .catch(err => notify.error(err.message));
        }, []);

        const handleSave = async (formData) => {
          try {
            await api.post('/my-plugin/data', formData);
            notify.success('Saved successfully');
          } catch (err) {
            notify.error('Save failed: ' + err.message);
          }
        };

        return <div>{/* render data */}</div>;
      }
    }],
  };
});
```

### Frontend Hooks

```javascript
export default defineFrontendPlugin((ctx) => {
  return {
    hooks: {
      async onLoad(ctx) {
        console.log('Plugin loaded');
        // Initialize plugin state
      },

      onUserLogin(userId, ctx) {
        console.log('User logged in:', userId);
        // Fetch user-specific plugin data
      },

      onUserLogout(ctx) {
        console.log('User logged out');
        // Clear plugin state
      }
    }
  };
});
```

### React Hooks for Plugins

```javascript
import { usePluginContext, useHasPermission, usePluginApi } from '@musclemap/plugin-sdk';

function MyPluginComponent() {
  const ctx = usePluginContext();
  const hasAdminAccess = useHasPermission('admin:view');
  const api = usePluginApi();

  // Use context, permissions, and API in your component
}
```

---

## Database Migrations

Plugins can include SQL migrations that run automatically on server startup.

```
plugins/my-plugin/
├── migrations/
│   ├── 001_create_tables.sql
│   ├── 002_add_indexes.sql
│   └── 003_add_column.sql
```

```sql
-- migrations/001_create_tables.sql
CREATE TABLE IF NOT EXISTS my_plugin_data (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_my_plugin_user ON my_plugin_data(user_id);
```

Migrations run in filename order. Each migration runs at most once (tracked in `plugin_migrations` table).

---

## Existing Plugins

### leaderboard

Global TU and workout count leaderboards.

**Endpoints:**
- `GET /api/plugins/leaderboard/tu/all-time` - All-time TU rankings
- `GET /api/plugins/leaderboard/tu/weekly` - Weekly TU rankings
- `GET /api/plugins/leaderboard/tu/monthly` - Monthly TU rankings
- `GET /api/plugins/leaderboard/workouts?period=weekly` - Workout count rankings

**Query Parameters:**
- `limit` - Max results (default: 25, max: 100)
- `period` - For workouts: `all-time`, `weekly`, `monthly`

**Response:**
```json
{
  "data": [
    {
      "rank": 1,
      "userId": "abc123",
      "username": "muscleman",
      "displayName": "Muscle Man",
      "totalTU": 15420,
      "workoutCount": 87
    }
  ]
}
```

### admin-tools

Administrative endpoints for platform management.

**Endpoints:**
- `GET /api/plugins/admin-tools/stats` - System statistics
- `GET /api/plugins/admin-tools/users` - List all users
- `POST /api/plugins/admin-tools/users/:id/grant-credits` - Grant credits to user
- `GET /api/plugins/admin-tools/plugins` - List installed plugins

**All endpoints require admin role.**

---

## Best Practices

### Security

1. **Always validate input** - Use schema validation for request bodies
2. **Check permissions** - Use `requireAuth` and `requirePermissions` helpers
3. **Use idempotency keys** - Prevent duplicate credit charges
4. **Sanitize output** - Escape user-generated content

### Performance

1. **Cache expensive queries** - Use Redis or in-memory caching
2. **Batch database operations** - Use transactions for multiple writes
3. **Lazy load frontend** - Use dynamic imports for large components
4. **Minimize hook overhead** - Keep lifecycle hooks fast

### Compatibility

1. **Check host version** - Use `requires.host` in manifest
2. **Handle missing features** - Gracefully degrade if capabilities unavailable
3. **Follow naming conventions** - Prefix database tables with plugin ID
4. **Document API changes** - Version your plugin endpoints

---

## Debugging

### Enable Plugin Logging

```bash
LOG_LEVEL=debug pnpm dev
```

### Check Plugin Status

```bash
curl -H "Authorization: Bearer <admin-token>" \
  http://localhost:3000/api/plugins/admin-tools/plugins
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Plugin not loading | Check `plugin.json` syntax and file paths |
| Routes 404 | Verify `capabilities` includes `routes` |
| Database errors | Check migration SQL syntax |
| Credit charge fails | Verify `economy:spend` capability and valid idempotency key |

---

## Publishing

1. Test thoroughly in development
2. Document all endpoints and features in README.md
3. Include migration rollback strategy
4. Version according to semver
5. Submit to MuscleMap plugin registry (coming soon)
