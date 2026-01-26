# BuildNet Notification & Remote Control System

## Overview

The BuildNet Notification System provides a comprehensive, multi-channel notification and remote control infrastructure for the BuildNet daemon. It enables real-time alerts, historical reporting, and remote command execution via SMS, email, webhooks, and more.

---

## Table of Contents

1. [Event Types](#event-types)
2. [Notification Channels](#notification-channels)
3. [Remote Control Interface](#remote-control-interface)
4. [Resource Monitoring](#resource-monitoring)
5. [Configuration](#configuration)
6. [Historical Reports](#historical-reports)
7. [Architecture](#architecture)
8. [Implementation Phases](#implementation-phases)
9. [Security](#security)
10. [API Reference](#api-reference)

---

## Event Types

### Build Events

| Event | Description | Default Priority |
|-------|-------------|------------------|
| `build.started` | Build process initiated | Low |
| `build.completed` | Build finished successfully | Medium |
| `build.failed` | Build encountered errors | High |
| `build.cached` | Build skipped (cache hit) | Low |
| `build.queued` | Build added to queue | Low |
| `build.cancelled` | Build was cancelled | Medium |

### Resource Events

| Event | Description | Default Priority |
|-------|-------------|------------------|
| `resource.cpu.high` | CPU usage exceeds threshold | High |
| `resource.memory.high` | Memory usage exceeds threshold | High |
| `resource.disk.low` | Disk space below threshold | Critical |
| `resource.cpu.normal` | CPU returned to normal | Low |
| `resource.memory.normal` | Memory returned to normal | Low |

### System Events

| Event | Description | Default Priority |
|-------|-------------|------------------|
| `daemon.started` | BuildNet daemon started | Medium |
| `daemon.stopped` | BuildNet daemon stopped | High |
| `daemon.error` | Daemon encountered error | Critical |
| `daemon.recovered` | Daemon recovered from error | Medium |

### Cluster Events (Distributed Mode)

| Event | Description | Default Priority |
|-------|-------------|------------------|
| `node.joined` | New worker node joined cluster | Medium |
| `node.left` | Worker node left cluster | High |
| `node.failed` | Worker node failed health check | Critical |
| `node.recovered` | Worker node recovered | Medium |
| `plugin.loaded` | Plugin loaded successfully | Low |
| `plugin.failed` | Plugin failed to load | High |
| `plugin.unloaded` | Plugin unloaded | Low |

### Cache Events

| Event | Description | Default Priority |
|-------|-------------|------------------|
| `cache.cleared` | Cache was cleared | Medium |
| `cache.threshold` | Cache size exceeded threshold | Medium |
| `cache.artifact.created` | New artifact cached | Low |
| `cache.artifact.evicted` | Artifact evicted from cache | Low |

---

## Notification Channels

### 1. SMS (Twilio)

Send notifications via text message for critical alerts.

```yaml
notifications:
  channels:
    sms:
      enabled: true
      provider: twilio
      account_sid: "AC..."
      auth_token: "${TWILIO_AUTH_TOKEN}"
      from_number: "+1234567890"
      recipients:
        - phone: "+1987654321"
          name: "DevOps Lead"
          events: ["build.failed", "daemon.error", "node.failed"]
        - phone: "+1555123456"
          name: "Team Lead"
          events: ["*"]  # All events
```

**SMS Commands (Inbound):**
```
STATUS          → Get current daemon status
BUILD           → Trigger build all
BUILD api       → Build specific package
STOP            → Stop daemon (requires confirmation)
REPORT daily    → Get daily summary
HELP            → List available commands
```

### 2. Email (SMTP/SendGrid/SES)

Rich HTML email notifications with detailed reports.

```yaml
notifications:
  channels:
    email:
      enabled: true
      provider: smtp  # smtp | sendgrid | ses
      smtp:
        host: "smtp.gmail.com"
        port: 587
        username: "buildnet@example.com"
        password: "${SMTP_PASSWORD}"
        tls: true
      from: "BuildNet <buildnet@example.com>"
      recipients:
        - email: "devops@example.com"
          name: "DevOps Team"
          events: ["build.failed", "daemon.*", "node.*"]
          format: "html"  # html | text | digest
        - email: "alerts@example.com"
          name: "Alerts Channel"
          events: ["*.failed", "*.error", "*.critical"]
          format: "text"
```

**Email Commands (Inbound via IMAP/Webhook):**
- Subject-based commands: `[BUILDNET] BUILD api`
- Reply to notification emails with commands
- Supports confirmation workflows

### 3. Webhooks

Generic webhook support for custom integrations.

```yaml
notifications:
  channels:
    webhooks:
      - name: "Slack"
        url: "https://hooks.slack.com/services/..."
        events: ["*"]
        format: "slack"
        headers:
          Content-Type: "application/json"
        template: |
          {
            "text": "{{event.type}}: {{event.message}}",
            "attachments": [...]
          }

      - name: "Discord"
        url: "https://discord.com/api/webhooks/..."
        events: ["build.*"]
        format: "discord"

      - name: "Custom API"
        url: "https://api.example.com/buildnet/events"
        events: ["*"]
        format: "json"
        auth:
          type: "bearer"
          token: "${WEBHOOK_TOKEN}"
```

### 4. Push Notifications (Mobile)

Native push notifications via Firebase/APNs.

```yaml
notifications:
  channels:
    push:
      enabled: true
      firebase:
        project_id: "buildnet-notifications"
        credentials: "${FIREBASE_CREDENTIALS}"
      topics:
        - name: "critical-alerts"
          events: ["*.failed", "*.error", "*.critical"]
        - name: "build-updates"
          events: ["build.*"]
```

### 5. Slack Integration

Native Slack app with slash commands.

```yaml
notifications:
  channels:
    slack:
      enabled: true
      bot_token: "${SLACK_BOT_TOKEN}"
      app_token: "${SLACK_APP_TOKEN}"
      default_channel: "#buildnet"
      channels:
        - id: "C123456"
          name: "#builds"
          events: ["build.*"]
        - id: "C789012"
          name: "#alerts"
          events: ["*.failed", "daemon.*"]
```

**Slack Commands:**
```
/buildnet status           → Current status
/buildnet build [package]  → Trigger build
/buildnet history [n]      → Last n builds
/buildnet report [period]  → Generate report
```

### 6. Discord Integration

Discord bot with slash commands.

```yaml
notifications:
  channels:
    discord:
      enabled: true
      bot_token: "${DISCORD_BOT_TOKEN}"
      guild_id: "123456789"
      channels:
        - id: "987654321"
          name: "builds"
          events: ["build.*"]
```

### 7. Telegram Integration

Telegram bot for notifications and commands.

```yaml
notifications:
  channels:
    telegram:
      enabled: true
      bot_token: "${TELEGRAM_BOT_TOKEN}"
      allowed_users:
        - id: "123456789"
          name: "Admin"
          commands: ["*"]
        - id: "987654321"
          name: "Developer"
          commands: ["status", "build"]
```

---

## Remote Control Interface

### Command Authentication

All remote commands require authentication:

```yaml
remote_control:
  enabled: true
  authentication:
    # API Key authentication
    api_keys:
      - key: "${BUILDNET_API_KEY}"
        name: "Admin Key"
        permissions: ["*"]
      - key: "${BUILDNET_READONLY_KEY}"
        name: "Read-Only Key"
        permissions: ["status", "history", "report"]

    # SMS authentication (phone number verification)
    sms:
      allowed_numbers:
        - "+1234567890"  # Verified admin number
      require_confirmation: true  # Require YES/NO for destructive actions

    # Email authentication (DKIM/SPF verification)
    email:
      allowed_domains:
        - "example.com"
      allowed_addresses:
        - "admin@example.com"
      require_signed: true  # Require DKIM signature
```

### Available Commands

| Command | Description | Auth Level |
|---------|-------------|------------|
| `STATUS` | Get current daemon status | Read |
| `BUILD [pkg]` | Trigger build (all or specific) | Build |
| `CANCEL [id]` | Cancel queued/running build | Build |
| `CACHE STATS` | Get cache statistics | Read |
| `CACHE CLEAR` | Clear build cache | Admin |
| `HISTORY [n]` | Get last n builds | Read |
| `REPORT [period]` | Generate report (daily/weekly/monthly) | Read |
| `CONFIG GET [key]` | Get configuration value | Read |
| `CONFIG SET [key] [value]` | Set configuration value | Admin |
| `PAUSE` | Pause build processing | Admin |
| `RESUME` | Resume build processing | Admin |
| `STOP` | Stop daemon (graceful) | Admin |
| `RESTART` | Restart daemon | Admin |
| `NODE LIST` | List cluster nodes | Read |
| `NODE ADD [url]` | Add worker node | Admin |
| `NODE REMOVE [id]` | Remove worker node | Admin |
| `PLUGIN LIST` | List loaded plugins | Read |
| `PLUGIN LOAD [name]` | Load plugin | Admin |
| `PLUGIN UNLOAD [name]` | Unload plugin | Admin |

### Command Response Format

```json
{
  "command": "BUILD api",
  "status": "accepted",
  "request_id": "req_abc123",
  "timestamp": "2024-01-26T12:00:00Z",
  "result": {
    "build_id": "build_xyz789",
    "package": "api",
    "queued_position": 1,
    "estimated_start": "2024-01-26T12:00:05Z"
  },
  "message": "Build queued for package 'api'"
}
```

---

## Resource Monitoring

### System Resources

```yaml
monitoring:
  resources:
    cpu:
      enabled: true
      interval_secs: 5
      thresholds:
        warning: 70
        critical: 90
      events:
        on_warning: "resource.cpu.warning"
        on_critical: "resource.cpu.high"
        on_recovery: "resource.cpu.normal"

    memory:
      enabled: true
      interval_secs: 5
      thresholds:
        warning_percent: 70
        critical_percent: 90
        warning_mb: 6144
        critical_mb: 7168
      events:
        on_warning: "resource.memory.warning"
        on_critical: "resource.memory.high"
        on_recovery: "resource.memory.normal"

    disk:
      enabled: true
      interval_secs: 60
      paths:
        - path: "/var/www/musclemap.me"
          warning_percent: 80
          critical_percent: 95
        - path: "/tmp"
          warning_percent: 90
          critical_percent: 98
      events:
        on_warning: "resource.disk.warning"
        on_critical: "resource.disk.low"
        on_recovery: "resource.disk.normal"
```

### Build Resources

```yaml
monitoring:
  builds:
    # Track build times
    duration:
      enabled: true
      warning_secs: 300  # 5 minutes
      critical_secs: 600  # 10 minutes

    # Track build queue
    queue:
      enabled: true
      warning_size: 10
      critical_size: 50

    # Track failure rate
    failure_rate:
      enabled: true
      window_mins: 60
      warning_percent: 20
      critical_percent: 50
```

### Cluster Resources

```yaml
monitoring:
  cluster:
    enabled: true

    # Worker node health
    nodes:
      health_check_interval_secs: 30
      timeout_secs: 10
      max_failures: 3  # Mark unhealthy after 3 failures

    # Capacity tracking
    capacity:
      warning_percent: 80  # Cluster at 80% capacity
      critical_percent: 95

    # Plugin health
    plugins:
      health_check_interval_secs: 60
```

---

## Configuration

### Full Configuration Example

```yaml
# .buildnet/notifications.yaml

notifications:
  enabled: true

  # Global settings
  settings:
    # Minimum time between duplicate notifications
    dedup_window_secs: 300

    # Rate limiting
    rate_limit:
      max_per_minute: 10
      max_per_hour: 100

    # Quiet hours (no non-critical notifications)
    quiet_hours:
      enabled: true
      start: "22:00"
      end: "08:00"
      timezone: "America/New_York"
      exceptions: ["*.critical", "daemon.error"]

    # Default priority if not specified
    default_priority: "medium"

    # Priority levels
    priorities:
      low:
        channels: ["webhook"]
        delay_secs: 60  # Batch low-priority notifications
      medium:
        channels: ["email", "slack", "webhook"]
        delay_secs: 0
      high:
        channels: ["email", "slack", "sms", "webhook"]
        delay_secs: 0
      critical:
        channels: ["email", "slack", "sms", "push", "webhook"]
        delay_secs: 0
        override_quiet_hours: true

  # Channel configurations
  channels:
    sms:
      enabled: true
      provider: twilio
      account_sid: "${TWILIO_ACCOUNT_SID}"
      auth_token: "${TWILIO_AUTH_TOKEN}"
      from_number: "+1234567890"
      recipients:
        - phone: "+1987654321"
          name: "DevOps Lead"
          events: ["build.failed", "daemon.*", "*.critical"]

    email:
      enabled: true
      provider: smtp
      smtp:
        host: "smtp.gmail.com"
        port: 587
        username: "${SMTP_USERNAME}"
        password: "${SMTP_PASSWORD}"
        tls: true
      from: "BuildNet <buildnet@musclemap.me>"
      recipients:
        - email: "devops@musclemap.me"
          events: ["*"]
          format: "html"

    slack:
      enabled: true
      bot_token: "${SLACK_BOT_TOKEN}"
      default_channel: "#buildnet"

    webhooks:
      - name: "Custom Monitoring"
        url: "https://monitoring.example.com/events"
        events: ["*"]

# Remote control configuration
remote_control:
  enabled: true

  # Inbound SMS commands
  sms:
    enabled: true
    webhook_url: "/api/notifications/sms/inbound"
    allowed_numbers:
      - "+1987654321"
    commands_enabled: true

  # Inbound email commands
  email:
    enabled: true
    imap:
      host: "imap.gmail.com"
      port: 993
      username: "${IMAP_USERNAME}"
      password: "${IMAP_PASSWORD}"
      folder: "INBOX"
      poll_interval_secs: 60
    command_prefix: "[BUILDNET]"
    allowed_senders:
      - "admin@musclemap.me"

  # Command confirmation
  confirmation:
    # Commands requiring confirmation
    require_confirmation:
      - "CACHE CLEAR"
      - "STOP"
      - "RESTART"
      - "NODE REMOVE"
      - "PLUGIN UNLOAD"
    # Confirmation timeout
    timeout_secs: 300
    # Confirmation code length
    code_length: 6

# Resource monitoring
monitoring:
  enabled: true
  interval_secs: 10

  resources:
    cpu:
      enabled: true
      warning: 70
      critical: 90

    memory:
      enabled: true
      warning: 70
      critical: 90

    disk:
      enabled: true
      paths:
        - path: "/"
          warning: 80
          critical: 95

# Historical reports
reports:
  enabled: true

  # Automatic scheduled reports
  scheduled:
    - name: "Daily Summary"
      cron: "0 9 * * *"  # 9 AM daily
      type: "summary"
      period: "24h"
      recipients: ["email:devops@musclemap.me"]

    - name: "Weekly Report"
      cron: "0 9 * * 1"  # 9 AM Monday
      type: "detailed"
      period: "7d"
      recipients: ["email:team@musclemap.me"]

    - name: "Monthly Analytics"
      cron: "0 9 1 * *"  # 9 AM first of month
      type: "analytics"
      period: "30d"
      recipients: ["email:leadership@musclemap.me"]

  # Report storage
  storage:
    path: ".buildnet/reports"
    retention_days: 90
    formats: ["html", "pdf", "json"]
```

---

## Historical Reports

### Report Types

#### 1. Summary Report
Quick overview of build activity.

```
BuildNet Summary Report
Period: 2024-01-25 to 2024-01-26

Builds: 47 total
  ✅ Successful: 42 (89%)
  ❌ Failed: 5 (11%)
  ⏱️ Avg Duration: 12.3s

Cache:
  📦 Hits: 35 (74%)
  🔨 Misses: 12 (26%)
  💾 Size: 4.2 MB

Top Failures:
  1. api (3 failures)
  2. ui (2 failures)
```

#### 2. Detailed Report
Comprehensive build-by-build analysis.

```
BuildNet Detailed Report
Period: 2024-01-19 to 2024-01-26

=== Build History ===
| Time | Package | Status | Duration | Tier |
|------|---------|--------|----------|------|
| 09:15 | api | ✅ | 8.2s | SmartIncremental |
| 09:12 | shared | ✅ | 2.1s | CacheRestore |
| ...

=== Failure Analysis ===
Build #build_123 (api) - FAILED
  Time: 2024-01-25 14:32:00
  Error: TypeScript compilation failed
  Files changed: 3
  Suggested action: Review src/api/routes.ts:42

=== Resource Usage ===
Peak CPU: 78% at 14:32
Peak Memory: 3.2 GB at 14:32
Disk Usage: 42% → 45%

=== Recommendations ===
1. Consider increasing cache TTL for 'shared' package
2. Build failures cluster around 14:00-15:00 - investigate
```

#### 3. Analytics Report
Trend analysis and performance metrics.

```
BuildNet Analytics Report
Period: 2024-01-01 to 2024-01-31

=== Performance Trends ===
           Week 1   Week 2   Week 3   Week 4
Builds:      120      145      132      158
Success:     92%      94%      89%      95%
Avg Time:   15.2s    14.1s    16.8s    12.3s

=== Cache Efficiency ===
Hit Rate Trend: ↑ 68% → 82%
Size Growth: 2.1 MB → 4.8 MB
Evictions: 12

=== Resource Trends ===
[CPU Usage Graph]
[Memory Usage Graph]
[Build Duration Graph]

=== Insights ===
• Build times improved 19% after cache optimization
• Tuesday builds have 15% higher failure rate
• Peak usage: 14:00-16:00 daily
```

### On-Demand Reports

Request reports via any control channel:

```
SMS: REPORT daily
Email: Subject: [BUILDNET] REPORT weekly
Slack: /buildnet report monthly
API: POST /api/reports/generate { "type": "detailed", "period": "7d" }
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        BuildNet Notification System                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌──────────┐  │
│  │   SMS       │    │   Email     │    │   Webhook   │    │  Push    │  │
│  │  (Twilio)   │    │  (SMTP)     │    │  (HTTP)     │    │ (FCM)    │  │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └────┬─────┘  │
│         │                  │                  │                 │        │
│         └──────────────────┴──────────────────┴─────────────────┘        │
│                                    │                                      │
│                         ┌──────────┴──────────┐                          │
│                         │  Notification Router │                          │
│                         │  (Priority, Dedup,   │                          │
│                         │   Rate Limit, Batch) │                          │
│                         └──────────┬──────────┘                          │
│                                    │                                      │
│         ┌──────────────────────────┼──────────────────────────┐          │
│         │                          │                          │          │
│  ┌──────┴──────┐           ┌───────┴───────┐         ┌───────┴───────┐  │
│  │ Event Bus   │           │ Command Handler│         │Report Generator│  │
│  │ (Tokio      │           │ (Auth, Parse,  │         │ (Templates,    │  │
│  │  Broadcast) │           │  Execute)      │         │  Charts, PDF)  │  │
│  └──────┬──────┘           └───────┬───────┘         └───────┬───────┘  │
│         │                          │                          │          │
│         └──────────────────────────┼──────────────────────────┘          │
│                                    │                                      │
│                         ┌──────────┴──────────┐                          │
│                         │   BuildNet Daemon    │                          │
│                         │   (Core Engine)      │                          │
│                         └─────────────────────┘                          │
│                                                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                           Data Stores                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                  │
│  │ Event Log   │    │ Command Log │    │ Report Store│                  │
│  │ (SQLite)    │    │ (SQLite)    │    │ (Files)     │                  │
│  └─────────────┘    └─────────────┘    └─────────────┘                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Components

1. **Event Bus**: Tokio broadcast channel for internal event distribution
2. **Notification Router**: Handles priority, deduplication, rate limiting, batching
3. **Channel Adapters**: Provider-specific implementations (Twilio, SMTP, etc.)
4. **Command Handler**: Parses and authenticates inbound commands
5. **Report Generator**: Generates HTML/PDF reports with charts

---

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)
- [ ] Event bus implementation
- [ ] Notification router with priority/dedup/rate-limit
- [ ] SQLite event logging
- [ ] Configuration parser

### Phase 2: Basic Channels (Week 3-4)
- [ ] Webhook channel (HTTP POST)
- [ ] Email channel (SMTP)
- [ ] SMS channel (Twilio)

### Phase 3: Remote Control (Week 5-6)
- [ ] Command parser
- [ ] Authentication system
- [ ] Inbound SMS webhook
- [ ] Inbound email (IMAP polling)
- [ ] Confirmation workflow

### Phase 4: Resource Monitoring (Week 7-8)
- [ ] System resource monitoring (CPU, memory, disk)
- [ ] Build resource monitoring
- [ ] Threshold alerting
- [ ] Recovery detection

### Phase 5: Reports (Week 9-10)
- [ ] Report data collection
- [ ] Summary report generator
- [ ] Detailed report generator
- [ ] Scheduled report cron
- [ ] PDF generation

### Phase 6: Advanced Channels (Week 11-12)
- [ ] Slack app integration
- [ ] Discord bot integration
- [ ] Telegram bot integration
- [ ] Push notifications (FCM)

### Phase 7: Cluster Support (Week 13-14)
- [ ] Node health monitoring
- [ ] Node join/leave events
- [ ] Plugin lifecycle events
- [ ] Distributed command routing

### Phase 8: Polish & Documentation (Week 15-16)
- [ ] Web UI for notification config
- [ ] Template customization
- [ ] Comprehensive documentation
- [ ] Integration tests

---

## Security

### Authentication Methods

| Method | Use Case | Security Level |
|--------|----------|----------------|
| API Key | Programmatic access | High |
| Phone Verification | SMS commands | Medium |
| Email DKIM | Email commands | Medium |
| JWT Token | Web UI | High |
| Confirmation Codes | Destructive actions | High |

### Security Best Practices

1. **Never log sensitive data** (API keys, passwords)
2. **Rate limit all inbound channels** to prevent abuse
3. **Require confirmation** for destructive commands
4. **Audit log all commands** with source and result
5. **Encrypt credentials** at rest
6. **Use HTTPS** for all webhook endpoints
7. **Validate phone numbers** before allowing SMS commands
8. **Verify DKIM/SPF** for email commands

### Audit Logging

```json
{
  "timestamp": "2024-01-26T12:00:00Z",
  "event_type": "command.executed",
  "command": "BUILD api",
  "source": {
    "channel": "sms",
    "identifier": "+1987654321",
    "authenticated": true
  },
  "result": {
    "status": "success",
    "build_id": "build_xyz789"
  },
  "ip_address": null,
  "user_agent": null
}
```

---

## API Reference

### REST Endpoints

#### Notifications

```
GET  /api/notifications/config
     Get current notification configuration

POST /api/notifications/config
     Update notification configuration

GET  /api/notifications/events
     Get event history (paginated)

POST /api/notifications/test
     Send test notification to channel
```

#### Remote Control

```
POST /api/commands/execute
     Execute a command
     Body: { "command": "BUILD api", "auth": "api_key_here" }

GET  /api/commands/history
     Get command history (paginated)

POST /api/commands/confirm
     Confirm a pending command
     Body: { "request_id": "req_abc123", "code": "123456" }
```

#### Reports

```
POST /api/reports/generate
     Generate a report
     Body: { "type": "summary", "period": "24h" }

GET  /api/reports
     List generated reports

GET  /api/reports/{id}
     Download a report

GET  /api/reports/{id}/status
     Check report generation status
```

#### Webhooks (Inbound)

```
POST /api/notifications/sms/inbound
     Twilio webhook for inbound SMS

POST /api/notifications/slack/events
     Slack events webhook

POST /api/notifications/slack/commands
     Slack slash commands webhook
```

### WebSocket Events

```javascript
// Connect to event stream
const ws = new WebSocket('wss://buildnet.example.com/ws/events');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // data.type: "build.started" | "build.completed" | ...
  // data.payload: { ... }
  // data.timestamp: "2024-01-26T12:00:00Z"
};
```

---

## Quick Start

### 1. Enable Notifications

```bash
# Create configuration file
cat > .buildnet/notifications.yaml << 'EOF'
notifications:
  enabled: true
  channels:
    webhooks:
      - name: "Slack Webhook"
        url: "${SLACK_WEBHOOK_URL}"
        events: ["build.*"]
EOF
```

### 2. Set Environment Variables

```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
export TWILIO_ACCOUNT_SID="AC..."
export TWILIO_AUTH_TOKEN="..."
```

### 3. Test Notifications

```bash
curl -X POST http://localhost:9876/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{"channel": "slack", "message": "Test notification"}'
```

### 4. Enable Remote Control

```yaml
# Add to .buildnet/notifications.yaml
remote_control:
  enabled: true
  sms:
    enabled: true
    allowed_numbers:
      - "+1234567890"
```

### 5. Send a Command

```bash
# Via SMS: Send "STATUS" to your BuildNet number
# Via API:
curl -X POST http://localhost:9876/api/commands/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "STATUS", "auth": "your-api-key"}'
```

---

## Troubleshooting

### Common Issues

**Notifications not sending:**
1. Check channel is enabled in config
2. Verify credentials are correct
3. Check rate limits haven't been exceeded
4. Review error logs: `pm2 logs buildnet --lines 100`

**SMS commands not working:**
1. Verify phone number is in allowed list
2. Check Twilio webhook URL is configured
3. Ensure webhook endpoint is accessible

**Reports not generating:**
1. Check disk space for report storage
2. Verify cron syntax is correct
3. Check report generation logs

### Debug Mode

```yaml
notifications:
  debug: true  # Enable verbose logging
  dry_run: true  # Don't actually send, just log
```

---

## See Also

- [BuildNet Master Plan](./BUILDNET-MASTER-PLAN.md)
- [BuildNet API Reference](./BUILDNET-API.md)
- [BuildNet Configuration Guide](./BUILDNET-CONFIG.md)
