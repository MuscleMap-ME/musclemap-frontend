/**
 * Route Conflict Detection Script
 *
 * This script analyzes the route definitions in the API codebase to detect
 * duplicate routes BEFORE the server starts, preventing startup crashes.
 *
 * Run with: npx tsx scripts/check-routes.ts
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

interface RouteInfo {
  method: string;
  path: string;
  file: string;
  line: number;
}

const ROUTES_DIR = join(__dirname, '..', 'src', 'http', 'routes');

function findRouteDefinitions(dir: string): RouteInfo[] {
  const routes: RouteInfo[] = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      routes.push(...findRouteDefinitions(fullPath));
    } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
      const content = readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        // Match patterns like:
        // app.get('/path', ...
        // app.post('/path', ...
        // fastify.get('/path', ...
        const match = line.match(
          /(?:app|fastify|api|router)\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/i
        );

        if (match) {
          routes.push({
            method: match[1].toUpperCase(),
            path: match[2],
            file: relative(process.cwd(), fullPath),
            line: idx + 1,
          });
        }
      });
    }
  }

  return routes;
}

function normalizePath(path: string): string {
  // Normalize dynamic segments (:id, :userId, etc.) to a common pattern
  return path.replace(/:[^/]+/g, ':param');
}

function checkForDuplicates(routes: RouteInfo[]): { hasDuplicates: boolean; duplicates: Map<string, RouteInfo[]> } {
  const routeMap = new Map<string, RouteInfo[]>();
  let hasDuplicates = false;

  for (const route of routes) {
    const key = `${route.method}:${normalizePath(route.path)}`;
    const existing = routeMap.get(key) || [];
    existing.push(route);
    routeMap.set(key, existing);

    if (existing.length > 1) {
      hasDuplicates = true;
    }
  }

  const duplicates = new Map<string, RouteInfo[]>();
  for (const [key, routeList] of routeMap) {
    if (routeList.length > 1) {
      duplicates.set(key, routeList);
    }
  }

  return { hasDuplicates, duplicates };
}

function main() {
  console.log('🔍 Scanning for route definitions...\n');

  const routes = findRouteDefinitions(ROUTES_DIR);
  console.log(`Found ${routes.length} route definitions.\n`);

  const { hasDuplicates, duplicates } = checkForDuplicates(routes);

  if (hasDuplicates) {
    console.error('❌ DUPLICATE ROUTES DETECTED!\n');
    console.error('The following routes are defined multiple times:\n');

    for (const [key, routeList] of duplicates) {
      const [method, path] = key.split(':');
      console.error(`  ${method} ${path}:`);
      for (const r of routeList) {
        console.error(`    - ${r.file}:${r.line} (${r.path})`);
      }
      console.error('');
    }

    console.error('Fix these duplicates before starting the server.\n');
    console.error('Tip: Choose one canonical location for each route and remove/comment the others.\n');
    process.exit(1);
  }

  console.log('✅ No duplicate routes found!\n');
  console.log('All routes are unique. Server can start safely.');
  process.exit(0);
}

main();
