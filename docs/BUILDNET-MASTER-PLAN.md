# BuildNet Master Plan

## Vision

BuildNet is a **high-performance native build orchestration system** with:
- Native Rust binary for 10-100x faster builds
- Self-hosted web control panel
- Multi-user concurrent access without performance degradation
- Multiple control vectors (CLI, API, Web, SMS, Email, External Agents)
- Hot-swappable resources and templates
- Real-time audit logging and live viewing
- Automated redundancies and fault tolerance
- **Multi-channel notification system** (SMS, Email, Slack, Discord, Webhooks)
- **Remote control via SMS/Email** for headless operation
- **Resource monitoring** (CPU, memory, disk, cluster nodes)
- **Historical reporting** with scheduled delivery

## Current Status (Completed)

### Core Native Daemon ✅
- [x] Rust workspace with buildnet-core, buildnet-daemon, buildnet-ffi
- [x] HTTP API on port 9876 (Axum)
- [x] SQLite state persistence with WAL mode
- [x] Content-addressed artifact caching (Blake3)
- [x] xxHash3 incremental file hashing
- [x] Topological dependency resolution
- [x] Build tiers (InstantSkip → FullBuild)
- [x] PM2 integration with `interpreter: 'none'`

### Web Control Panel ✅
- [x] Self-hosted at `http://localhost:9876/`
- [x] Dark theme with glassmorphism design
- [x] Real-time status display
- [x] Build all / Build individual packages
- [x] Cache statistics and clearing
- [x] SSE event stream for live output
- [x] Embedded via rust-embed (single binary)

### Deployed to Production ✅
- [x] Running on musclemap.me VPS
- [x] 36s initial build → 5ms cached builds
- [x] 6 packages configured (shared, core, plugin-sdk, client, ui, api)

---

## Phase 1: Enhanced Web Control Panel

### 1.1 Multi-Tab Dashboard
- **Overview Tab**: System health, recent builds, quick actions
- **Packages Tab**: Visual package cards with dependency graph
- **Builds Tab**: Build history with filtering and search
- **Cache Tab**: Artifact browser, cache management
- **Config Tab**: Edit configuration, package settings
- **Logs Tab**: Real-time log viewer with filtering

### 1.2 Visual Dependency Graph
- Interactive D3.js/vis-network graph of package dependencies
- Color-coded by build status (cached, building, failed)
- Click to build individual packages
- Drag to rearrange layout
- Export as SVG/PNG

### 1.3 Drag & Drop Asset Management
- File browser for source files
- Drag files between packages
- Visual diff viewer
- File history tracking
- Quick edit inline

### 1.4 Real-time Build Output
- WebSocket upgrade from SSE for bidirectional communication
- ANSI color support in terminal output
- Scrollable log with search
- Download build logs
- Build time graphs

---

## Phase 2: Multi-Vector Control

### 2.1 CLI Interface
```bash
# Already working
buildnetd start --port 9876
buildnetd status
buildnetd build --all
buildnetd build --package api
buildnetd cache stats
buildnetd cache clear

# To add
buildnetd watch                    # Auto-rebuild on changes
buildnetd deploy                   # Trigger deployment pipeline
buildnetd template list            # List available templates
buildnetd template apply <name>    # Apply a template
```

### 2.2 REST API (Current)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Web control panel |
| `/health` | GET | Health check |
| `/status` | GET | Full daemon status |
| `/build` | POST | Build all packages |
| `/build/{package}` | POST | Build specific package |
| `/builds` | GET | Build history |
| `/cache/stats` | GET | Cache statistics |
| `/cache/clear` | POST | Clear cache |
| `/config` | GET | View configuration |
| `/events` | GET | SSE event stream |

### 2.3 Node.js SDK (To Add)
```typescript
import { BuildNet } from '@buildnet/client';

const client = new BuildNet('http://localhost:9876');

// Subscribe to events
client.on('build:start', (pkg) => console.log(`Building ${pkg}`));
client.on('build:complete', (result) => console.log(result));

// Trigger builds
await client.buildAll();
await client.build('api', { force: true });

// Watch mode
client.watch(['src/**/*.ts'], async () => {
  await client.buildAll();
});
```

### 2.4 External Agent Support
- API key authentication
- Permission levels (read-only, build, admin)
- Rate limiting per agent
- Audit log per agent
- Multiple simultaneous connections

---

## Phase 3: Multi-User & Concurrency

### 3.1 Session Manager
- Unique session IDs per connection
- Session-scoped build queues
- Session timeout and cleanup
- Concurrent session limits
- Session handoff between agents

### 3.2 User Management
- User authentication (JWT)
- Role-based access control
- User-scoped configurations
- Build history per user
- Notification preferences

