/**
 * Scorecard Generator
 * Aggregates test results and generates grades and recommendations
 */

import type {
  SuiteResult,
  Scorecard,
  ScoreSummary,
  CategoryScore,
  Grade,
  Recommendation,
  TestCategory,
  Environment,
  TestResult,
} from './types.js';

// ============================================================================
// Grade Calculation
// ============================================================================

/**
 * Calculate grade from pass rate
 */
export function calculateGrade(passRate: number): Grade {
  if (passRate >= 98) return 'A+';
  if (passRate >= 90) return 'A';
  if (passRate >= 80) return 'B';
  if (passRate >= 70) return 'C';
  if (passRate >= 60) return 'D';
  return 'F';
}

/**
 * Get grade color for console output
 */
export function getGradeColor(grade: Grade): string {
  const colors: Record<Grade, string> = {
    'A+': '\x1b[32m', // Green
    A: '\x1b[32m', // Green
    B: '\x1b[33m', // Yellow
    C: '\x1b[33m', // Yellow
    D: '\x1b[31m', // Red
    F: '\x1b[31m', // Red
  };
  return colors[grade];
}

// ============================================================================
// Summary Generation
// ============================================================================

/**
 * Generate summary from suite results
 */
export function generateSummary(results: SuiteResult[]): ScoreSummary {
  let totalTests = 0;
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let totalDuration = 0;

  for (const suite of results) {
    totalTests += suite.results.length;
    passed += suite.passed;
    failed += suite.failed;
    skipped += suite.skipped;
    totalDuration += suite.duration;
  }

  const passRate = totalTests > 0 ? (passed / totalTests) * 100 : 0;
  const avgDuration = totalTests > 0 ? totalDuration / totalTests : 0;

  return {
    totalTests,
    passed,
    failed,
    skipped,
    passRate,
    avgDuration,
  };
}

// ============================================================================
// Category Scoring
// ============================================================================

/**
 * Group results by category and calculate scores
 */
export function generateCategoryScores(results: SuiteResult[]): CategoryScore[] {
  const categoryMap = new Map<TestCategory, SuiteResult[]>();

  // Group by category
  for (const suite of results) {
    const existing = categoryMap.get(suite.category) || [];
    existing.push(suite);
    categoryMap.set(suite.category, existing);
  }

  // Calculate scores per category
  const categoryScores: CategoryScore[] = [];

  for (const [category, suites] of categoryMap) {
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    for (const suite of suites) {
      passed += suite.passed;
      failed += suite.failed;
      skipped += suite.skipped;
    }

    const total = passed + failed + skipped;
    const passRate = total > 0 ? (passed / total) * 100 : 0;

    categoryScores.push({
      category,
      passed,
      failed,
      skipped,
      passRate,
      grade: calculateGrade(passRate),
    });
  }

  // Sort by pass rate (ascending so worst categories are first)
  return categoryScores.sort((a, b) => a.passRate - b.passRate);
}

// ============================================================================
// Recommendation Generation
// ============================================================================

/**
 * Generate recommendations based on test results
 */
export function generateRecommendations(
  results: SuiteResult[],
  categoryScores: CategoryScore[]
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Critical failures
  for (const category of categoryScores) {
    if (category.grade === 'F') {
      const affectedSuites = results.filter((r) => r.category === category.category);
      const failedTests = affectedSuites.flatMap((s) =>
        s.results.filter((r) => r.status === 'failed').map((r) => r.stepName)
      );

      recommendations.push({
        category: category.category,
        severity: 'critical',
        message: `Critical failure in ${category.category}: ${category.failed} tests failed`,
        suggestion: `Immediate attention required. Review the ${category.category} module for breaking changes or configuration issues.`,
        affectedTests: failedTests.slice(0, 5),
      });
    }
  }

  // Warning-level issues
  for (const category of categoryScores) {
    if (category.grade === 'D' || category.grade === 'C') {
      recommendations.push({
        category: category.category,
        severity: 'warning',
        message: `${category.category} tests show degraded performance (${category.passRate.toFixed(1)}% pass rate)`,
        suggestion: `Consider reviewing recent changes to the ${category.category} module and adding more test coverage.`,
      });
    }
  }

  // Info-level observations
  const slowTests = results.flatMap((suite) =>
    suite.results.filter((r) => r.duration > 5000).map((r) => ({
      name: r.stepName,
      duration: r.duration,
      category: suite.category,
    }))
  );

  if (slowTests.length > 0) {
    recommendations.push({
      category: 'core' as TestCategory,
      severity: 'info',
      message: `${slowTests.length} tests exceeded 5 second threshold`,
      suggestion: 'Consider optimizing slow operations or increasing timeout values where appropriate.',
      affectedTests: slowTests.slice(0, 5).map((t) => `${t.name} (${t.duration}ms)`),
    });
  }

  // Skipped tests warning
  const totalSkipped = categoryScores.reduce((sum, c) => sum + c.skipped, 0);
  if (totalSkipped > 0) {
    recommendations.push({
      category: 'core' as TestCategory,
      severity: 'info',
      message: `${totalSkipped} tests were skipped`,
      suggestion: 'Review skipped tests to ensure they are intentionally disabled and not masking issues.',
    });
  }

  return recommendations;
}

