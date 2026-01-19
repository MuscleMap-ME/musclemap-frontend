# MuscleMap Extensibility Guide

This document provides an overview of all extensibility mechanisms in MuscleMap, helping contributors and third-party developers understand how to extend the platform.

## Extension Overview

MuscleMap is designed with extensibility as a core principle. The platform supports multiple extension points across different layers:

| Layer | Extension Mechanism | Documentation |
|-------|---------------------|---------------|
| Backend Performance | Native C Extensions | [NATIVE_EXTENSIONS.md](./NATIVE_EXTENSIONS.md) |
| API & Business Logic | Plugin System | [PLUGINS.md](./PLUGINS.md) |
| Data Integrations | Biometric Providers | [BIOMETRICS.md](./BIOMETRICS.md) |
| Frontend UI | Widget Slots & Routes | [PLUGINS.md](./PLUGINS.md#frontend-plugin-api) |

---

## Extension Points at a Glance

```
┌─────────────────────────────────────────────────────────────────┐
│                        MuscleMap Platform                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Native    │  │   Plugin    │  │      Biometric          │  │
│  │ Extensions  │  │   System    │  │      Providers          │  │
│  │    (C)      │  │   (JS/TS)   │  │      (OAuth)            │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                      │                │
│         ▼                ▼                      ▼                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                      Core API (Fastify)                      ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │  Routes │ Hooks │ Credits │ Database │ Auth │ Entitlements  ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Frontend (React)                          ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │  Widget Slots │ Plugin Routes │ Commands │ Navigation       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Native Extensions (C/C++)

For performance-critical operations, MuscleMap supports native Node.js addons.

### When to Use

- Computation-intensive algorithms (>10ms in JavaScript)
- Real-time data processing
- Memory-sensitive operations
- CPU-bound workloads

### Current Native Modules

| Module | Purpose | Speedup |
|--------|---------|---------|
| Constraint Solver | Workout prescription optimization | 19-105x |
| NSFW Detector | Image content moderation | TensorFlow.js |

### Creating a Native Extension

```
apps/api/native/my-module/
├── binding.gyp          # Build configuration
├── src/
│   └── my-module.c      # C implementation
├── index.ts             # TypeScript wrapper
└── package.json
```

**Key Requirements:**
- Must compile with Node-GYP
- Must provide JavaScript fallback
- Must use N-API for Node.js compatibility
- Should include benchmarks

See [NATIVE_EXTENSIONS.md](./NATIVE_EXTENSIONS.md) for detailed implementation guide.

---

## 2. Plugin System

The plugin system allows extending MuscleMap without modifying core code.

### Plugin Capabilities

| Capability | Backend | Frontend | Description |
|------------|---------|----------|-------------|
| Routes | Yes | N/A | Add API endpoints |
| Hooks | Yes | Yes | React to events |
| Widgets | N/A | Yes | Inject UI components |
| Navigation | N/A | Yes | Add menu items |
| Commands | N/A | Yes | Command palette actions |
| Credits | Yes | N/A | Charge/check credits |
| Database | Yes | N/A | Custom tables/queries |
| Admin Panels | Yes | Yes | Admin dashboard extensions |

### Plugin Lifecycle

```
1. Discovery    → Server finds plugin.json in /plugins/
2. Validation   → Manifest validated, capabilities checked
3. Migration    → Database migrations run (if any)
4. Registration → Plugin entry function called
5. Activation   → Routes mounted, hooks registered
6. Runtime      → Plugin handles requests, events
7. Shutdown     → onShutdown hook called
```

### Quick Plugin Example

```javascript
// plugins/my-plugin/backend/index.js
module.exports = function register(ctx) {
  const { db, logger, credits } = ctx;

  return {
    registerRoutes: (router) => {
      router.get('/hello', (req, res) => {
        res.json({ message: 'Hello from my plugin!' });
      });
    },

    registerHooks: () => ({
      onWorkoutCompleted: async (event, ctx) => {
        logger.info({ workoutId: event.workoutId }, 'Workout completed!');
      }
    })
  };
};
```

See [PLUGINS.md](./PLUGINS.md) for complete plugin development guide.

---

## 3. Biometric Integrations

MuscleMap supports health data from external platforms.

### Integration Types

| Type | Description | Example |
|------|-------------|---------|
| OAuth Providers | Third-party health platforms | Garmin, Whoop, Oura |
| Device SDKs | Native device integration | Apple HealthKit |
| Plugin Providers | Custom data sources | Plugin-based sensors |

### Data Flow

```
External Platform ──▶ OAuth/SDK ──▶ Sync Service ──▶ Database
                                         │
                                         ▼
                               Readiness Score ──▶ Prescription Engine
```

### Supported Metrics

- **Body**: Weight, body fat, muscle mass
- **Cardiovascular**: Heart rate, HRV, blood pressure
- **Recovery**: Sleep duration, quality, recovery score
- **Activity**: Steps, calories, training load

See [BIOMETRICS.md](./BIOMETRICS.md) for integration architecture.

---

## 4. Frontend Extensions

Plugins can extend the React frontend.

### Widget Slots

Predefined locations where plugin components can be injected:

| Slot | Location | Use Case |
|------|----------|----------|
| `dashboard.main` | Dashboard page | Stats widgets, quick actions |
| `dashboard.sidebar` | Dashboard sidebar | Status indicators |
| `profile.tabs` | Profile page tabs | Custom profile sections |
| `workout.summary` | Post-workout screen | Analysis widgets |
| `muscle.detail` | Muscle detail view | Extra muscle info |
| `admin.dashboard` | Admin panel | Admin widgets |

### Adding a Widget

```javascript
export default defineFrontendPlugin((ctx) => ({
  widgets: [{
    id: 'my-stats-widget',
    slot: 'dashboard.main',
    component: MyStatsWidget,
    order: 10,
    meta: { title: 'My Stats' }
  }]
}));
```

### Custom Routes

```javascript
export default defineFrontendPlugin((ctx) => ({
  routes: [{
    path: '/my-feature',
    component: MyFeaturePage,
    meta: { title: 'My Feature' }
  }]
}));
```

---

## 5. Credit Economy Extensions

Plugins can integrate with the credit economy.

### Charging Credits

```javascript
const result = await ctx.credits.charge({
  userId: req.user.userId,
  action: 'premium-analysis',
  cost: 50,
  idempotencyKey: `analysis-${requestId}`,
});
```

### Declaring Credit Actions

```json
{
  "creditActions": [
    {
      "action": "premium-analysis",
      "defaultCost": 50,
      "description": "Advanced workout analysis"
    }
  ]
}
```

### Economy Hooks

```javascript
registerHooks: () => ({
  onCreditsCharged: async (event, ctx) => {
    // React to any credit charge
  }
})
```

---

## 6. Database Extensions

Plugins can extend the database schema.

### Migrations

```sql
-- plugins/my-plugin/migrations/001_create_tables.sql
CREATE TABLE IF NOT EXISTS my_plugin_data (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Best Practices

1. **Prefix tables** with plugin ID: `my_plugin_*`
2. **Use foreign keys** to core tables
3. **Include indexes** for query performance
4. **Handle migration failures** gracefully
5. **Provide rollback scripts** for uninstallation

---

## 7. API Versioning

The MuscleMap API follows semantic versioning.

### Current Version

- **API Version**: v1 (implicit, no prefix)
- **Host Version**: 2.x (for plugin compatibility)

### Plugin Compatibility

```json
{
  "requires": {
    "host": ">=2.0.0"
  }
}
```

### Breaking Changes

When the host version changes major version:
1. Plugins with incompatible `requires` won't load
2. Deprecation warnings precede removals
3. Migration guides provided for affected plugins

---

## Extension Development Workflow

### 1. Set Up Development Environment

```bash
# Clone repository
git clone https://github.com/your-org/musclemap.git
cd musclemap

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### 2. Create Your Extension

```bash
# For plugins
mkdir -p plugins/my-plugin/backend
touch plugins/my-plugin/plugin.json

# For native extensions
mkdir -p apps/api/native/my-module/src
touch apps/api/native/my-module/binding.gyp
```

### 3. Test Locally

```bash
# Run tests
pnpm test

# Test plugin loading
LOG_LEVEL=debug pnpm dev
```

### 4. Document Your Extension

Create a README.md with:
- Feature description
- Installation instructions
- Configuration options
- API documentation
- Examples

---

## Security Considerations

### Plugin Sandboxing

Plugins run in the same process as the host. Security measures:

1. **Capability system** - Plugins must declare required permissions
2. **Route isolation** - Plugin routes prefixed with `/api/plugins/{id}/`
3. **Database isolation** - Recommended table prefixing
4. **Review process** - Marketplace plugins reviewed before listing

### Native Extension Security

1. **Memory safety** - C code must be carefully reviewed
2. **Input validation** - All inputs validated before processing
3. **Bounds checking** - Array accesses must be bounds-checked
4. **Fallback requirement** - JavaScript fallback ensures availability

### Biometric Data Security

1. **OAuth tokens encrypted** at rest
2. **Minimal data retention** - Raw data expires
3. **User consent required** for each platform
4. **Data export available** for user control

---

## Community & Support

### Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your extension
4. Add tests and documentation
5. Submit a pull request

### Resources

- [Architecture Overview](./ARCHITECTURE.md)
- [Feature Documentation](./FEATURES.md)
- [Refactor Status](./REFACTOR_PLAN.md)
- [GitHub Issues](https://github.com/your-org/musclemap/issues)

### Plugin Registry (Coming Soon)

A centralized registry for discovering and installing community plugins:
- Search and browse plugins
- Version management
- Dependency resolution
- Security scanning