### 3.3 Concurrent Build Handling
- Build queue with priority levels
- Lock acquisition per package
- Parallel builds for independent packages
- Build coalescence (merge identical requests)
- Fair scheduling across users

---

## Phase 4: Templates & Hot-Swapping

### 4.1 Template System
```yaml
# templates/react-app.yaml
name: react-app
description: React TypeScript application template
packages:
  - name: "{name}"
    path: "packages/{name}"
    build_cmd: "pnpm build"
    dependencies: ["shared", "core"]
    sources: ["packages/{name}/src/**/*.tsx"]
    output_dir: "packages/{name}/dist"
hooks:
  pre_build: "pnpm lint"
  post_build: "pnpm test"
```

### 4.2 Hot-Swap Resources
- Reload configuration without restart
- Add/remove packages dynamically
- Update build commands on the fly
- Swap backends (SQLite → PostgreSQL)
- Plugin system for custom handlers

### 4.3 Resource Registry
- Register custom build tools
- Custom hash algorithms
- Custom cache backends
- Custom notification channels
- Plugin marketplace integration

---

## Phase 5: Notification System & Remote Control

> **Detailed documentation:** See [BUILDNET-NOTIFICATION-SYSTEM.md](./BUILDNET-NOTIFICATION-SYSTEM.md)

### 5.1 Event Types & Notifications

**Build Events:**
| Event | Description | Default Priority |
|-------|-------------|------------------|
| `build.started` | Build process initiated | Low |
| `build.completed` | Build finished successfully | Medium |
| `build.failed` | Build encountered errors | High |
| `build.cached` | Build skipped (cache hit) | Low |

**Resource Events:**
| Event | Description | Default Priority |
|-------|-------------|------------------|
| `resource.cpu.high` | CPU usage exceeds threshold | High |
| `resource.memory.high` | Memory usage exceeds threshold | High |
| `resource.disk.low` | Disk space below threshold | Critical |

**System Events:**
| Event | Description | Default Priority |
|-------|-------------|------------------|
| `daemon.started` | BuildNet daemon started | Medium |
| `daemon.stopped` | BuildNet daemon stopped | High |
| `node.joined` | Worker node joined cluster | Medium |
| `node.failed` | Worker node health check failed | Critical |
| `plugin.loaded` | Plugin loaded successfully | Low |

### 5.2 Notification Channels

```yaml
notifications:
  channels:
    sms:
      enabled: true
      provider: twilio
      recipients:
        - phone: "+1234567890"
          events: ["build.failed", "daemon.*", "*.critical"]

    email:
      enabled: true
      provider: smtp
      recipients:
        - email: "devops@example.com"
          format: "html"

    slack:
      enabled: true
      default_channel: "#buildnet"

    discord:
      enabled: true
      guild_id: "123456789"

    webhooks:
      - url: "https://api.example.com/events"
        events: ["*"]

    telegram:
      enabled: true
      allowed_users: ["123456789"]

    push:
      enabled: true
      provider: firebase
```

### 5.3 Remote Control via SMS/Email

**Available Commands:**
| Command | Description | Auth Level |
|---------|-------------|------------|
| `STATUS` | Get current daemon status | Read |
| `BUILD [pkg]` | Trigger build | Build |
| `CANCEL [id]` | Cancel build | Build |
| `CACHE CLEAR` | Clear build cache | Admin |
| `REPORT daily` | Generate daily report | Read |
| `NODE LIST` | List cluster nodes | Read |
| `PLUGIN LIST` | List loaded plugins | Read |
| `STOP` | Stop daemon (requires confirmation) | Admin |

**SMS Example:**
```
You: STATUS
BuildNet: 🟢 Running | Builds: 47 | Cache: 4.2MB | Nodes: 3 online
```

**Email Example:**
- Subject: `[BUILDNET] BUILD api`
- BuildNet replies with build status

### 5.4 Resource Monitoring

```yaml
monitoring:
  resources:
    cpu:
      warning: 70
      critical: 90

    memory:
      warning_percent: 70
      critical_percent: 90

    disk:
      paths:
        - path: "/var/www/musclemap.me"
          warning: 80
          critical: 95

  cluster:
    health_check_interval_secs: 30
    max_node_failures: 3
```

### 5.5 Historical Reports

**Report Types:**
- **Summary**: Quick overview of build activity
- **Detailed**: Build-by-build analysis with error details
- **Analytics**: Trend analysis with charts and insights

**Scheduled Reports:**
```yaml
reports:
  scheduled:
    - name: "Daily Summary"
      cron: "0 9 * * *"
      recipients: ["email:devops@example.com", "sms:+1234567890"]

    - name: "Weekly Report"
      cron: "0 9 * * 1"
      type: "detailed"
      recipients: ["email:team@example.com"]
```