// ============================================================================
// Scorecard Generation
// ============================================================================

/**
 * Generate complete scorecard from test results
 */
export function generateScorecard(
  runId: string,
  environment: Environment,
  persona: string,
  results: SuiteResult[],
  startTime: Date
): Scorecard {
  const summary = generateSummary(results);
  const categoryScores = generateCategoryScores(results);
  const recommendations = generateRecommendations(results, categoryScores);
  const grade = calculateGrade(summary.passRate);
  const duration = Date.now() - startTime.getTime();

  return {
    runId,
    timestamp: new Date(),
    environment,
    persona,
    duration,
    summary,
    categories: categoryScores,
    recommendations,
    grade,
  };
}

// ============================================================================
// Console Output
// ============================================================================

/**
 * Print scorecard to console
 */
export function printScorecard(scorecard: Scorecard): void {
  const reset = '\x1b[0m';
  const bold = '\x1b[1m';
  const dim = '\x1b[2m';
  const green = '\x1b[32m';
  const red = '\x1b[31m';
  const yellow = '\x1b[33m';
  const cyan = '\x1b[36m';

  console.log('\n');
  console.log(`${bold}${'='.repeat(60)}${reset}`);
  console.log(`${bold}                    TEST SCORECARD${reset}`);
  console.log(`${'='.repeat(60)}`);

  // Header info
  console.log(`${dim}Run ID:${reset}      ${scorecard.runId}`);
  console.log(`${dim}Environment:${reset} ${scorecard.environment}`);
  console.log(`${dim}Persona:${reset}     ${scorecard.persona}`);
  console.log(`${dim}Duration:${reset}    ${(scorecard.duration / 1000).toFixed(2)}s`);
  console.log(`${dim}Timestamp:${reset}   ${scorecard.timestamp.toISOString()}`);

  // Overall grade
  const gradeColor = getGradeColor(scorecard.grade);
  console.log('\n');
  console.log(`${bold}OVERALL GRADE: ${gradeColor}${scorecard.grade}${reset}`);

  // Summary
  console.log(`\n${bold}Summary${reset}`);
  console.log(`${'-'.repeat(40)}`);
  console.log(`Total Tests:  ${scorecard.summary.totalTests}`);
  console.log(`${green}Passed:${reset}       ${scorecard.summary.passed}`);
  console.log(`${red}Failed:${reset}       ${scorecard.summary.failed}`);
  console.log(`${yellow}Skipped:${reset}      ${scorecard.summary.skipped}`);
  console.log(`Pass Rate:    ${scorecard.summary.passRate.toFixed(1)}%`);
  console.log(`Avg Duration: ${scorecard.summary.avgDuration.toFixed(0)}ms`);

  // Category breakdown
  console.log(`\n${bold}Category Breakdown${reset}`);
  console.log(`${'-'.repeat(60)}`);
  console.log(
    `${'Category'.padEnd(20)} ${'Grade'.padEnd(6)} ${'Pass Rate'.padEnd(10)} ${'P/F/S'}`
  );
  console.log(`${'-'.repeat(60)}`);

  for (const cat of scorecard.categories) {
    const catGradeColor = getGradeColor(cat.grade);
    const passRate = `${cat.passRate.toFixed(1)}%`.padEnd(10);
    const stats = `${cat.passed}/${cat.failed}/${cat.skipped}`;
    console.log(
      `${cat.category.padEnd(20)} ${catGradeColor}${cat.grade.padEnd(6)}${reset} ${passRate} ${stats}`
    );
  }

  // Recommendations
  if (scorecard.recommendations.length > 0) {
    console.log(`\n${bold}Recommendations${reset}`);
    console.log(`${'-'.repeat(60)}`);

    for (const rec of scorecard.recommendations) {
      const severityColor =
        rec.severity === 'critical' ? red : rec.severity === 'warning' ? yellow : cyan;
      const icon =
        rec.severity === 'critical' ? '!!' : rec.severity === 'warning' ? '!' : 'i';

      console.log(`\n${severityColor}[${icon}] ${rec.message}${reset}`);
      console.log(`   ${dim}${rec.suggestion}${reset}`);

      if (rec.affectedTests && rec.affectedTests.length > 0) {
        console.log(`   ${dim}Affected tests:${reset}`);
        for (const test of rec.affectedTests) {
          console.log(`     - ${test}`);
        }
      }
    }
  }

  console.log(`\n${'='.repeat(60)}\n`);
}

