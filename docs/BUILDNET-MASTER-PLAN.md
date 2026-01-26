# BuildNet Master Plan

## Vision

BuildNet is a **high-performance native build orchestration system** with:
- Native Rust binary for 10-100x faster builds
- Self-hosted web control panel
- Multi-user concurrent access without performance degradation
- Multiple control vectors (CLI, API, Web, External Agents)
- Hot-swappable resources and templates
- Real-time audit logging and live viewing
- Automated redundancies and fault tolerance

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

## Phase 5: Monitoring & Observability

### 5.1 Real-time Activity Dashboard
- Active builds with progress bars
- Build queue visualization
- Resource utilization (CPU, memory, disk)
- Network traffic monitoring
- Error rate graphs

### 5.2 Audit Logging
- Every action logged with timestamp, user, details
- Searchable audit log
- Export to external systems (Elasticsearch, Loki)
- Retention policies
- Compliance reporting

### 5.3 Alerting
- Build failure notifications
- Cache size thresholds
- Performance degradation alerts
- Custom webhook integrations
- Email/Slack/Discord notifications

### 5.4 Metrics Export
- Prometheus metrics endpoint
- Grafana dashboard templates
- OpenTelemetry integration
- Custom metric definitions
- Historical trend analysis

---

## Phase 6: Redundancy & Reliability

### 6.1 High Availability
- Primary/secondary daemon setup
- Automatic failover
- State replication
- Load balancing
- Health checks with auto-recovery

### 6.2 Backup & Recovery
- Automatic state backups
- Cache artifact backups
- Point-in-time recovery
- Cross-region replication
- Disaster recovery procedures

### 6.3 Performance Optimization
- Connection pooling
- Request batching
- Lazy loading
- Incremental updates
- Memory-mapped file access

---

## Phase 7: GitHub Integration

### 7.1 GitHub App
- Repository webhooks
- Pull request builds
- Status checks
- Commit status updates
- Release automation

### 7.2 Actions Integration
```yaml
# .github/workflows/build.yml
- name: BuildNet Build
  uses: musclemap/buildnet-action@v1
  with:
    endpoint: ${{ secrets.BUILDNET_URL }}
    api_key: ${{ secrets.BUILDNET_KEY }}
    packages: all
```

### 7.3 Deployment Pipeline
- Build → Test → Deploy workflow
- Environment promotion (dev → staging → prod)
- Rollback capabilities
- Deployment notifications
- Artifact versioning

---

## Phase 8: MuscleMap Integration

### 8.1 Dedicated Page
- `/tools/buildnet` on musclemap.me
- Documentation and tutorials
- Live demo environment
- Download links
- Community forum

### 8.2 Separate Repository
- `github.com/musclemap/buildnet`
- Standalone package on npm/cargo
- CI/CD with GitHub Actions
- Automated releases
- Community contributions

### 8.3 Documentation
- Getting started guide
- API reference
- Configuration guide
- Best practices
- Troubleshooting

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     BuildNet Control Plane                       │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────┤
│   Web UI    │   CLI       │  REST API   │  Node SDK   │ Agents  │
│   (React)   │  (Clap)     │  (Axum)     │  (TS)       │  (JWT)  │
└──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┴────┬────┘
       │             │             │             │           │
       └─────────────┴─────────────┴─────────────┴───────────┘
                                   │
                     ┌─────────────┴─────────────┐
                     │     BuildNet Daemon       │
                     │     (Rust Native)         │
                     ├───────────────────────────┤
                     │  ┌─────────────────────┐  │
                     │  │   Build Orchestrator │  │
                     │  └──────────┬──────────┘  │
                     │             │              │
                     │  ┌──────────┴──────────┐  │
                     │  │                     │  │
                     │  ▼                     ▼  │
                     │ State Manager    Artifact Cache │
                     │ (SQLite WAL)     (Blake3 Hash)  │
                     └───────────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
         ┌─────────┐         ┌─────────┐         ┌─────────┐
         │ Package │         │ Package │         │ Package │
         │ shared  │◄────────│  core   │◄────────│   api   │
         └─────────┘         └─────────┘         └─────────┘
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

### Medium-term (Next Quarter)
9. User authentication
10. External agent support
11. Template system
12. GitHub App integration

### Long-term (Future)
13. High availability setup
14. Separate repository
15. npm/cargo package publishing
16. Community plugins

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
│       └── config.rs                   # Configuration
├── buildnet-daemon/                    # HTTP daemon
│   ├── src/
│   │   ├── main.rs                     # CLI entry
│   │   ├── api.rs                      # Axum routes
│   │   └── cli.rs                      # Clap commands
│   └── static/
│       └── index.html                  # Web control panel
└── buildnet-ffi/                       # FFI bindings
    └── src/lib.rs                      # C ABI + napi-rs

.buildnet/
├── config.json                         # Package configuration
├── state.db                            # SQLite state database
└── cache/                              # Artifact cache directory
```

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