### 5.6 Configuration Options

```yaml
notifications:
  settings:
    # Deduplication window
    dedup_window_secs: 300

    # Rate limiting
    rate_limit:
      max_per_minute: 10
      max_per_hour: 100

    # Quiet hours
    quiet_hours:
      enabled: true
      start: "22:00"
      end: "08:00"
      exceptions: ["*.critical"]

remote_control:
  authentication:
    api_keys:
      - key: "${BUILDNET_API_KEY}"
        permissions: ["*"]
    sms:
      allowed_numbers: ["+1234567890"]
      require_confirmation: true
```

---

## Phase 6: Monitoring & Observability

### 6.1 Real-time Activity Dashboard
- Active builds with progress bars
- Build queue visualization
- Resource utilization (CPU, memory, disk)
- Network traffic monitoring
- Error rate graphs

### 6.2 Audit Logging
- Every action logged with timestamp, user, details
- Searchable audit log
- Export to external systems (Elasticsearch, Loki)
- Retention policies
- Compliance reporting

### 6.3 Metrics Export
- Prometheus metrics endpoint
- Grafana dashboard templates
- OpenTelemetry integration
- Custom metric definitions
- Historical trend analysis

---

## Phase 7: Redundancy & Reliability

### 7.1 High Availability
- Primary/secondary daemon setup
- Automatic failover
- State replication
- Load balancing
- Health checks with auto-recovery

### 7.2 Backup & Recovery
- Automatic state backups
- Cache artifact backups
- Point-in-time recovery
- Cross-region replication
- Disaster recovery procedures

### 7.3 Performance Optimization
- Connection pooling
- Request batching
- Lazy loading
- Incremental updates
- Memory-mapped file access

---

## Phase 8: GitHub Integration

### 8.1 GitHub App
- Repository webhooks
- Pull request builds
- Status checks
- Commit status updates
- Release automation

### 8.2 Actions Integration
```yaml
# .github/workflows/build.yml
- name: BuildNet Build
  uses: musclemap/buildnet-action@v1
  with:
    endpoint: ${{ secrets.BUILDNET_URL }}
    api_key: ${{ secrets.BUILDNET_KEY }}
    packages: all
```

### 8.3 Deployment Pipeline
- Build → Test → Deploy workflow
- Environment promotion (dev → staging → prod)
- Rollback capabilities
- Deployment notifications
- Artifact versioning

---

## Phase 9: MuscleMap Integration

### 9.1 Dedicated Page
- `/tools/buildnet` on musclemap.me
- Documentation and tutorials
- Live demo environment
- Download links
- Community forum

### 9.2 Separate Repository
- `github.com/musclemap/buildnet`
- Standalone package on npm/cargo
- CI/CD with GitHub Actions
- Automated releases
- Community contributions

### 9.3 Documentation
- Getting started guide
- API reference
- Configuration guide
- Best practices
- Troubleshooting

---

## Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                           BuildNet Control Plane                               │
├───────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬───────┤
│  Web UI   │   CLI   │   API   │   SDK   │   SMS   │  Email  │  Slack  │ Agents│
│  (React)  │ (Clap)  │ (Axum)  │  (TS)   │(Twilio) │ (SMTP)  │  (Bot)  │ (JWT) │
└─────┬─────┴────┬────┴────┬────┴────┬────┴────┬────┴────┬────┴────┬────┴───┬───┘
      │          │         │         │         │         │         │        │
      └──────────┴─────────┴─────────┴─────────┴─────────┴─────────┴────────┘
                                          │
                        ┌─────────────────┴─────────────────┐
                        │         BuildNet Daemon           │
                        │         (Rust Native)             │
                        ├───────────────────────────────────┤
                        │                                   │
                        │  ┌─────────────────────────────┐  │
                        │  │      Build Orchestrator      │  │
                        │  └──────────────┬──────────────┘  │
                        │                 │                 │
                        │  ┌──────────────┼──────────────┐  │
                        │  │              │              │  │
                        │  ▼              ▼              ▼  │
                        │ State      Artifact     Notification │
                        │ Manager      Cache        Router   │
                        │ (SQLite)   (Blake3)    (Channels) │
                        └───────────────────────────────────┘
                                          │
           ┌──────────────────────────────┼──────────────────────────────┐
           │                              │                              │
           ▼                              ▼                              ▼
    ┌────────────┐                 ┌────────────┐                 ┌────────────┐
    │  Packages  │                 │  Cluster   │                 │  Reports   │
    │ shared,api │                 │   Nodes    │                 │  Storage   │
    └────────────┘                 └────────────┘                 └────────────┘