// ============================================================================
// JSON Output
// ============================================================================

/**
 * Export scorecard as JSON
 */
export function scorecardToJson(scorecard: Scorecard): string {
  return JSON.stringify(scorecard, null, 2);
}

/**
 * Export scorecard as JUnit XML
 */
export function scorecardToJUnit(scorecard: Scorecard): string {
  const escapeXml = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<testsuites name="MuscleMap Test Harness" tests="${scorecard.summary.totalTests}" `;
  xml += `failures="${scorecard.summary.failed}" skipped="${scorecard.summary.skipped}" `;
  xml += `time="${(scorecard.duration / 1000).toFixed(3)}">\n`;

  for (const cat of scorecard.categories) {
    xml += `  <testsuite name="${escapeXml(cat.category)}" `;
    xml += `tests="${cat.passed + cat.failed + cat.skipped}" `;
    xml += `failures="${cat.failed}" skipped="${cat.skipped}">\n`;
    // Note: Individual test cases would go here if we had access to them
    xml += `  </testsuite>\n`;
  }

  xml += `</testsuites>`;
  return xml;
}

// ============================================================================
// HTML Report
// ============================================================================

/**
 * Generate HTML report
 */
export function scorecardToHtml(scorecard: Scorecard): string {
  const gradeColor: Record<Grade, string> = {
    'A+': '#22c55e',
    A: '#22c55e',
    B: '#eab308',
    C: '#f97316',
    D: '#ef4444',
    F: '#dc2626',
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MuscleMap Test Report - ${scorecard.timestamp.toISOString()}</title>
  <style>
    :root {
      --bg: #0a0a0a;
      --card: #18181b;
      --border: #27272a;
      --text: #fafafa;
      --muted: #a1a1aa;
      --primary: #0066ff;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 2rem;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    h2 { font-size: 1.25rem; margin: 2rem 0 1rem; color: var(--muted); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
    .grade {
      font-size: 4rem;
      font-weight: bold;
      color: ${gradeColor[scorecard.grade]};
    }
    .meta { font-size: 0.875rem; color: var(--muted); }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem;
    }
    .card-value { font-size: 2rem; font-weight: bold; }
    .card-label { font-size: 0.875rem; color: var(--muted); }
    .passed { color: #22c55e; }
    .failed { color: #ef4444; }
    .skipped { color: #eab308; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid var(--border); }
    th { color: var(--muted); font-weight: 500; }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .rec { background: var(--card); border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
    .rec-critical { border-left: 4px solid #ef4444; }
    .rec-warning { border-left: 4px solid #eab308; }
    .rec-info { border-left: 4px solid #3b82f6; }
    .rec-title { font-weight: 600; margin-bottom: 0.5rem; }
    .rec-suggestion { color: var(--muted); font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>MuscleMap Test Report</h1>
        <div class="meta">
          <p>Run ID: ${scorecard.runId}</p>
          <p>Environment: ${scorecard.environment}</p>
          <p>Persona: ${scorecard.persona}</p>
          <p>Timestamp: ${scorecard.timestamp.toISOString()}</p>
        </div>
      </div>
      <div class="grade">${scorecard.grade}</div>
    </div>

    <h2>Summary</h2>
    <div class="cards">
      <div class="card">
        <div class="card-value">${scorecard.summary.totalTests}</div>
        <div class="card-label">Total Tests</div>
      </div>
      <div class="card">
        <div class="card-value passed">${scorecard.summary.passed}</div>
        <div class="card-label">Passed</div>
      </div>
      <div class="card">
        <div class="card-value failed">${scorecard.summary.failed}</div>
        <div class="card-label">Failed</div>
      </div>
      <div class="card">
        <div class="card-value skipped">${scorecard.summary.skipped}</div>
        <div class="card-label">Skipped</div>
      </div>
      <div class="card">
        <div class="card-value">${scorecard.summary.passRate.toFixed(1)}%</div>
        <div class="card-label">Pass Rate</div>
      </div>
      <div class="card">
        <div class="card-value">${(scorecard.duration / 1000).toFixed(2)}s</div>
        <div class="card-label">Duration</div>
      </div>
    </div>

    <h2>Category Breakdown</h2>
    <table>
      <thead>
        <tr>
          <th>Category</th>
          <th>Grade</th>
          <th>Pass Rate</th>
          <th>Passed</th>
          <th>Failed</th>
          <th>Skipped</th>
        </tr>
      </thead>
      <tbody>
        ${scorecard.categories
          .map(
            (cat) => `
        <tr>
          <td>${cat.category}</td>
          <td><span class="badge" style="background: ${gradeColor[cat.grade]}20; color: ${gradeColor[cat.grade]}">${cat.grade}</span></td>
          <td>${cat.passRate.toFixed(1)}%</td>
          <td class="passed">${cat.passed}</td>
          <td class="failed">${cat.failed}</td>
          <td class="skipped">${cat.skipped}</td>
        </tr>`
          )
          .join('')}
      </tbody>
    </table>

    ${
      scorecard.recommendations.length > 0
        ? `
    <h2>Recommendations</h2>
    ${scorecard.recommendations
      .map(
        (rec) => `
    <div class="rec rec-${rec.severity}">
      <div class="rec-title">${rec.message}</div>
      <div class="rec-suggestion">${rec.suggestion}</div>
      ${
        rec.affectedTests
          ? `
      <ul style="margin-top: 0.5rem; padding-left: 1.5rem; color: var(--muted); font-size: 0.875rem;">
        ${rec.affectedTests.map((t) => `<li>${t}</li>`).join('')}
      </ul>`
          : ''
      }
    </div>`
      )
      .join('')}`
        : ''
    }
  </div>
</body>
</html>`;
}

