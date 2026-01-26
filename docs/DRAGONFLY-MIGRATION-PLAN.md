# DragonflyDB Migration Plan

## Executive Summary

This document outlines the migration from Redis 8 to DragonflyDB v1.36.0 on the MuscleMap production server. DragonflyDB is a modern, Redis-compatible in-memory data store that offers:

- **25x faster performance** than Redis
- **80% less memory usage** than Redis
- **Wire-compatible** with Redis (drop-in replacement)
- **Multi-threaded architecture** (vs Redis single-threaded)
- **Built-in snapshots** and persistence

## Current State

| Component | Value |
|-----------|-------|
| Server | Hostinger VPS (musclemap.me) |
| Current Redis | 8.0.2 |
| Redis Port | 6379 (localhost only) |
| OS | Debian 13 |
| RAM | 8GB |
| Redis Usage | Caching, Pub/Sub, Rate Limiting, Distributed Locks, BullMQ Jobs |

## Migration Strategy

### Phase 1: Install DragonflyDB alongside Redis
- Install DragonflyDB on a different port (6380)
- Test connectivity and basic operations
- Verify wire compatibility

### Phase 2: Configure DragonflyDB
- Create systemd service
- Configure persistence (RDB snapshots)
- Set memory limits
- Configure authentication

### Phase 3: Migrate Traffic
- Stop Redis
- Start DragonflyDB on port 6379
- Verify all services working

### Phase 4: Cleanup
- Remove Redis package
- Update documentation

## Rollback Strategy

If issues are detected:
1. Stop DragonflyDB: `systemctl stop dragonfly`
2. Start Redis: `systemctl start redis-server`
3. Verify services: `redis-cli ping`

**Data Note:** Since Redis is used for ephemeral data (caches, sessions, locks), no data migration is required. All caches will rebuild naturally.

---

## Installation Commands

### Step 1: Download and Install DragonflyDB

```bash
# Download the latest .deb package
wget https://github.com/dragonflydb/dragonfly/releases/download/v1.36.0/dragonfly_amd64.deb

# Install
dpkg -i dragonfly_amd64.deb

# If dependencies are missing
apt-get install -f
```

### Step 2: Create Configuration File

```bash
mkdir -p /etc/dragonfly
cat > /etc/dragonfly/dragonfly.conf << 'EOF'
# DragonflyDB Configuration for MuscleMap
# Wire-compatible Redis replacement

# Network
--bind=127.0.0.1
--port=6379

# Memory
--maxmemory=512mb
--cache_mode=true

# Persistence (RDB snapshots every hour)
--dir=/var/lib/dragonfly
--dbfilename=dump.rdb
--snapshot_cron=0 * * * *

# Logging
--log_dir=/var/log/dragonfly
--logtostderr=false

# Performance
--proactor_threads=2
--hz=100

# Security (optional - add password if needed)
# --requirepass=your_password_here
EOF
```

### Step 3: Create Systemd Service

```bash
cat > /etc/systemd/system/dragonfly.service << 'EOF'
[Unit]
Description=DragonflyDB - In-Memory Data Store
Documentation=https://www.dragonflydb.io/docs
After=network.target

[Service]
Type=simple
User=root
Group=root
ExecStart=/usr/bin/dragonfly --flagfile=/etc/dragonfly/dragonfly.conf
ExecStop=/bin/kill -SIGTERM $MAINPID
Restart=always
RestartSec=5
LimitNOFILE=65535

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/dragonfly /var/log/dragonfly

[Install]
WantedBy=multi-user.target
EOF
```

### Step 4: Create Required Directories

```bash
mkdir -p /var/lib/dragonfly
mkdir -p /var/log/dragonfly
chmod 755 /var/lib/dragonfly /var/log/dragonfly
```

### Step 5: Perform the Migration

```bash
# Stop Redis
systemctl stop redis-server
systemctl disable redis-server

# Start DragonflyDB
systemctl daemon-reload
systemctl enable dragonfly
systemctl start dragonfly

# Verify
redis-cli ping
# Should return: PONG
```

### Step 6: Verify Application

```bash
# Check MuscleMap API health
curl http://localhost:3001/health

# Check PM2 status
pm2 status

# View DragonflyDB logs
journalctl -u dragonfly -f
```

### Step 7: Remove Redis (After Verification)

```bash
# Only after confirming everything works
apt remove redis-server redis-tools
apt autoremove
```

---

## Configuration Comparison

| Setting | Redis 8 | DragonflyDB |
|---------|---------|-------------|
| Port | 6379 | 6379 (same) |
| Bind | 127.0.0.1 | 127.0.0.1 (same) |
| Max Memory | Not set | 512MB |
| Persistence | RDB | RDB (same format) |
| Threads | 1 | 2 (multi-threaded) |
| Cache Mode | No | Yes (LRU eviction) |

## Expected Benefits

1. **Memory Reduction**: ~50-80% less memory usage
2. **Performance**: 25x faster for most operations
3. **Multi-threaded**: Better utilization of 2-core VPS
4. **Modern**: Active development, better monitoring
5. **Compatible**: No code changes required (uses ioredis)

## Files Changed

| File | Change |
|------|--------|
| `/etc/dragonfly/dragonfly.conf` | New - DragonflyDB config |
| `/etc/systemd/system/dragonfly.service` | New - Systemd service |
| `docs/SYSTEM-ARCHITECTURE.md` | Update Redis → DragonflyDB |
| `CLAUDE.md` | Update Redis → DragonflyDB |

## Verification Checklist

- [ ] DragonflyDB service running: `systemctl status dragonfly`
- [ ] Redis CLI works: `redis-cli ping` → PONG
- [ ] API health check: `curl https://musclemap.me/health`
- [ ] Caching working: Check `/metrics` for cache hits
- [ ] Pub/Sub working: Test real-time features
- [ ] Rate limiting working: Check API responses
- [ ] BullMQ jobs working: Check bug-fix queue

---

*Document Version: 1.0*
*Created: 2025-01-26*