┌───────────────────────────────────────────────────────────────────────────────┐
│                          Notification Flow                                     │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   Build Event ──► Event Bus ──► Notification Router ──┬──► SMS (Twilio)      │
│                        │              │               ├──► Email (SMTP)      │
│                        │              │               ├──► Slack             │
│                        │              │               ├──► Discord           │
│                        │              │               ├──► Telegram          │
│                        ▼              ▼               ├──► Push (FCM)        │
│                   Event Log    Rate Limiter           └──► Webhooks          │
│                   (SQLite)     Deduplication                                 │
│                               Quiet Hours                                    │
│                                                                               │
├───────────────────────────────────────────────────────────────────────────────┤
│                          Remote Control Flow                                   │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   SMS "BUILD api" ──► Inbound Webhook ──► Command Parser ──► Auth Check      │
│                                                │                              │
│   Email [BUILDNET] ──► IMAP Polling ──────────┤                              │
│                                                │                              │
│   Slack /buildnet ──► Events Webhook ─────────┴──► Execute ──► Response      │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Priority

### Immediate (This Week)
1. Deploy web control panel to production ✅
2. Add WebSocket for real-time output
3. Add package dependency graph visualization
4. Add build history with search/filter

### Short-term (This Month)
5. Drag & drop file browser
6. Multi-tab dashboard layout
7. CLI enhancements (watch mode)
8. Node.js SDK with TypeScript types
9. **Webhook notification channel**
10. **Basic email notifications (SMTP)**

### Medium-term (Next Quarter)
11. User authentication
12. External agent support
13. Template system
14. **SMS notifications (Twilio)**
15. **Remote control via SMS**
16. **Resource monitoring alerts**
17. **Historical reports (summary)**

### Long-term (Future)
18. GitHub App integration
19. High availability setup
20. **Slack/Discord bot integration**
21. **Advanced analytics reports**
22. **Cluster node monitoring**
23. **Plugin lifecycle notifications**
24. Separate repository
25. npm/cargo package publishing
26. Community plugins

---

## Files Reference

```
packages/buildnet-native/
├── Cargo.toml                          # Workspace manifest
├── buildnet-core/                      # Core library
│   └── src/
│       ├── lib.rs                      # Library entry
│       ├── state.rs                    # SQLite state
│       ├── cache.rs                    # Artifact cache
│       ├── hasher.rs                   # xxHash3 + Blake3
│       ├── builder.rs                  # Build orchestration
│       ├── config.rs                   # Configuration
│       ├── notifications/              # Notification system (NEW)
│       │   ├── mod.rs                  # Notification router
│       │   ├── channels/               # Channel implementations
│       │   │   ├── sms.rs              # Twilio SMS
│       │   │   ├── email.rs            # SMTP/SendGrid
│       │   │   ├── slack.rs            # Slack integration
│       │   │   ├── discord.rs          # Discord integration
│       │   │   ├── webhook.rs          # Generic webhooks
│       │   │   └── push.rs             # Firebase push
│       │   ├── commands.rs             # Remote command handler
│       │   └── reports.rs              # Report generator
│       └── monitoring/                 # Resource monitoring (NEW)
│           ├── mod.rs                  # Monitor coordinator
│           ├── system.rs               # CPU/memory/disk
│           └── cluster.rs              # Node health
├── buildnet-daemon/                    # HTTP daemon
│   ├── src/
│   │   ├── main.rs                     # CLI entry
│   │   ├── api.rs                      # Axum routes
│   │   ├── cli.rs                      # Clap commands
│   │   └── webhooks.rs                 # Inbound webhooks (NEW)
│   └── static/
│       └── index.html                  # Web control panel
└── buildnet-ffi/                       # FFI bindings
    └── src/lib.rs                      # C ABI + napi-rs

.buildnet/
├── config.json                         # Package configuration
├── notifications.yaml                  # Notification config (NEW)
├── state.db                            # SQLite state database
├── events.db                           # Event/command log (NEW)
├── cache/                              # Artifact cache directory
└── reports/                            # Generated reports (NEW)
```

## Documentation

- [BuildNet Master Plan](./BUILDNET-MASTER-PLAN.md) - This document
- [BuildNet Notification System](./BUILDNET-NOTIFICATION-SYSTEM.md) - Detailed notification docs
- [BuildNet API Reference](./BUILDNET-API.md) - REST/WebSocket API
- [BuildNet Configuration](./BUILDNET-CONFIG.md) - Configuration options

---

## Quick Start

```bash
# Start BuildNet daemon
pnpm buildnet:start

# Open web control panel
open http://localhost:9876

# Or use CLI
ssh -p 2222 root@musclemap.me "curl -s http://localhost:9876/status | jq ."

# Trigger a build
ssh -p 2222 root@musclemap.me "curl -s -X POST http://localhost:9876/build -d '{}' -H 'Content-Type: application/json' | jq ."
```