// ============================================================================
// Statistics Helpers
// ============================================================================

/**
 * Calculate test statistics
 */
export function calculateStats(results: TestResult[]): {
  min: number;
  max: number;
  avg: number;
  median: number;
  p95: number;
} {
  if (results.length === 0) {
    return { min: 0, max: 0, avg: 0, median: 0, p95: 0 };
  }

  const durations = results.map((r) => r.duration).sort((a, b) => a - b);
  const sum = durations.reduce((a, b) => a + b, 0);

  return {
    min: durations[0],
    max: durations[durations.length - 1],
    avg: sum / durations.length,
    median: durations[Math.floor(durations.length / 2)],
    p95: durations[Math.floor(durations.length * 0.95)],
  };
}

/**
 * Compare two scorecards
 */
export function compareScoreCards(
  current: Scorecard,
  previous: Scorecard
): {
  passRateDelta: number;
  durationDelta: number;
  gradeDelta: number;
  improved: string[];
  degraded: string[];
} {
  const gradeValues: Record<Grade, number> = {
    'A+': 6,
    A: 5,
    B: 4,
    C: 3,
    D: 2,
    F: 1,
  };

  const improved: string[] = [];
  const degraded: string[] = [];

  const currentCats = new Map(current.categories.map((c) => [c.category, c]));
  const previousCats = new Map(previous.categories.map((c) => [c.category, c]));

  for (const [cat, curr] of currentCats) {
    const prev = previousCats.get(cat);
    if (prev) {
      if (gradeValues[curr.grade] > gradeValues[prev.grade]) {
        improved.push(`${cat}: ${prev.grade} -> ${curr.grade}`);
      } else if (gradeValues[curr.grade] < gradeValues[prev.grade]) {
        degraded.push(`${cat}: ${prev.grade} -> ${curr.grade}`);
      }
    }
  }

  return {
    passRateDelta: current.summary.passRate - previous.summary.passRate,
    durationDelta: current.duration - previous.duration,
    gradeDelta: gradeValues[current.grade] - gradeValues[previous.grade],
    improved,
    degraded,
  };
}
