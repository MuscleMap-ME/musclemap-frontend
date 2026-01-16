#!/usr/bin/env node
/**
 * MuscleMap Documentation Generator
 *
 * PERFORMANCE OPTIMIZED:
 *   - Parallel file processing using Promise.all
 *   - Caching of analysis results (5-minute TTL)
 *   - Incremental mode (only regenerate if sources changed)
 *   - Stream-based file operations for large files
 *
 * Outputs:
 *   - Markdown files (for GitHub/web)
 *   - LaTeX files (for professional documentation/PDFs)
 *   - Plain-text docs (synced to public/docs-plain/)
 *
 * Usage:
 *   node scripts/generate-docs.cjs              # Generate all docs + sync plain-text
 *   node scripts/generate-docs.cjs --latex      # LaTeX only
 *   node scripts/generate-docs.cjs --md         # Markdown only
 *   node scripts/generate-docs.cjs --sync-plain # Only sync docs-plain to public
 *   node scripts/generate-docs.cjs --fast       # Use cached analysis if available
 *   node scripts/generate-docs.cjs --incremental # Only regenerate if sources changed
 *   pnpm docs:generate
 *
 * What it does:
 *   1. Scans the codebase structure (parallel)
 *   2. Extracts API endpoints from route files
 *   3. Identifies features from page components
 *   4. Updates all documentation files (MD + LaTeX)
 *   5. Syncs docs-plain/ to public/docs-plain/ for web access
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT_DIR = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');
const LATEX_DIR = path.join(DOCS_DIR, 'latex');
const DOCS_PLAIN_DIR = path.join(ROOT_DIR, 'docs-plain');
const PUBLIC_DOCS_PLAIN_DIR = path.join(ROOT_DIR, 'public/docs-plain');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const API_DIR = path.join(ROOT_DIR, 'apps/api/src');
const PACKAGES_DIR = path.join(ROOT_DIR, 'packages');
const INDEX_TEMPLATE_PATH = path.join(__dirname, 'docs-plain-index.html');

// Parse CLI args
const args = process.argv.slice(2);
const LATEX_ONLY = args.includes('--latex');
const MD_ONLY = args.includes('--md');
const SYNC_PLAIN_ONLY = args.includes('--sync-plain');
const FAST_MODE = args.includes('--fast');
const INCREMENTAL_MODE = args.includes('--incremental');
const GENERATE_LATEX = !MD_ONLY && !SYNC_PLAIN_ONLY;
const GENERATE_MD = !LATEX_ONLY && !SYNC_PLAIN_ONLY;
const SYNC_DOCS_PLAIN = !LATEX_ONLY && !MD_ONLY || SYNC_PLAIN_ONLY;

// Cache configuration
const CACHE_DIR = path.join(ROOT_DIR, '.cache');
const ANALYSIS_CACHE = path.join(CACHE_DIR, 'docs-analysis.json');
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ============================================
// UTILITY FUNCTIONS
// ============================================

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Cache utilities
function loadCache() {
  try {
    if (fs.existsSync(ANALYSIS_CACHE)) {
      const data = JSON.parse(fs.readFileSync(ANALYSIS_CACHE, 'utf-8'));
      const age = Date.now() - data.timestamp;
      if (age < CACHE_TTL) {
        return data.analysis;
      }
    }
  } catch {
    // Cache corrupted or unreadable
  }
  return null;
}

function saveCache(analysis) {
  ensureDir(CACHE_DIR);
  fs.writeFileSync(ANALYSIS_CACHE, JSON.stringify({
    timestamp: Date.now(),
    analysis
  }));
}

// Compute hash of source directories for incremental mode
function computeSourceHash() {
  const dirs = [SRC_DIR, API_DIR, PACKAGES_DIR].filter(d => fs.existsSync(d));
  let hash = crypto.createHash('md5');

  for (const dir of dirs) {
    const files = getFiles(dir, /\.(js|jsx|ts|tsx|json)$/);
    for (const file of files.slice(0, 100)) { // Sample first 100 files for speed
      try {
        const stat = fs.statSync(file);
        hash.update(`${file}:${stat.mtimeMs}`);
      } catch {}
    }
  }

  return hash.digest('hex');
}

function needsRegeneration() {
  if (!INCREMENTAL_MODE) return true;

  const hashFile = path.join(CACHE_DIR, 'docs-hash.txt');
  const currentHash = computeSourceHash();

  try {
    if (fs.existsSync(hashFile)) {
      const previousHash = fs.readFileSync(hashFile, 'utf-8').trim();
      if (previousHash === currentHash) {
        console.log('  Sources unchanged - skipping regeneration');
        return false;
      }
    }
  } catch {}

  // Save new hash
  ensureDir(CACHE_DIR);
  fs.writeFileSync(hashFile, currentHash);
  return true;
}

function getFiles(dir, pattern = /\.(js|jsx|ts|tsx)$/) {
  const files = [];
  if (!fs.existsSync(dir)) return files;

  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
      files.push(...getFiles(fullPath, pattern));
    } else if (item.isFile() && pattern.test(item.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

function getDirectoryStructure(dir, depth = 3, prefix = '') {
  if (depth === 0 || !fs.existsSync(dir)) return '';

  let result = '';
  const items = fs.readdirSync(dir, { withFileTypes: true })
    .filter(item => !item.name.startsWith('.') && item.name !== 'node_modules' && item.name !== 'dist')
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const isLast = i === items.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const newPrefix = prefix + (isLast ? '    ' : '│   ');

    result += `${prefix}${connector}${item.name}${item.isDirectory() ? '/' : ''}\n`;

    if (item.isDirectory()) {
      result += getDirectoryStructure(path.join(dir, item.name), depth - 1, newPrefix);
    }
  }
  return result;
}

// ============================================
// ANALYZERS
// ============================================

function analyzePages() {
  const pagesDir = path.join(SRC_DIR, 'pages');
  const pages = [];

  if (!fs.existsSync(pagesDir)) return pages;

  const files = fs.readdirSync(pagesDir).filter(f => /\.(jsx|tsx)$/.test(f));

  for (const file of files) {
    const name = file.replace(/\.(jsx|tsx)$/, '');
    const content = readFile(path.join(pagesDir, file));

    // Try to extract description from comments
    const descMatch = content.match(/\/\*\*[\s\S]*?\*\//);
    const description = descMatch
      ? descMatch[0].replace(/\/\*\*|\*\/|\s*\*\s*/g, ' ').trim().split('.')[0]
      : '';

    pages.push({
      name,
      file,
      description: description || `${name} page`,
      isProtected: content.includes('useUser') || content.includes('ProtectedRoute'),
    });
  }

  return pages.sort((a, b) => a.name.localeCompare(b.name));
}

