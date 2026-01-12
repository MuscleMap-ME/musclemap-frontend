# MuscleMap Plugin Development Guide

Build powerful plugins to extend MuscleMap's fitness tracking capabilities.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Plugin Structure](#plugin-structure)
3. [Plugin Manifest](#plugin-manifest)
4. [Frontend Plugins](#frontend-plugins)
5. [Widget Development](#widget-development)
6. [Route Development](#route-development)
7. [Theme Development](#theme-development)
8. [Backend Plugins](#backend-plugins)
9. [Plugin Services](#plugin-services)
10. [Event Bus](#event-bus)
11. [Hook System](#hook-system)
12. [Best Practices](#best-practices)
13. [Publishing](#publishing)

---

## Quick Start

### Create a New Plugin

```bash
# Create plugin directory
mkdir -p plugins/my-plugin/frontend

# Create the manifest
cat > plugins/my-plugin/plugin.json << 'EOF'
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "My awesome MuscleMap plugin",
  "author": "Your Name",
  "entry": {
    "frontend": "./frontend/index.jsx"
  },
  "contributes": {
    "widgets": [
      {
        "slot": "dashboard.main",
        "component": "MyWidget"
      }
    ]
  },
  "permissions": ["widgets:dashboard"],
  "capabilities": ["widgets"]
}
EOF
```

### Create Frontend Entry

```jsx
// plugins/my-plugin/frontend/index.jsx
import React from 'react';

export function MyWidget() {
  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
      <h3 className="font-bold text-white">My Plugin Widget</h3>
      <p className="text-white/60">Hello from my plugin!</p>
    </div>
  );
}

export default {
  onLoad(ctx) {
    console.log('Plugin loaded!', ctx.pluginId);
  },
  onUnload() {
    console.log('Plugin unloaded!');
  },
  widgets: {
    MyWidget: () => Promise.resolve({ default: MyWidget }),
  },
};
```

---

## Plugin Structure

```
my-plugin/
├── plugin.json           # Plugin manifest (required)
├── frontend/
│   ├── index.jsx         # Frontend entry point
│   ├── widgets/          # Widget components
│   ├── pages/            # Page components
│   └── styles.css        # Custom styles
├── backend/
│   ├── index.ts          # Backend entry point
│   ├── routes/           # API routes
│   └── graphql/          # GraphQL extensions
├── README.md             # Documentation
└── package.json          # Dependencies (optional)
```

---

## Plugin Manifest

The `plugin.json` file defines your plugin's metadata and capabilities.

### Complete Schema

```json
{
  "id": "unique-plugin-id",
  "name": "Display Name",
  "version": "1.0.0",
  "description": "What your plugin does",
  "author": "Your Name",
  "repository": "https://github.com/user/repo",
  "icon": "🎯",
  "keywords": ["fitness", "tracking"],

  "entry": {
    "frontend": "./frontend/index.jsx",
    "backend": "./backend/index.ts"
  },

  "activationEvents": [
    "onRoute:/my-page",
    "onCommand:my-command",
    "onStartup"
  ],

  "contributes": {
    "widgets": [
      {
        "slot": "dashboard.main",
        "component": "MyWidget",
        "defaultProps": { "showTitle": true }
      }
    ],
    "routes": [
      {
        "path": "/my-page",
        "title": "My Page",
        "icon": "Star",
        "protected": true
      }
    ],
    "navItems": [
      {
        "label": "My Feature",
        "path": "/my-page",
        "icon": "Star",
        "section": "main"
      }
    ],
    "themes": [
      {
        "id": "my-theme",
        "name": "My Theme",
        "colors": {
          "brand-primary": "#ff0000"
        }
      }
    ],
    "settings": [
      {
        "key": "myPlugin.enabled",
        "type": "boolean",
        "label": "Enable feature",
        "default": true
      }
    ],
    "commands": [
      {
        "id": "my-command",
        "title": "Do Something",
        "keybinding": "Ctrl+Shift+M"
      }
    ]
  },

  "permissions": [
    "workouts:read",
    "workouts:write",
    "widgets:dashboard",
    "external:api.example.com"
  ],

  "capabilities": [
    "widgets",
    "routes",
    "themes",
    "settings",
    "graphql",
    "hooks",
    "commands"
  ],

  "dependencies": {
    "other-plugin": "^1.0.0"
  }
}
```

### Available Widget Slots

| Slot | Location | Description |
|------|----------|-------------|
| `dashboard.main` | Dashboard main area | Primary content widgets |
| `dashboard.stats` | Dashboard stats row | Stat card widgets |
| `dashboard.sidebar` | Dashboard sidebar | Sidebar widgets |
| `profile.main` | Profile page | Profile content |
| `profile.tabs` | Profile tabs | Additional profile tabs |
| `profile.stats` | Profile stats | Profile statistics |
| `workout.main` | Workout page | Workout content |
| `workout.sidebar` | Workout sidebar | Workout sidebar |
| `sidebar.top` | Global sidebar top | Navigation additions |
| `sidebar.bottom` | Global sidebar bottom | Secondary nav |
| `header.right` | Header right side | Header actions |

### Permissions

| Permission | Description |
|------------|-------------|
| `workouts:read` | Read workout data |
| `workouts:write` | Create/update workouts |
| `exercises:read` | Read exercise data |
| `exercises:write` | Create/update exercises |
| `profile:read` | Read user profile |
| `profile:write` | Update user profile |
| `widgets:dashboard` | Add dashboard widgets |
| `widgets:profile` | Add profile widgets |
| `routes:add` | Add new routes |
| `themes:apply` | Apply custom themes |
| `external:*` | Access external APIs |

---

## Frontend Plugins

### Entry Point Structure

```jsx
// frontend/index.jsx
import React from 'react';

// Component exports
export { MyWidget } from './widgets/MyWidget';
export { MyPage } from './pages/MyPage';

// Default export: Plugin definition
export default {
  // Lifecycle hooks
  onLoad(ctx) {
    // Called when plugin is activated
    // ctx contains plugin services
  },

  onUnload() {
    // Called when plugin is deactivated
    // Clean up resources here
  },

  // Widget components (lazy-loaded)
  widgets: {
    MyWidget: () => import('./widgets/MyWidget'),
  },

  // Route components (lazy-loaded)
  routes: {
    '/my-page': () => import('./pages/MyPage'),
  },

  // Theme definitions
  themes: [
    {
      id: 'my-theme',
      name: 'My Custom Theme',
      colors: { /* ... */ },
    },
  ],

  // Settings panel component
  SettingsPanel: () => import('./SettingsPanel'),
};
```

### Plugin Context

The `ctx` object passed to `onLoad` provides:

```typescript
interface PluginContext {
  // Identity
  pluginId: string;
  config: Record<string, unknown>;

  // Services
  api: PluginApiClient;       // REST API client
  graphql: ApolloClient;      // GraphQL client (if enabled)
  navigate: (path: string) => void;
  toast: ToastService;

  // Event bus
  on: (event: string, handler: Function) => () => void;
  emit: (event: string, payload: unknown) => void;

  // Hook registry
  addFilter: (name: string, handler: Function, options?: HookOptions) => () => void;
  addAction: (name: string, handler: Function, options?: HookOptions) => () => void;

  // Data access (with permission)
  getWorkouts: () => Promise<Workout[]>;
  getExercises: () => Promise<Exercise[]>;
  getUserProfile: () => Promise<Profile>;
}
```

---

## Widget Development

### Basic Widget

```jsx
// frontend/widgets/MyWidget.jsx
import React from 'react';
import { motion } from 'framer-motion';

export function MyWidget({ title = 'My Widget' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-2xl bg-white/5 border border-white/10"
    >
      <h3 className="font-bold text-white mb-2">{title}</h3>
      <p className="text-white/60">Widget content here</p>
    </motion.div>
  );
}

export default MyWidget;
```

### Widget with Plugin Context

```jsx
import React, { useState, useEffect } from 'react';
import { usePluginServices } from '../../../src/plugins';

export function DataWidget() {
  const { api } = usePluginServices();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/workouts/recent')
      .then(res => setData(res.data))
      .finally(() => setLoading(false));
  }, [api]);

  if (loading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  return (
    <div className="p-4 rounded-xl bg-white/5">
      <pre className="text-white/70 text-sm">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
```

### Widget with Events

```jsx
import React, { useState } from 'react';
import { usePluginEventBus } from '../../../src/plugins';

export function EventWidget() {
  const { emit, on } = usePluginEventBus();
  const [lastEvent, setLastEvent] = useState(null);

  useEffect(() => {
    // Subscribe to events
    const unsubscribe = on('workout:completed', (data) => {
      setLastEvent(data);
    });
    return unsubscribe;
  }, [on]);

  const handleClick = () => {
    // Emit an event
    emit('my-plugin:action', { timestamp: Date.now() });
  };

  return (
    <div className="p-4 rounded-xl bg-white/5">
      <button onClick={handleClick}>Trigger Event</button>
      {lastEvent && <p>Last workout: {lastEvent.workoutId}</p>}
    </div>
  );
}
```

---

## Route Development

### Basic Page

```jsx
// frontend/pages/MyPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

export function MyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-8">
      <div className="max-w-4xl mx-auto">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-black text-white mb-4">My Plugin Page</h1>
          <p className="text-white/60">
            This page was added by my plugin.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default MyPage;
```

### Protected Route

Routes are automatically protected if `protected: true` in the manifest:

```json
{
  "contributes": {
    "routes": [
      {
        "path": "/my-protected-page",
        "title": "Protected Page",
        "protected": true
      }
    ]
  }
}
```

---

## Theme Development

### Theme Definition

```jsx
// In your plugin entry
export default {
  themes: [
    {
      id: 'neon-purple',
      name: 'Neon Purple',
      author: 'Your Name',
      preview: '/themes/neon-purple-preview.png',
      colors: {
        'brand-primary': '#a855f7',
        'brand-secondary': '#ec4899',
        'brand-accent': '#f472b6',
        'bg-primary': '#0f0a1a',
        'bg-secondary': '#1a1028',
        'bg-tertiary': '#251438',
        'surface-primary': 'rgba(168, 85, 247, 0.1)',
        'surface-secondary': 'rgba(236, 72, 153, 0.1)',
        'text-primary': '#ffffff',
        'text-secondary': 'rgba(255, 255, 255, 0.7)',
        'text-tertiary': 'rgba(255, 255, 255, 0.5)',
        'border-primary': 'rgba(168, 85, 247, 0.2)',
        'border-secondary': 'rgba(255, 255, 255, 0.1)',
        'success': '#22c55e',
        'warning': '#f59e0b',
        'error': '#ef4444',
        'info': '#3b82f6',
      },
      fonts: {
        heading: 'Orbitron, sans-serif',
        body: 'Inter, sans-serif',
        mono: 'JetBrains Mono, monospace',
      },
    },
  ],
};
```

### Using Theme Variables

Plugins can use CSS variables set by themes:

```css
.my-plugin-card {
  background: var(--surface-primary);
  border-color: var(--border-primary);
  color: var(--text-primary);
}

.my-plugin-button {
  background: var(--brand-primary);
  color: white;
}
```

---

## Backend Plugins

### Backend Entry Point

```typescript
// backend/index.ts
import { FastifyInstance } from 'fastify';
import { PluginBackendContext } from '@musclemap.me/plugin-sdk';

export default async function (ctx: PluginBackendContext) {
  const { fastify, db, config } = ctx;

  // Register routes
  fastify.register(async (app) => {
    app.get('/api/my-plugin/data', async (req, reply) => {
      const data = await db.query('SELECT * FROM my_table');
      return { data };
    });

    app.post('/api/my-plugin/action', async (req, reply) => {
      const { userId } = req.user;
      // Do something
      return { success: true };
    });
  });

  // Register GraphQL extensions
  ctx.extendGraphQL({
    typeDefs: `
      type MyPluginData {
        id: ID!
        value: String!
      }

      extend type Query {
        myPluginData: [MyPluginData!]!
      }
    `,
    resolvers: {
      Query: {
        myPluginData: async (_, __, { db }) => {
          return db.query('SELECT * FROM my_table');
        },
      },
    },
  });

  console.log('[MyPlugin] Backend initialized');
}
```

### Database Migrations

```sql
-- backend/migrations/001_create_tables.sql
CREATE TABLE IF NOT EXISTS my_plugin_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Plugin Services

### API Client

```jsx
const { api } = usePluginServices();

// GET request
const response = await api.get('/workouts');

// POST request
await api.post('/workouts', { name: 'New Workout' });

// With query params
await api.get('/exercises', { params: { muscle: 'chest' } });
```

### GraphQL Client

```jsx
import { gql } from '@apollo/client';

const { graphql } = usePluginServices();

const { data } = await graphql.query({
  query: gql`
    query GetWorkouts {
      workouts {
        id
        name
        exercises {
          name
        }
      }
    }
  `,
});
```

### Toast Notifications

```jsx
const { toast } = usePluginServices();

toast.success('Workout saved!');
toast.error('Something went wrong');
toast.info('Processing...');
toast.warning('Are you sure?');
```

### Navigation

```jsx
const { navigate } = usePluginServices();

// Navigate to a route
navigate('/dashboard');

// Navigate with state
navigate('/workout/123', { state: { from: 'plugin' } });
```

---

## Event Bus

### Core Events

| Event | Payload | Description |
|-------|---------|-------------|
| `app:ready` | `{ timestamp }` | App has initialized |
| `route:changed` | `{ path, search, hash }` | Navigation occurred |
| `user:login` | `{ userId, email }` | User logged in |
| `user:logout` | `{}` | User logged out |
| `workout:started` | `{ workoutId }` | Workout started |
| `workout:completed` | `{ workoutId, stats }` | Workout finished |
| `exercise:logged` | `{ exerciseId, sets }` | Exercise recorded |
| `theme:changed` | `{ themeId }` | Theme switched |

### Subscribing to Events

```jsx
import { usePluginEvent } from '../../../src/plugins';

function MyComponent() {
  // Auto-cleanup on unmount
  usePluginEvent('workout:completed', (data) => {
    console.log('Workout completed:', data);
  });

  return <div>...</div>;
}
```

### Emitting Events

```jsx
import { useEmitPluginEvent } from '../../../src/plugins';

function MyComponent() {
  const emit = useEmitPluginEvent();

  const handleAction = () => {
    emit('my-plugin:action-taken', {
      timestamp: Date.now(),
      data: { /* ... */ },
    });
  };

  return <button onClick={handleAction}>Do Action</button>;
}
```

### Wildcard Subscriptions

```jsx
// Subscribe to all workout events
ctx.on('workout:*', (event, data) => {
  console.log(`Workout event: ${event}`, data);
});
```

---

## Hook System

### Filter Hooks

Filters modify data as it flows through the app:

```jsx
// Register a filter in onLoad
ctx.addFilter('filter:workout-stats', (stats) => {
  // Add or modify stats
  return {
    ...stats,
    customStat: calculateCustomStat(stats),
  };
}, { pluginId: ctx.pluginId, priority: 10 });
```

### Available Filters

| Filter | Input | Description |
|--------|-------|-------------|
| `filter:workout-stats` | `WorkoutStats` | Modify workout statistics |
| `filter:exercise-data` | `Exercise` | Modify exercise display |
| `filter:profile-stats` | `ProfileStats` | Modify profile stats |
| `filter:dashboard-stats` | `DashboardStats` | Modify dashboard data |
| `filter:nav-items` | `NavItem[]` | Modify navigation |
| `filter:recent-workouts` | `Workout[]` | Modify workout list |

### Action Hooks

Actions add UI elements or trigger side effects:

```jsx
// Register an action
ctx.addAction('action:workout-card', (context) => {
  return [
    {
      id: 'share-workout',
      label: 'Share to Social',
      icon: 'Share2',
      onClick: () => shareWorkout(context.workout),
    },
  ];
}, { pluginId: ctx.pluginId });
```

### Available Actions

| Action | Context | Description |
|--------|---------|-------------|
| `action:workout-card` | `{ workout }` | Workout card actions |
| `action:exercise-card` | `{ exercise }` | Exercise card actions |
| `menu:workout-options` | `{ workout }` | Workout menu items |
| `menu:exercise-options` | `{ exercise }` | Exercise menu items |
| `buttons:dashboard-quick` | `{}` | Dashboard quick actions |
| `fields:workout-form` | `{ form }` | Workout form fields |

---

## Best Practices

### Performance

1. **Lazy load components**: Use dynamic imports for widgets and pages
2. **Minimize bundle size**: Only import what you need
3. **Use memoization**: Wrap expensive components with `React.memo`
4. **Debounce events**: Avoid excessive event emissions

```jsx
// Good: Lazy loading
widgets: {
  MyWidget: () => import('./widgets/MyWidget'),
}

// Bad: Eager loading
import { MyWidget } from './widgets/MyWidget';
widgets: {
  MyWidget: () => Promise.resolve({ default: MyWidget }),
}
```

### Error Handling

1. **Wrap widgets in error boundaries**: Prevent plugin errors from crashing the app
2. **Handle API errors gracefully**: Show user-friendly error states
3. **Log errors with context**: Include plugin ID in error messages

```jsx
export function SafeWidget(props) {
  return (
    <ErrorBoundary fallback={<WidgetError />}>
      <MyWidget {...props} />
    </ErrorBoundary>
  );
}
```

### Accessibility

1. **Use semantic HTML**: Proper heading hierarchy, labels, etc.
2. **Support keyboard navigation**: All interactive elements focusable
3. **Provide alt text**: For images and icons
4. **Announce changes**: Use ARIA live regions for dynamic content

### Styling

1. **Use CSS variables**: For theme compatibility
2. **Follow design system**: Match MuscleMap's glassmorphism style
3. **Responsive design**: Support mobile and desktop
4. **Dark mode first**: Design for dark backgrounds

```jsx
// Good: Uses theme variables
<div className="bg-white/5 border-white/10 text-white">

// Bad: Hard-coded colors
<div style={{ background: '#1a1a2e', color: 'white' }}>
```

---

## Publishing

### Prepare for Publishing

1. **Update plugin.json**: Ensure all metadata is complete
2. **Write documentation**: Create a comprehensive README
3. **Add screenshots**: Show your plugin in action
4. **Test thoroughly**: Ensure it works with the latest MuscleMap version

### Publishing to GitHub

1. Create a public repository
2. Add the topic `musclemap-plugin`
3. Include installation instructions in README
4. Tag releases with semantic versions

### Plugin Discovery

Plugins are discovered by:

1. **GitHub Topics**: Tag your repo with `musclemap-plugin`
2. **Marketplace**: Submit to the MuscleMap plugin marketplace
3. **Community**: Share in the MuscleMap Discord/community

### Example README Template

```markdown
# My Awesome Plugin

Description of what your plugin does.

## Features

- Feature 1
- Feature 2
- Feature 3

## Installation

1. Go to MuscleMap Settings > Plugins
2. Click "Browse Marketplace"
3. Search for "My Awesome Plugin"
4. Click Install

## Configuration

Describe any settings or configuration options.

## Screenshots

![Screenshot 1](screenshots/1.png)
![Screenshot 2](screenshots/2.png)

## Support

- Issues: [GitHub Issues](link)
- Discord: [MuscleMap Community](link)

## License

MIT
```

---

## Examples

Check out these example plugins:

- **[hello-world](../plugins/examples/hello-world/)** - Minimal widget plugin
- **[custom-theme](../plugins/examples/custom-theme/)** - Theme-only plugin (coming soon)
- **[strava-sync](../plugins/examples/strava-sync/)** - Full-stack integration (coming soon)

---

## Support

- **Documentation**: [docs.musclemap.me](https://docs.musclemap.me)
- **GitHub**: [MuscleMap-ME/musclemap-frontend](https://github.com/MuscleMap-ME/musclemap-frontend)
- **Discord**: Join the MuscleMap community
- **Issues**: Report bugs or request features on GitHub
