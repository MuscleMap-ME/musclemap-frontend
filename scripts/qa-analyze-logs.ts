#!/usr/bin/env npx tsx
/**
 * QA Log Analyzer
 *
 * Analyzes accumulated QA session logs and extracts bugs/issues
 * for systematic fixing.
 *
 * Usage:
 *   npx tsx scripts/qa-analyze-logs.ts [--session <id>] [--since <hours>] [--export]
 *
 * Examples:
 *   npx tsx scripts/qa-analyze-logs.ts                    # Analyze last 24 hours
 *   npx tsx scripts/qa-analyze-logs.ts --since 2          # Last 2 hours
 *   npx tsx scripts/qa-analyze-logs.ts --session qa_123   # Specific session
 *   npx tsx scripts/qa-analyze-logs.ts --export           # Export to JSON file
 */

import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://musclemap:musclemap@localhost:5432/musclemap';

interface QALogEntry {
  id: string;
  session_id: string;
  user_id: string | null;
  event_type: string;
  event_data: Record<string, unknown>;
  url: string | null;
  user_agent: string | null;
  created_at: Date;
}

interface BugReport {
  id: string;
  type: 'error' | 'warning' | 'performance' | 'ux';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  occurrences: number;
  urls: string[];
  stack?: string;
  firstSeen: Date;
  lastSeen: Date;
  sessionIds: string[];
}

async function analyzeQALogs(options: {
  sessionId?: string;
  sinceHours?: number;
  export?: boolean;
}) {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    // Build query based on options
    let whereClause = '';
    const params: unknown[] = [];

    if (options.sessionId) {
      params.push(options.sessionId);
      whereClause = `WHERE session_id = $${params.length}`;
    } else {
      const hours = options.sinceHours || 24;
      params.push(hours);
      whereClause = `WHERE created_at > NOW() - INTERVAL '${hours} hours'`;
    }

    // Get summary stats
    const statsQuery = `
      SELECT
        event_type,
        COUNT(*) as count,
        COUNT(DISTINCT session_id) as sessions,
        MIN(created_at) as first_seen,
        MAX(created_at) as last_seen
      FROM qa_session_logs
      ${whereClause}
      GROUP BY event_type
      ORDER BY count DESC
    `;

    const statsResult = await client.query(statsQuery, params);

    console.log('\n==========================================');
    console.log('         QA LOG ANALYSIS REPORT');
    console.log('==========================================\n');

    console.log('📊 EVENT SUMMARY');
    console.log('------------------------------------------');
    for (const row of statsResult.rows) {
      const icon = getEventIcon(row.event_type);
      console.log(
        `  ${icon} ${row.event_type.padEnd(20)} ${row.count.toString().padStart(5)} events across ${row.sessions} sessions`
      );
    }

    // Get error details
    const errorsQuery = `
      SELECT
        event_type,
        event_data->>'message' as message,
        event_data->>'stack' as stack,
        event_data->>'source' as source,
        url,
        COUNT(*) as count,
        ARRAY_AGG(DISTINCT session_id) as session_ids,
        MIN(created_at) as first_seen,
        MAX(created_at) as last_seen
      FROM qa_session_logs
      ${whereClause}
        AND event_type IN ('js_error', 'promise_rejection', 'console_error', 'graphql_error', 'network_error')
      GROUP BY event_type, event_data->>'message', event_data->>'stack', event_data->>'source', url
      ORDER BY count DESC
      LIMIT 50
    `;

    const errorsResult = await client.query(errorsQuery, params);

    if (errorsResult.rows.length > 0) {
      console.log('\n🐛 ERRORS (Deduplicated)');
      console.log('------------------------------------------');

      const bugs: BugReport[] = [];

      for (let i = 0; i < errorsResult.rows.length; i++) {
        const row = errorsResult.rows[i];
        const severity = getSeverity(row.event_type, row.count);

        const bug: BugReport = {
          id: `BUG-${String(i + 1).padStart(3, '0')}`,
          type: 'error',
          severity,
          title: truncate(row.message || 'Unknown error', 80),
          description: row.message || 'No message',
          occurrences: parseInt(row.count, 10),
          urls: row.url ? [row.url] : [],
          stack: row.stack,
          firstSeen: row.first_seen,
          lastSeen: row.last_seen,
          sessionIds: row.session_ids,
        };

        bugs.push(bug);

        const severityIcon = getSeverityIcon(severity);
        console.log(`\n  ${severityIcon} ${bug.id}: ${bug.title}`);
        console.log(`     Type: ${row.event_type}`);
        console.log(`     Occurrences: ${row.count}`);
        console.log(`     Sessions: ${row.session_ids.length}`);
        if (row.url) console.log(`     URL: ${row.url}`);
        if (row.source) console.log(`     Source: ${row.source}`);
        if (row.stack) {
          console.log(`     Stack: ${truncate(row.stack, 200)}`);
        }
      }

      // Export if requested
      if (options.export) {
        const fs = await import('fs');
        const exportFile = `qa-bugs-${Date.now()}.json`;
        fs.writeFileSync(exportFile, JSON.stringify(bugs, null, 2));
        console.log(`\n📁 Exported ${bugs.length} bugs to ${exportFile}`);
      }
    } else {
      console.log('\n✅ No errors found! Great job!');
    }

    // Get performance issues
    const perfQuery = `
      SELECT
        event_type,
        event_data->>'loadTime' as load_time,
        event_data->>'duration' as duration,
        url,
        COUNT(*) as count
      FROM qa_session_logs
      ${whereClause}
        AND event_type IN ('slow_page_load', 'slow_request', 'long_task')
      GROUP BY event_type, event_data->>'loadTime', event_data->>'duration', url
      ORDER BY count DESC
      LIMIT 20
    `;

    const perfResult = await client.query(perfQuery, params);

    if (perfResult.rows.length > 0) {
      console.log('\n⏱️ PERFORMANCE ISSUES');
      console.log('------------------------------------------');

      for (const row of perfResult.rows) {
        const time = row.load_time || row.duration;
        console.log(`  🐢 ${row.event_type}: ${time}ms at ${truncate(row.url || 'unknown', 50)} (${row.count}x)`);
      }
    }

    // Get navigation flow
    const navQuery = `
      SELECT
        session_id,
        ARRAY_AGG(event_data->>'to' ORDER BY created_at) as pages
      FROM qa_session_logs
      ${whereClause}
        AND event_type = 'navigation'
      GROUP BY session_id
      LIMIT 5
    `;

    const navResult = await client.query(navQuery, params);

    if (navResult.rows.length > 0) {
      console.log('\n🗺️ USER JOURNEYS (Sample)');
      console.log('------------------------------------------');

      for (const row of navResult.rows) {
        console.log(`  Session ${row.session_id.substring(0, 12)}...:`);
        console.log(`    ${row.pages.slice(0, 10).join(' → ')}`);
      }
    }

    // Get animation fallbacks (iOS/Brave issues)
    const animQuery = `
      SELECT
        event_data->>'component' as component,
        event_data->>'reason' as reason,
        COUNT(*) as count
      FROM qa_session_logs
      ${whereClause}
        AND event_type = 'animation_fallback'
      GROUP BY event_data->>'component', event_data->>'reason'
      ORDER BY count DESC
    `;

    const animResult = await client.query(animQuery, params);

    if (animResult.rows.length > 0) {
      console.log('\n🎬 ANIMATION FALLBACKS (Brave/iOS Compatibility)');
      console.log('------------------------------------------');

      for (const row of animResult.rows) {
        console.log(`  📱 ${row.component}: ${row.reason} (${row.count}x)`);
      }
    }

    console.log('\n==========================================');
    console.log('         END OF REPORT');
    console.log('==========================================\n');

    // Summary
    const totalErrors = errorsResult.rows.reduce((sum, r) => sum + parseInt(r.count, 10), 0);
    const totalSessions = new Set(errorsResult.rows.flatMap((r) => r.session_ids)).size;

    console.log(`📋 SUMMARY`);
    console.log(`   Total errors: ${totalErrors}`);
    console.log(`   Unique error types: ${errorsResult.rows.length}`);
    console.log(`   Affected sessions: ${totalSessions}`);
    console.log(`   Performance issues: ${perfResult.rows.length}`);
    console.log(`   Animation fallbacks: ${animResult.rows.length}`);

  } finally {
    await client.end();
  }
}