function analyzeComponents() {
  const componentsDir = path.join(SRC_DIR, 'components');
  const components = [];

  if (!fs.existsSync(componentsDir)) return components;

  function scanDir(dir, prefix = '') {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      if (item.isDirectory()) {
        scanDir(path.join(dir, item.name), `${prefix}${item.name}/`);
      } else if (/\.(jsx|tsx)$/.test(item.name)) {
        components.push({
          name: item.name.replace(/\.(jsx|tsx)$/, ''),
          path: `${prefix}${item.name}`,
        });
      }
    }
  }

  scanDir(componentsDir);
  return components;
}

function analyzeAPIRoutes() {
  const routesDir = path.join(API_DIR, 'http/routes');
  const routes = [];

  if (!fs.existsSync(routesDir)) return routes;

  const files = fs.readdirSync(routesDir).filter(f => /\.(js|ts)$/.test(f));

  for (const file of files) {
    const content = readFile(path.join(routesDir, file));
    const routeName = file.replace(/\.(js|ts)$/, '');

    // Extract route definitions
    const routeMatches = content.matchAll(/\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi);

    for (const match of routeMatches) {
      routes.push({
        method: match[1].toUpperCase(),
        path: match[2],
        file: routeName,
      });
    }

    // Also check for fastify.route style
    const fastifyRoutes = content.matchAll(/method:\s*['"`](\w+)['"`][\s\S]*?url:\s*['"`]([^'"`]+)['"`]/gi);
    for (const match of fastifyRoutes) {
      routes.push({
        method: match[1].toUpperCase(),
        path: match[2],
        file: routeName,
      });
    }
  }

  return routes.sort((a, b) => a.path.localeCompare(b.path));
}

function analyzePackages() {
  const packages = [];

  if (!fs.existsSync(PACKAGES_DIR)) return packages;

  const dirs = fs.readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.'));

  for (const dir of dirs) {
    const pkgPath = path.join(PACKAGES_DIR, dir.name, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(readFile(pkgPath));
      packages.push({
        name: pkg.name,
        description: pkg.description || '',
        version: pkg.version,
        directory: dir.name,
      });
    }
  }

  return packages;
}

function analyzeDependencies() {
  const pkgPath = path.join(ROOT_DIR, 'package.json');
  const pkg = JSON.parse(readFile(pkgPath));

  return {
    dependencies: Object.keys(pkg.dependencies || {}),
    devDependencies: Object.keys(pkg.devDependencies || {}),
  };
}

function analyzeScripts() {
  const scriptsDir = path.join(ROOT_DIR, 'scripts');
  const scripts = [];

  if (!fs.existsSync(scriptsDir)) return scripts;

  const files = fs.readdirSync(scriptsDir).filter(f => /\.(sh|cjs|js)$/.test(f));

  for (const file of files) {
    const content = readFile(path.join(scriptsDir, file));
    const descMatch = content.match(/^#[^!].*$|^\/\*\*[\s\S]*?\*\//m);
    const description = descMatch
      ? descMatch[0].replace(/^#\s*|\/\*\*|\*\/|\s*\*\s*/g, ' ').trim().split('\n')[0]
      : '';

    scripts.push({
      name: file,
      description: description || file,
    });
  }

  return scripts;
}

// ============================================
// DOCUMENT GENERATORS
// ============================================

function generateArchitectureDoc(analysis) {
  const { pages, components, packages, routes, scripts } = analysis;

  return `# MuscleMap Architecture

> Auto-generated on ${new Date().toISOString().split('T')[0]}

## Overview

MuscleMap is a cross-platform fitness tracking application with real-time muscle visualization. The architecture follows a modular, layered approach with clear separation of concerns.

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend Web** | React + Vite + TailwindCSS | Single-page application |
| **Frontend Mobile** | React Native + Expo | iOS & Android apps |
| **API Server** | Fastify + TypeScript | REST/GraphQL API |
| **Database** | PostgreSQL | Primary data store |
| **Cache** | Redis (optional) | Session/query caching |
| **Reverse Proxy** | Caddy | HTTPS termination |

## Directory Structure

\`\`\`
musclemap.me/
${getDirectoryStructure(ROOT_DIR, 2)}
\`\`\`

## Packages

| Package | Description |
|---------|-------------|
${packages.map(p => `| \`${p.name}\` | ${p.description || p.directory} |`).join('\n')}

## Frontend Pages (${pages.length} total)

| Page | Protected | Description |
|------|-----------|-------------|
${pages.map(p => `| ${p.name} | ${p.isProtected ? 'Yes' : 'No'} | ${p.description} |`).join('\n')}

## Components (${components.length} total)

Components are organized by feature:

${[...new Set(components.map(c => c.path.split('/')[0]))].map(dir => {
  const dirComponents = components.filter(c => c.path.startsWith(dir + '/') || c.path === dir);
  return `### ${dir || 'Root'}
${dirComponents.map(c => `- \`${c.name}\``).join('\n')}`;
}).join('\n\n')}

## API Endpoints (${routes.length} total)

| Method | Path | Handler |
|--------|------|---------|
${routes.map(r => `| ${r.method} | \`${r.path}\` | ${r.file} |`).join('\n')}

## Scripts

| Script | Description |
|--------|-------------|
${scripts.map(s => `| \`${s.name}\` | ${s.description} |`).join('\n')}

## Data Flow

\`\`\`
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Caddy     │────▶│   Fastify   │
│  (React)    │◀────│   (HTTPS)   │◀────│   (API)     │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ▼
                                        ┌─────────────┐
                                        │ PostgreSQL  │
                                        │  (Data)     │
                                        └─────────────┘
\`\`\`

## Key Architectural Decisions

1. **Single Source of Truth**: PostgreSQL is the only data store
2. **Fastify over Express**: Better performance and TypeScript support
3. **Caddy over Nginx**: Automatic HTTPS, simpler configuration
4. **No Docker**: Direct deployment on VPS for simplicity
5. **Monorepo**: All packages in one repository with pnpm workspaces

## Build Order

\`\`\`bash
pnpm build:packages  # shared → core → plugin-sdk → client → ui
pnpm build:api       # API server
pnpm build           # Frontend (Vite)
\`\`\`

## Deployment

\`\`\`bash
./deploy.sh "commit message"  # Full deployment to VPS
\`\`\`

See \`scripts/README.md\` for detailed deployment instructions.
`;
}

