#!/bin/bash
# Unified Log Viewer for MuscleMap

DB="/var/www/musclemap.me/musclemap.db"

case "$1" in
  frontend)
    echo "=== Recent Frontend Logs ==="
    sqlite3 -header -column $DB "SELECT id, level, type, url, substr(data,1,50) as data, created_at FROM frontend_logs ORDER BY created_at DESC LIMIT ${2:-20};"
    ;;
  backend)
    echo "=== Recent Backend Transactions ==="
    sqlite3 -header -column $DB "SELECT trace_id, method, path, status_code, round(duration_ms,1) as ms, success, created_at FROM transactions ORDER BY created_at DESC LIMIT ${2:-20};"
    ;;
  errors)
    echo "=== Recent Errors ==="
    echo "-- Frontend --"
    sqlite3 -header -column $DB "SELECT type, substr(data,1,80) as data, created_at FROM frontend_logs WHERE level='error' ORDER BY created_at DESC LIMIT 10;"
    echo ""
    echo "-- Backend --"
    sqlite3 -header -column $DB "SELECT path, status_code, created_at FROM transactions WHERE success=0 ORDER BY created_at DESC LIMIT 10;"
    ;;
  audit)
    echo "=== Audit Log ==="
    sqlite3 -header -column $DB "SELECT action, entity_type, entity_id, created_at FROM audit_log ORDER BY created_at DESC LIMIT ${2:-20};"
    ;;
  credits)
    echo "=== Credit Audit ==="
    sqlite3 -header -column $DB "SELECT action, amount, balance_after, reason, created_at FROM credit_audit_log ORDER BY created_at DESC LIMIT ${2:-20};"
    ;;
  metrics)
    echo "=== System Metrics (Last Hour) ==="
    sqlite3 -header -column $DB "SELECT name, round(AVG(value),2) as avg, COUNT(*) as samples FROM metrics WHERE created_at > datetime('now', '-1 hour') GROUP BY name;"
    ;;
  sessions)
    echo "=== Active Frontend Sessions ==="
    sqlite3 -header -column $DB "SELECT session_id, user_id, COUNT(*) as events, MIN(created_at) as started, MAX(created_at) as last_activity FROM frontend_logs GROUP BY session_id ORDER BY last_activity DESC LIMIT ${2:-10};"
    ;;
  summary)
    echo "=== System Summary ==="
    echo "Frontend logs (24h): $(sqlite3 $DB "SELECT COUNT(*) FROM frontend_logs WHERE created_at > datetime('now', '-24 hours');")"
    echo "Backend requests (24h): $(sqlite3 $DB "SELECT COUNT(*) FROM transactions WHERE created_at > datetime('now', '-24 hours');")"
    echo "Frontend errors (24h): $(sqlite3 $DB "SELECT COUNT(*) FROM frontend_logs WHERE level='error' AND created_at > datetime('now', '-24 hours');")"
    echo "Backend errors (24h): $(sqlite3 $DB "SELECT COUNT(*) FROM transactions WHERE success=0 AND created_at > datetime('now', '-24 hours');")"
    echo "Avg response time: $(sqlite3 $DB "SELECT round(AVG(duration_ms),2) FROM transactions WHERE created_at > datetime('now', '-1 hour');")ms"
    echo "Unique users (24h): $(sqlite3 $DB "SELECT COUNT(DISTINCT user_id) FROM transactions WHERE user_id IS NOT NULL AND created_at > datetime('now', '-24 hours');")"
    echo "Frontend sessions: $(sqlite3 $DB "SELECT COUNT(DISTINCT session_id) FROM frontend_logs WHERE created_at > datetime('now', '-24 hours');")"
    ;;
  live)
    echo "=== Live Log Tail (Ctrl+C to stop) ==="
    watch -n 2 "sqlite3 -header -column $DB \"SELECT level, type, substr(url,1,30) as url, created_at FROM frontend_logs ORDER BY created_at DESC LIMIT 10;\" && echo '' && sqlite3 -header -column $DB \"SELECT method, path, status_code, round(duration_ms,1) as ms FROM transactions ORDER BY created_at DESC LIMIT 10;\""
    ;;
  *)
    echo "MuscleMap Unified Log Viewer"
    echo ""
    echo "Usage: $0 <command> [limit]"
    echo ""
    echo "Commands:"
    echo "  frontend [n]  - Recent frontend logs"
    echo "  backend [n]   - Recent backend transactions"
    echo "  errors        - Recent errors (both)"
    echo "  audit [n]     - Audit log"
    echo "  credits [n]   - Credit audit log"
    echo "  metrics       - System metrics"
    echo "  sessions [n]  - Frontend sessions"
    echo "  summary       - Quick summary"
    echo "  live          - Live tail (watch mode)"
    ;;
esac