function getEventIcon(eventType: string): string {
  const icons: Record<string, string> = {
    js_error: '💥',
    promise_rejection: '💔',
    console_error: '❌',
    console_warn: '⚠️',
    graphql_error: '🔴',
    network_error: '📶',
    navigation: '🧭',
    interaction: '👆',
    session_start: '🚀',
    session_end: '🏁',
    page_load: '📄',
    slow_page_load: '🐢',
    slow_request: '⏳',
    long_task: '⏱️',
    image_error: '🖼️',
    animation_fallback: '🎬',
    form_submit: '📝',
  };
  return icons[eventType] || '📌';
}

function getSeverity(eventType: string, count: number): 'critical' | 'high' | 'medium' | 'low' {
  if (eventType === 'js_error' && count > 10) return 'critical';
  if (eventType === 'js_error') return 'high';
  if (eventType === 'graphql_error' && count > 5) return 'high';
  if (eventType === 'network_error' && count > 5) return 'high';
  if (eventType === 'promise_rejection') return 'medium';
  if (eventType === 'console_error') return 'medium';
  return 'low';
}

function getSeverityIcon(severity: string): string {
  const icons: Record<string, string> = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🟢',
  };
  return icons[severity] || '⚪';
}

function truncate(str: string, maxLen: number): string {
  if (!str) return '';
  return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
}

// Parse CLI arguments
const args = process.argv.slice(2);
const options: { sessionId?: string; sinceHours?: number; export?: boolean } = {};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--session' && args[i + 1]) {
    options.sessionId = args[++i];
  } else if (args[i] === '--since' && args[i + 1]) {
    options.sinceHours = parseInt(args[++i], 10);
  } else if (args[i] === '--export') {
    options.export = true;
  }
}

analyzeQALogs(options).catch(console.error);