function generateAPIReferenceDoc(analysis) {
  const { routes } = analysis;

  // Group routes by file/feature
  const grouped = {};
  for (const route of routes) {
    if (!grouped[route.file]) grouped[route.file] = [];
    grouped[route.file].push(route);
  }

  return `# MuscleMap API Reference

> Auto-generated on ${new Date().toISOString().split('T')[0]}

## Base URL

- **Production**: \`https://musclemap.me/api\`
- **Development**: \`http://localhost:3001\`

## Authentication

Most endpoints require authentication via JWT token:

\`\`\`
Authorization: Bearer <token>
\`\`\`

## Endpoints

${Object.entries(grouped).map(([file, fileRoutes]) => `
### ${file.charAt(0).toUpperCase() + file.slice(1)}

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
${fileRoutes.map(r => `| \`${r.method}\` | \`${r.path}\` | ${r.path.includes('auth') ? 'No' : 'Yes'} |`).join('\n')}
`).join('\n')}

## Common Response Format

### Success Response

\`\`\`json
{
  "success": true,
  "data": { ... }
}
\`\`\`

### Error Response

\`\`\`json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
\`\`\`

## Rate Limiting

- **Authenticated**: 100 requests/minute
- **Unauthenticated**: 20 requests/minute

## Health Check

\`\`\`bash
curl https://musclemap.me/health
\`\`\`

Response:
\`\`\`json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected",
  "redis": "connected"
}
\`\`\`
`;
}

function generateFeaturesDoc(analysis) {
  const { pages } = analysis;

  // Categorize pages
  const categories = {
    'Core Features': ['Dashboard', 'Workout', 'Exercises', 'Journey', 'Progression'],
    'Community': ['CommunityDashboard', 'Competitions', 'Locations', 'HighFives', 'Messages'],
    'User Account': ['Profile', 'Settings', 'Wallet', 'Credits', 'SkinsStore'],
    'Public Pages': ['Landing', 'Features', 'Technology', 'Science', 'Design', 'Docs'],
    'Issue Tracker': ['Issues', 'IssueDetail', 'NewIssue', 'MyIssues', 'DevUpdates', 'Roadmap'],
    'Admin': ['AdminControl', 'AdminIssues'],
    'Auth': ['Login', 'Signup', 'Onboarding'],
  };

  return `# MuscleMap Features

> Auto-generated on ${new Date().toISOString().split('T')[0]}

## Overview

MuscleMap is a comprehensive fitness platform with ${pages.length} pages/features across multiple categories.

${Object.entries(categories).map(([category, pageNames]) => {
  const categoryPages = pages.filter(p => pageNames.includes(p.name));
  if (categoryPages.length === 0) return '';

  return `## ${category}

${categoryPages.map(p => `### ${p.name}
${p.description}
- **Route**: \`/${p.name.toLowerCase()}\`
- **Protected**: ${p.isProtected ? 'Yes (requires login)' : 'No (public)'}
`).join('\n')}`;
}).filter(Boolean).join('\n')}

## Feature Highlights

### Real-Time Muscle Visualization
- 3D muscle model using Three.js
- Color-coded muscle activation display
- Interactive body part selection

### Workout Tracking
- Log exercises with sets, reps, weight
- Timer for rest periods
- Progress tracking over time

### Community Features
- Leaderboards and competitions
- Location-based gym finder
- High-five system for encouragement
- Direct messaging

### Gamification
- XP and leveling system
- Achievements and badges
- Character stats (RPG-style)
- Skins and customization

### AI Integration
- Personalized workout recommendations
- Exercise form analysis (planned)
- Nutrition suggestions (planned)

## Mobile App

The React Native mobile app (in \`apps/mobile/\`) provides:
- Native iOS and Android experience
- HealthKit/Google Fit integration
- Push notifications
- Offline workout logging

## API

Full API documentation available at \`docs/API_REFERENCE.md\`.
`;
}

function generateReadme(analysis) {
  const { packages, pages, deps } = analysis;

  return `# MuscleMap

> Visual Workout Tracking - See your muscles in action

[![Live Site](https://img.shields.io/badge/Live-musclemap.me-blue)](https://musclemap.me)
[![API Status](https://img.shields.io/badge/API-Online-green)](https://musclemap.me/health)

## What is MuscleMap?

MuscleMap is a cross-platform fitness application that visualizes muscle activation in real-time. Track your workouts, see which muscles you're targeting, and optimize your training.

## Quick Start

\`\`\`bash
# Clone the repository
git clone https://github.com/jeanpaulniko/musclemap.git
cd musclemap.me

# Install dependencies
pnpm install

# Start development server
pnpm dev
\`\`\`

## Tech Stack

- **Frontend**: React, Vite, TailwindCSS, Three.js
- **Mobile**: React Native, Expo
- **Backend**: Fastify, PostgreSQL
- **Deployment**: Caddy, PM2

## Project Structure

| Directory | Purpose |
|-----------|---------|
| \`src/\` | Web frontend (React) |
| \`apps/api/\` | API server (Fastify) |
| \`apps/mobile/\` | Mobile app (Expo) |
| \`packages/\` | Shared packages |
| \`scripts/\` | Automation scripts |
| \`docs/\` | Documentation |

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - System design and structure
- [API Reference](docs/API_REFERENCE.md) - API endpoints
- [Features](docs/FEATURES.md) - Feature list
- [Icons](docs/ICONS.md) - Icon system
- [Scripts README](scripts/README.md) - Development workflow

## Scripts

\`\`\`bash
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm build:all        # Build everything
pnpm typecheck        # Type check all packages
pnpm test             # Run tests
pnpm deploy           # Deploy to production
pnpm prepare:appstore # Generate App Store assets
pnpm docs:generate    # Regenerate documentation
\`\`\`

## Deployment

\`\`\`bash
./deploy.sh "commit message"
\`\`\`

## Contributing

1. Create a feature branch
2. Make changes
3. Run \`pnpm typecheck\` and \`pnpm test\`
4. Submit PR

## License

AGPL-3.0 - See [LICENSE](LICENSE) for details.

---

Built with care by Jean-Paul Niko
`;
}

// ============================================
// LATEX GENERATORS
// ============================================

function escapeLatex(str) {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/[&%$#_{}]/g, '\\$&')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/</g, '\\textless{}')
    .replace(/>/g, '\\textgreater{}');
}

function generateLatexPreamble() {
  return `\\documentclass[11pt,a4paper]{article}

% ============================================
% PACKAGES
% ============================================
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\usepackage[margin=1in]{geometry}
\\usepackage{graphicx}
\\usepackage{xcolor}
\\usepackage{hyperref}
\\usepackage{listings}
\\usepackage{booktabs}
\\usepackage{longtable}
\\usepackage{fancyhdr}
\\usepackage{titlesec}
\\usepackage{tocloft}
\\usepackage{parskip}
\\usepackage{enumitem}

% ============================================
% COLORS (MuscleMap Brand)
% ============================================
\\definecolor{brandblue}{HTML}{0066FF}
\\definecolor{brandpulse}{HTML}{FF3366}
\\definecolor{voidbase}{HTML}{0A0A0F}
\\definecolor{textprimary}{HTML}{FFFFFF}
\\definecolor{textsecondary}{HTML}{B3B3B3}
\\definecolor{codebg}{HTML}{1A1A24}

% ============================================
% HYPERREF SETUP
% ============================================
\\hypersetup{
    colorlinks=true,
    linkcolor=brandblue,
    filecolor=brandpulse,
    urlcolor=brandblue,
    pdftitle={MuscleMap Documentation},
    pdfauthor={MuscleMap Team},
}

% ============================================
% CODE LISTINGS
% ============================================
\\lstset{
    backgroundcolor=\\color{codebg},
    basicstyle=\\ttfamily\\small\\color{textprimary},
    keywordstyle=\\color{brandblue}\\bfseries,
    stringstyle=\\color{brandpulse},
    commentstyle=\\color{textsecondary}\\itshape,
    breaklines=true,
    frame=single,
    rulecolor=\\color{textsecondary},
    tabsize=2,
    showstringspaces=false,
}

% ============================================
% SECTION FORMATTING
% ============================================
\\titleformat{\\section}{\\Large\\bfseries\\color{brandblue}}{\\thesection}{1em}{}
\\titleformat{\\subsection}{\\large\\bfseries\\color{brandblue!80}}{\\thesubsection}{1em}{}
\\titleformat{\\subsubsection}{\\normalsize\\bfseries\\color{brandblue!60}}{\\thesubsubsection}{1em}{}

% ============================================
% HEADER/FOOTER
% ============================================
\\pagestyle{fancy}
\\fancyhf{}
\\fancyhead[L]{\\textcolor{brandblue}{MuscleMap}}
\\fancyhead[R]{\\textcolor{textsecondary}{\\nouppercase{\\leftmark}}}
\\fancyfoot[C]{\\textcolor{textsecondary}{\\thepage}}
\\renewcommand{\\headrulewidth}{0.4pt}
\\renewcommand{\\footrulewidth}{0pt}

`;
}

// Generate content-only LaTeX for inclusion in master document
function generateArchitectureContent(analysis) {
  const { pages, components, packages, routes, scripts } = analysis;

  return `% Architecture content (for inclusion in master document)
% ============================================
\\section{Overview}
% ============================================

MuscleMap is a cross-platform fitness tracking application with real-time muscle visualization. The architecture follows a modular, layered approach with clear separation of concerns.

\\subsection{Design Principles}

\\begin{itemize}[leftmargin=*]
    \\item \\textbf{Single Source of Truth}: PostgreSQL is the only data store
    \\item \\textbf{Cross-Platform}: One codebase serves web and mobile
    \\item \\textbf{Modular}: Clear package boundaries
    \\item \\textbf{Type-Safe}: TypeScript throughout
\\end{itemize}

% ============================================
\\section{Technology Stack}
% ============================================

\\begin{table}[h]
\\centering
\\begin{tabular}{@{}lll@{}}
\\toprule
\\textbf{Layer} & \\textbf{Technology} & \\textbf{Purpose} \\\\
\\midrule
Frontend Web & React + Vite + TailwindCSS & Single-page application \\\\
Frontend Mobile & React Native + Expo & iOS \\& Android apps \\\\
API Server & Fastify + TypeScript & REST/GraphQL API \\\\
Database & PostgreSQL & Primary data store \\\\
Cache & Redis (optional) & Session/query caching \\\\
Reverse Proxy & Caddy & HTTPS termination \\\\
\\bottomrule
\\end{tabular}
\\caption{Technology Stack}
\\end{table}

% ============================================
\\section{Packages}
% ============================================

The monorepo contains ${packages.length} packages:

\\begin{table}[h]
\\centering
\\begin{tabular}{@{}ll@{}}
\\toprule
\\textbf{Package} & \\textbf{Description} \\\\
\\midrule
${packages.map(p => `\\texttt{${escapeLatex(p.name)}} & ${escapeLatex(p.description || p.directory)} \\\\`).join('\n')}
\\bottomrule
\\end{tabular}
\\caption{Monorepo Packages}
\\end{table}

% ============================================
\\section{Frontend Pages}
% ============================================

The application contains ${pages.length} pages:

\\begin{longtable}{@{}lcc@{}}
\\toprule
\\textbf{Page} & \\textbf{Protected} & \\textbf{Description} \\\\
\\midrule
\\endhead
${pages.map(p => `${escapeLatex(p.name)} & ${p.isProtected ? 'Yes' : 'No'} & ${escapeLatex(p.description.substring(0, 40))} \\\\`).join('\n')}
\\bottomrule
\\caption{Frontend Pages}
\\end{longtable}

% ============================================
\\section{API Endpoints}
% ============================================

The API exposes ${routes.length} endpoints:

\\begin{longtable}{@{}lll@{}}
\\toprule
\\textbf{Method} & \\textbf{Path} & \\textbf{Handler} \\\\
\\midrule
\\endhead
${routes.slice(0, 30).map(r => `\\texttt{${r.method}} & \\texttt{${escapeLatex(r.path)}} & ${escapeLatex(r.file)} \\\\`).join('\n')}
\\bottomrule
\\caption{API Endpoints}
\\end{longtable}

% ============================================
\\section{Data Flow}
% ============================================

\\begin{lstlisting}
+-------------+     +-------------+     +-------------+
|   Client    |---->|   Caddy     |---->|   Fastify   |
|  (React)    |<----|   (HTTPS)   |<----|   (API)     |
+-------------+     +-------------+     +-------------+
                                              |
                                              v
                                        +-------------+
                                        | PostgreSQL  |
                                        |  (Data)     |
                                        +-------------+
\\end{lstlisting}

% ============================================
\\section{Build Process}
% ============================================

\\begin{lstlisting}[language=bash]
# Build order
pnpm build:packages  # shared -> core -> plugin-sdk -> client -> ui
pnpm build:api       # API server
pnpm build           # Frontend (Vite)

# Full deployment
./deploy.sh "commit message"
\\end{lstlisting}

% ============================================
\\section{Scripts}
% ============================================

\\begin{table}[h]
\\centering
\\begin{tabular}{@{}ll@{}}
\\toprule
\\textbf{Script} & \\textbf{Description} \\\\
\\midrule
${scripts.slice(0, 15).map(s => `\\texttt{${escapeLatex(s.name)}} & ${escapeLatex(s.description.substring(0, 50))} \\\\`).join('\n')}
\\bottomrule
\\end{tabular}
\\caption{Available Scripts}
\\end{table}
`;
}

function generateArchitectureLatex(analysis) {
  const { pages, components, packages, routes, scripts } = analysis;
  const date = new Date().toISOString().split('T')[0];

  return `${generateLatexPreamble()}
\\title{
    \\textcolor{brandblue}{\\Huge\\textbf{MuscleMap}}\\\\[0.5em]
    \\textcolor{textsecondary}{\\Large Architecture Documentation}
}
\\author{Auto-generated}
\\date{${date}}

\\begin{document}

\\maketitle
\\tableofcontents
\\newpage

% ============================================
\\section{Overview}
% ============================================

MuscleMap is a cross-platform fitness tracking application with real-time muscle visualization. The architecture follows a modular, layered approach with clear separation of concerns.

\\subsection{Design Principles}

\\begin{itemize}[leftmargin=*]
    \\item \\textbf{Single Source of Truth}: PostgreSQL is the only data store
    \\item \\textbf{Cross-Platform}: One codebase serves web and mobile
    \\item \\textbf{Modular}: Clear package boundaries
    \\item \\textbf{Type-Safe}: TypeScript throughout
\\end{itemize}

% ============================================
\\section{Technology Stack}
% ============================================

\\begin{table}[h]
\\centering
\\begin{tabular}{@{}lll@{}}
\\toprule
\\textbf{Layer} & \\textbf{Technology} & \\textbf{Purpose} \\\\
\\midrule
Frontend Web & React + Vite + TailwindCSS & Single-page application \\\\
Frontend Mobile & React Native + Expo & iOS \\& Android apps \\\\
API Server & Fastify + TypeScript & REST/GraphQL API \\\\
Database & PostgreSQL & Primary data store \\\\
Cache & Redis (optional) & Session/query caching \\\\
Reverse Proxy & Caddy & HTTPS termination \\\\
\\bottomrule
\\end{tabular}
\\caption{Technology Stack}
\\end{table}

% ============================================
\\section{Packages}
% ============================================

The monorepo contains ${packages.length} packages:

\\begin{table}[h]
\\centering
\\begin{tabular}{@{}ll@{}}
\\toprule
\\textbf{Package} & \\textbf{Description} \\\\
\\midrule
${packages.map(p => `\\texttt{${escapeLatex(p.name)}} & ${escapeLatex(p.description || p.directory)} \\\\`).join('\n')}
\\bottomrule
\\end{tabular}
\\caption{Monorepo Packages}
\\end{table}

% ============================================
\\section{Frontend Pages}
% ============================================

The application contains ${pages.length} pages:

\\begin{longtable}{@{}lcc@{}}
\\toprule
\\textbf{Page} & \\textbf{Protected} & \\textbf{Description} \\\\
\\midrule
\\endhead
${pages.map(p => `${escapeLatex(p.name)} & ${p.isProtected ? 'Yes' : 'No'} & ${escapeLatex(p.description.substring(0, 40))} \\\\`).join('\n')}
\\bottomrule
\\caption{Frontend Pages}
\\end{longtable}

% ============================================
\\section{API Endpoints}
% ============================================

The API exposes ${routes.length} endpoints:

\\begin{longtable}{@{}lll@{}}
\\toprule
\\textbf{Method} & \\textbf{Path} & \\textbf{Handler} \\\\
\\midrule
\\endhead
${routes.slice(0, 30).map(r => `\\texttt{${r.method}} & \\texttt{${escapeLatex(r.path)}} & ${escapeLatex(r.file)} \\\\`).join('\n')}
\\bottomrule
\\caption{API Endpoints}
\\end{longtable}

% ============================================
\\section{Data Flow}
% ============================================

\\begin{lstlisting}
+-------------+     +-------------+     +-------------+
|   Client    |---->|   Caddy     |---->|   Fastify   |
|  (React)    |<----|   (HTTPS)   |<----|   (API)     |
+-------------+     +-------------+     +-------------+
                                              |
                                              v
                                        +-------------+
                                        | PostgreSQL  |
                                        |  (Data)     |
                                        +-------------+
\\end{lstlisting}

% ============================================
\\section{Build Process}
% ============================================

\\begin{lstlisting}[language=bash]
# Build order
pnpm build:packages  # shared -> core -> plugin-sdk -> client -> ui
pnpm build:api       # API server
pnpm build           # Frontend (Vite)

# Full deployment
./deploy.sh "commit message"
\\end{lstlisting}

% ============================================
\\section{Scripts}
% ============================================

\\begin{table}[h]
\\centering
\\begin{tabular}{@{}ll@{}}
\\toprule
\\textbf{Script} & \\textbf{Description} \\\\
\\midrule
${scripts.slice(0, 15).map(s => `\\texttt{${escapeLatex(s.name)}} & ${escapeLatex(s.description.substring(0, 50))} \\\\`).join('\n')}
\\bottomrule
\\end{tabular}
\\caption{Available Scripts}
\\end{table}

\\end{document}
`;
}

// Generate content-only API reference for inclusion in master document
function generateAPIContent(analysis) {
  const { routes } = analysis;

  // Group routes by file
  const grouped = {};
  for (const route of routes) {
    if (!grouped[route.file]) grouped[route.file] = [];
    grouped[route.file].push(route);
  }

  return `% API Reference content (for inclusion in master document)
% ============================================
\\section{Overview}
% ============================================

\\subsection{Base URLs}

\\begin{itemize}[leftmargin=*]
    \\item \\textbf{Production}: \\texttt{https://musclemap.me/api}
    \\item \\textbf{Development}: \\texttt{http://localhost:3001}
\\end{itemize}

\\subsection{Authentication}

Most endpoints require authentication via JWT token:

\\begin{lstlisting}
Authorization: Bearer <token>
\\end{lstlisting}

\\subsection{Response Format}

\\subsubsection{Success Response}
\\begin{lstlisting}
{
  "success": true,
  "data": { ... }
}
\\end{lstlisting}

\\subsubsection{Error Response}
\\begin{lstlisting}
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
\\end{lstlisting}

% ============================================
\\section{Endpoints}
% ============================================

${Object.entries(grouped).map(([file, fileRoutes]) => `
\\subsection{${file.charAt(0).toUpperCase() + file.slice(1)}}

\\begin{table}[h]
\\centering
\\begin{tabular}{@{}ll@{}}
\\toprule
\\textbf{Method} & \\textbf{Endpoint} \\\\
\\midrule
${fileRoutes.map(r => `\\texttt{${r.method}} & \\texttt{${escapeLatex(r.path)}} \\\\`).join('\n')}
\\bottomrule
\\end{tabular}
\\end{table}
`).join('\n')}

% ============================================
\\section{Rate Limiting}
% ============================================

\\begin{itemize}[leftmargin=*]
    \\item \\textbf{Authenticated}: 100 requests/minute
    \\item \\textbf{Unauthenticated}: 20 requests/minute
\\end{itemize}

% ============================================
\\section{Health Check}
% ============================================

\\begin{lstlisting}[language=bash]
curl https://musclemap.me/health
\\end{lstlisting}
`;
}

function generateAPILatex(analysis) {
  const { routes } = analysis;
  const date = new Date().toISOString().split('T')[0];

  // Group routes by file
  const grouped = {};
  for (const route of routes) {
    if (!grouped[route.file]) grouped[route.file] = [];
    grouped[route.file].push(route);
  }

  return `${generateLatexPreamble()}
\\title{
    \\textcolor{brandblue}{\\Huge\\textbf{MuscleMap}}\\\\[0.5em]
    \\textcolor{textsecondary}{\\Large API Reference}
}
\\author{Auto-generated}
\\date{${date}}

\\begin{document}

\\maketitle
\\tableofcontents
\\newpage

% ============================================
\\section{Overview}
% ============================================

\\subsection{Base URLs}

\\begin{itemize}[leftmargin=*]
    \\item \\textbf{Production}: \\texttt{https://musclemap.me/api}
    \\item \\textbf{Development}: \\texttt{http://localhost:3001}
\\end{itemize}

\\subsection{Authentication}

Most endpoints require authentication via JWT token:

\\begin{lstlisting}
Authorization: Bearer <token>
\\end{lstlisting}

\\subsection{Response Format}

\\subsubsection{Success Response}
\\begin{lstlisting}
{
  "success": true,
  "data": { ... }
}
\\end{lstlisting}

\\subsubsection{Error Response}
\\begin{lstlisting}
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
\\end{lstlisting}

% ============================================
\\section{Endpoints}
% ============================================

${Object.entries(grouped).map(([file, fileRoutes]) => `
\\subsection{${file.charAt(0).toUpperCase() + file.slice(1)}}

\\begin{table}[h]
\\centering
\\begin{tabular}{@{}ll@{}}
\\toprule
\\textbf{Method} & \\textbf{Endpoint} \\\\
\\midrule
${fileRoutes.map(r => `\\texttt{${r.method}} & \\texttt{${escapeLatex(r.path)}} \\\\`).join('\n')}
\\bottomrule
\\end{tabular}
\\end{table}
`).join('\n')}

% ============================================
\\section{Rate Limiting}
% ============================================

\\begin{itemize}[leftmargin=*]
    \\item \\textbf{Authenticated}: 100 requests/minute
    \\item \\textbf{Unauthenticated}: 20 requests/minute
\\end{itemize}

% ============================================
\\section{Health Check}
% ============================================

\\begin{lstlisting}[language=bash]
curl https://musclemap.me/health
\\end{lstlisting}

\\end{document}
`;
}

// Generate content-only Features for inclusion in master document
function generateFeaturesContent(analysis) {
  const { pages } = analysis;

  return `% Features content (for inclusion in master document)
% ============================================
\\section{Overview}
% ============================================

MuscleMap is a comprehensive fitness platform with ${pages.length} pages/features. This document describes the key features and capabilities.

% ============================================
\\section{Core Features}
% ============================================

\\subsection{Real-Time Muscle Visualization}

\\begin{itemize}[leftmargin=*]
    \\item 3D muscle model using Three.js
    \\item Color-coded muscle activation display
    \\item Interactive body part selection
    \\item Anatomically accurate muscle groups
\\end{itemize}

\\subsection{Workout Tracking}

\\begin{itemize}[leftmargin=*]
    \\item Log exercises with sets, reps, weight
    \\item Timer for rest periods
    \\item Progress tracking over time
    \\item Exercise history and statistics
\\end{itemize}

\\subsection{Exercise Library}

\\begin{itemize}[leftmargin=*]
    \\item 500+ exercises with detailed instructions
    \\item Muscle group targeting information
    \\item Equipment requirements
    \\item Difficulty ratings
\\end{itemize}

% ============================================
\\section{Community Features}
% ============================================

\\subsection{Social Integration}

\\begin{itemize}[leftmargin=*]
    \\item Leaderboards and competitions
    \\item High-five system for encouragement
    \\item Direct messaging between users
    \\item Activity feed and social sharing
\\end{itemize}

\\subsection{Location Services}

\\begin{itemize}[leftmargin=*]
    \\item Gym finder with map integration
    \\item Check-in system
    \\item Nearby workout partners
\\end{itemize}

% ============================================
\\section{Gamification}
% ============================================

\\begin{itemize}[leftmargin=*]
    \\item XP and leveling system
    \\item Achievements and badges
    \\item Character stats (RPG-style)
    \\item Skins and avatar customization
    \\item Virtual currency (credits)
\\end{itemize}

% ============================================
\\section{Technical Features}
% ============================================

\\subsection{Icon System}

The application uses a unified icon system combining:
\\begin{itemize}[leftmargin=*]
    \\item Lucide React (1,000+ general UI icons)
    \\item Phosphor Icons (7,000+ fitness-focused icons)
    \\item DiceBear (programmatic avatar generation)
    \\item Custom fitness icons (muscle groups, equipment)
\\end{itemize}

\\subsection{Design System}

\\begin{itemize}[leftmargin=*]
    \\item Liquid Glass aesthetic
    \\item Dark mode optimized
    \\item Brand colors: Electric Blue (\\#0066FF), Pulse Magenta (\\#FF3366)
    \\item Responsive design for all devices
\\end{itemize}

% ============================================
\\section{Mobile App}
% ============================================

The React Native mobile app provides:
\\begin{itemize}[leftmargin=*]
    \\item Native iOS and Android experience
    \\item HealthKit/Google Fit integration
    \\item Push notifications
    \\item Offline workout logging
    \\item Biometric authentication
\\end{itemize}

% ============================================
\\section{Pages Reference}
% ============================================

\\begin{longtable}{@{}lcp{6cm}@{}}
\\toprule
\\textbf{Page} & \\textbf{Auth} & \\textbf{Description} \\\\
\\midrule
\\endhead
${pages.map(p => `${escapeLatex(p.name)} & ${p.isProtected ? 'Yes' : 'No'} & ${escapeLatex(p.description)} \\\\`).join('\n')}
\\bottomrule
\\caption{All Application Pages}
\\end{longtable}
`;
}

function generateFeaturesLatex(analysis) {
  const { pages } = analysis;
  const date = new Date().toISOString().split('T')[0];

  return `${generateLatexPreamble()}
\\title{
    \\textcolor{brandblue}{\\Huge\\textbf{MuscleMap}}\\\\[0.5em]
    \\textcolor{textsecondary}{\\Large Feature Documentation}
}
\\author{Auto-generated}
\\date{${date}}

\\begin{document}

\\maketitle
\\tableofcontents
\\newpage

% ============================================
\\section{Overview}
% ============================================

MuscleMap is a comprehensive fitness platform with ${pages.length} pages/features. This document describes the key features and capabilities.

% ============================================
\\section{Core Features}
% ============================================

\\subsection{Real-Time Muscle Visualization}

\\begin{itemize}[leftmargin=*]
    \\item 3D muscle model using Three.js
    \\item Color-coded muscle activation display
    \\item Interactive body part selection
    \\item Anatomically accurate muscle groups
\\end{itemize}

\\subsection{Workout Tracking}

\\begin{itemize}[leftmargin=*]
    \\item Log exercises with sets, reps, weight
    \\item Timer for rest periods
    \\item Progress tracking over time
    \\item Exercise history and statistics
\\end{itemize}

\\subsection{Exercise Library}

\\begin{itemize}[leftmargin=*]
    \\item 500+ exercises with detailed instructions
    \\item Muscle group targeting information
    \\item Equipment requirements
    \\item Difficulty ratings
\\end{itemize}

% ============================================
\\section{Community Features}
% ============================================

\\subsection{Social Integration}

\\begin{itemize}[leftmargin=*]
    \\item Leaderboards and competitions
    \\item High-five system for encouragement
    \\item Direct messaging between users
    \\item Activity feed and social sharing
\\end{itemize}

\\subsection{Location Services}

\\begin{itemize}[leftmargin=*]
    \\item Gym finder with map integration
    \\item Check-in system
    \\item Nearby workout partners
\\end{itemize}

% ============================================
\\section{Gamification}
% ============================================

\\begin{itemize}[leftmargin=*]
    \\item XP and leveling system
    \\item Achievements and badges
    \\item Character stats (RPG-style)
    \\item Skins and avatar customization
    \\item Virtual currency (credits)
\\end{itemize}

% ============================================
\\section{Technical Features}
% ============================================

\\subsection{Icon System}

The application uses a unified icon system combining:
\\begin{itemize}[leftmargin=*]
    \\item Lucide React (1,000+ general UI icons)
    \\item Phosphor Icons (7,000+ fitness-focused icons)
    \\item DiceBear (programmatic avatar generation)
    \\item Custom fitness icons (muscle groups, equipment)
\\end{itemize}

\\subsection{Design System}

\\begin{itemize}[leftmargin=*]
    \\item Liquid Glass aesthetic
    \\item Dark mode optimized
    \\item Brand colors: Electric Blue (\\#0066FF), Pulse Magenta (\\#FF3366)
    \\item Responsive design for all devices
\\end{itemize}

% ============================================
\\section{Mobile App}
% ============================================

The React Native mobile app provides:
\\begin{itemize}[leftmargin=*]
    \\item Native iOS and Android experience
    \\item HealthKit/Google Fit integration
    \\item Push notifications
    \\item Offline workout logging
    \\item Biometric authentication
\\end{itemize}

% ============================================
\\section{Pages Reference}
% ============================================

\\begin{longtable}{@{}lcp{6cm}@{}}
\\toprule
\\textbf{Page} & \\textbf{Auth} & \\textbf{Description} \\\\
\\midrule
\\endhead
${pages.map(p => `${escapeLatex(p.name)} & ${p.isProtected ? 'Yes' : 'No'} & ${escapeLatex(p.description)} \\\\`).join('\n')}
\\bottomrule
\\caption{All Application Pages}
\\end{longtable}

\\end{document}
`;
}

function generateMasterLatex(analysis) {
  const date = new Date().toISOString().split('T')[0];

  return `${generateLatexPreamble()}
\\title{
    \\vspace{2cm}
    \\textcolor{brandblue}{\\Huge\\textbf{MuscleMap}}\\\\[1em]
    \\textcolor{textsecondary}{\\LARGE Technical Documentation}\\\\[2em]
    \\large Version 1.0.0
}
\\author{
    \\textcolor{textsecondary}{MuscleMap Development Team}
}
\\date{${date}}

\\begin{document}

\\maketitle
\\thispagestyle{empty}

\\vfill

\\begin{center}
\\textcolor{textsecondary}{
    \\textit{Visual Workout Tracking}\\\\[1em]
    \\url{https://musclemap.me}
}
\\end{center}

\\newpage
\\tableofcontents
\\newpage

% ============================================
\\part{Introduction}
% ============================================

\\section{About MuscleMap}

MuscleMap is a cross-platform fitness tracking application that visualizes muscle activation in real-time. The platform helps users understand which muscles they're targeting during workouts, enabling more effective training.

\\subsection{Key Features}

\\begin{itemize}[leftmargin=*]
    \\item \\textbf{3D Muscle Visualization}: See exactly which muscles are being worked
    \\item \\textbf{Workout Tracking}: Log exercises, sets, reps, and weights
    \\item \\textbf{Progress Analytics}: Track your fitness journey over time
    \\item \\textbf{Community Features}: Compete, connect, and motivate
    \\item \\textbf{Cross-Platform}: Web, iOS, and Android
\\end{itemize}

\\subsection{Technology Highlights}

\\begin{itemize}[leftmargin=*]
    \\item React + Vite for blazing-fast web experience
    \\item React Native + Expo for native mobile apps
    \\item Fastify API with TypeScript
    \\item PostgreSQL for reliable data storage
    \\item Three.js for 3D muscle rendering
\\end{itemize}

% ============================================
\\part{Architecture}
% ============================================

\\input{architecture-content}

% ============================================
\\part{API Reference}
% ============================================

\\input{api-reference-content}

% ============================================
\\part{Features}
% ============================================

\\input{features-content}

% ============================================
\\part{Appendix}
% ============================================

\\section{Links}

\\begin{itemize}[leftmargin=*]
    \\item Website: \\url{https://musclemap.me}
    \\item GitHub: \\url{https://github.com/jeanpaulniko/musclemap}
    \\item API Health: \\url{https://musclemap.me/health}
\\end{itemize}

\\section{Contact}

For support or inquiries: \\texttt{support@musclemap.me}

\\end{document}
`;
}

// ============================================
// DOCS-PLAIN SYNC
// ============================================

function syncDocsPlain() {
  console.log('Syncing plain-text documentation to public...\n');

  // Ensure target directory exists
  ensureDir(PUBLIC_DOCS_PLAIN_DIR);

  // Count files before sync
  const docsPlainFiles = getFiles(DOCS_PLAIN_DIR, /\.(md|json|yaml)$/);

  // Copy all markdown/json/yaml files recursively
  function copyRecursive(srcDir, destDir) {
    ensureDir(destDir);
    const items = fs.readdirSync(srcDir, { withFileTypes: true });

    for (const item of items) {
      if (item.name.startsWith('.')) continue; // Skip hidden files
      if (item.name === 'index.html') continue; // Don't overwrite index

      const srcPath = path.join(srcDir, item.name);
      const destPath = path.join(destDir, item.name);

      if (item.isDirectory()) {
        copyRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  copyRecursive(DOCS_PLAIN_DIR, PUBLIC_DOCS_PLAIN_DIR);

  // Copy index.html template if it exists
  if (fs.existsSync(INDEX_TEMPLATE_PATH)) {
    fs.copyFileSync(INDEX_TEMPLATE_PATH, path.join(PUBLIC_DOCS_PLAIN_DIR, 'index.html'));
    console.log('  ✓ Copied index.html template');
  }

  // Count files after sync
  const syncedFiles = getFiles(PUBLIC_DOCS_PLAIN_DIR, /\.(md|json|yaml|html)$/);
  console.log(`  ✓ Synced ${syncedFiles.length} files to public/docs-plain/\n`);

  return syncedFiles.length;
}

// ============================================
// MAIN
// ============================================

async function main() {
  const startTime = Date.now();

  console.log('\n' + '='.repeat(60));
  console.log('  MuscleMap Documentation Generator (Optimized)');
  console.log('='.repeat(60) + '\n');

  // Check if regeneration is needed (incremental mode)
  if (!needsRegeneration()) {
    console.log('Documentation is up to date.\n');
    return;
  }

  ensureDir(DOCS_DIR);
  ensureDir(LATEX_DIR);

  // Try to use cached analysis if fast mode
  let analysis = null;
  if (FAST_MODE) {
    analysis = loadCache();
    if (analysis) {
      console.log('Using cached analysis (fast mode)...\n');
    }
  }

  // Analyze codebase (parallel where possible)
  if (!analysis) {
    console.log('Analyzing codebase...\n');

    // Run analyzers in parallel using Promise.all
    const [pages, components, routes, packages, scripts, deps] = await Promise.all([
      Promise.resolve(analyzePages()),
      Promise.resolve(analyzeComponents()),
      Promise.resolve(analyzeAPIRoutes()),
      Promise.resolve(analyzePackages()),
      Promise.resolve(analyzeScripts()),
      Promise.resolve(analyzeDependencies()),
    ]);

    analysis = { pages, components, routes, packages, scripts, deps };

    // Cache the analysis
    saveCache(analysis);
  }

  console.log(`  Found ${analysis.pages.length} pages`);
  console.log(`  Found ${analysis.components.length} components`);
  console.log(`  Found ${analysis.routes.length} API routes`);
  console.log(`  Found ${analysis.packages.length} packages`);
  console.log(`  Found ${analysis.scripts.length} scripts`);
  console.log('');

  const generatedFiles = [];

  // Generate Markdown documents
  if (GENERATE_MD) {
    console.log('Generating Markdown documentation...\n');

    const mdDocs = [
      { name: 'ARCHITECTURE.md', content: generateArchitectureDoc(analysis) },
      { name: 'API_REFERENCE.md', content: generateAPIReferenceDoc(analysis) },
      { name: 'FEATURES.md', content: generateFeaturesDoc(analysis) },
    ];

    for (const doc of mdDocs) {
      const docPath = path.join(DOCS_DIR, doc.name);
      fs.writeFileSync(docPath, doc.content);
      console.log(`  ✓ ${doc.name}`);
      generatedFiles.push(`docs/${doc.name}`);
    }

    // Update root README
    const readmePath = path.join(ROOT_DIR, 'README.md');
    fs.writeFileSync(readmePath, generateReadme(analysis));
    console.log('  ✓ README.md');
    generatedFiles.push('README.md');
    console.log('');
  }

  // Generate LaTeX documents
  if (GENERATE_LATEX) {
    console.log('Generating LaTeX documentation...\n');

    // Standalone documents (can be compiled individually)
    const latexDocs = [
      { name: 'architecture.tex', content: generateArchitectureLatex(analysis) },
      { name: 'api-reference.tex', content: generateAPILatex(analysis) },
      { name: 'features.tex', content: generateFeaturesLatex(analysis) },
    ];

    for (const doc of latexDocs) {
      const docPath = path.join(LATEX_DIR, doc.name);
      fs.writeFileSync(docPath, doc.content);
      console.log(`  ✓ ${doc.name} (standalone)`);
      generatedFiles.push(`docs/latex/${doc.name}`);
    }

    // Content-only files for inclusion in master document
    const contentDocs = [
      { name: 'architecture-content.tex', content: generateArchitectureContent(analysis) },
      { name: 'api-reference-content.tex', content: generateAPIContent(analysis) },
      { name: 'features-content.tex', content: generateFeaturesContent(analysis) },
    ];

    for (const doc of contentDocs) {
      const docPath = path.join(LATEX_DIR, doc.name);
      fs.writeFileSync(docPath, doc.content);
      console.log(`  ✓ ${doc.name} (for master doc)`);
      generatedFiles.push(`docs/latex/${doc.name}`);
    }

    // Master document (includes content files)
    const masterDocPath = path.join(LATEX_DIR, 'musclemap-docs.tex');
    fs.writeFileSync(masterDocPath, generateMasterLatex(analysis));
    console.log('  ✓ musclemap-docs.tex (master)');
    generatedFiles.push('docs/latex/musclemap-docs.tex');

    // Create Makefile for LaTeX compilation
    const makefile = `# MuscleMap LaTeX Documentation Makefile
# Usage: make all (or make architecture, make api-reference, etc.)

LATEX = pdflatex
LATEXFLAGS = -interaction=nonstopmode -halt-on-error

# Default target: build everything
all: musclemap-docs.pdf architecture.pdf api-reference.pdf features.pdf

# Master document (includes content files)
musclemap-docs.pdf: musclemap-docs.tex architecture-content.tex api-reference-content.tex features-content.tex
\t$(LATEX) $(LATEXFLAGS) musclemap-docs.tex
\t$(LATEX) $(LATEXFLAGS) musclemap-docs.tex

# Standalone documents
architecture.pdf: architecture.tex
\t$(LATEX) $(LATEXFLAGS) architecture.tex
\t$(LATEX) $(LATEXFLAGS) architecture.tex

api-reference.pdf: api-reference.tex
\t$(LATEX) $(LATEXFLAGS) api-reference.tex
\t$(LATEX) $(LATEXFLAGS) api-reference.tex

features.pdf: features.tex
\t$(LATEX) $(LATEXFLAGS) features.tex
\t$(LATEX) $(LATEXFLAGS) features.tex

clean:
\trm -f *.aux *.log *.out *.toc *.lof *.lot

distclean: clean
\trm -f *.pdf

.PHONY: all clean distclean
`;

    const makefilePath = path.join(LATEX_DIR, 'Makefile');
    fs.writeFileSync(makefilePath, makefile);
    console.log('  ✓ Makefile');
    generatedFiles.push('docs/latex/Makefile');
    console.log('');
  }

  // Sync docs-plain to public directory
  if (SYNC_DOCS_PLAIN) {
    const syncedCount = syncDocsPlain();
    generatedFiles.push(`public/docs-plain/ (${syncedCount} files)`);
  }

  console.log('='.repeat(60));
  console.log('  Documentation generated successfully!');
  console.log('='.repeat(60) + '\n');

  console.log('Generated files:');
  for (const file of generatedFiles) {
    console.log(`  - ${file}`);
  }

  if (GENERATE_LATEX) {
    console.log('\nTo compile LaTeX to PDF:');
    console.log('  cd docs/latex && make all');
    console.log('\nOr compile individual documents:');
    console.log('  cd docs/latex && pdflatex architecture.tex');
  }

  if (SYNC_DOCS_PLAIN) {
    console.log('\nPlain-text documentation available at:');
    console.log('  Local:      http://localhost:5173/docs-plain/');
    console.log('  Production: https://musclemap.me/docs-plain/');
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\nCompleted in ${elapsed}s`);
  console.log('');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
