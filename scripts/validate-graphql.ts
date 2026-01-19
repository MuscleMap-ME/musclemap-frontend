#!/usr/bin/env tsx
/**
 * GraphQL Schema-Resolver Validation Script
 *
 * This script validates that all GraphQL schema definitions have corresponding
 * resolver implementations. Run this in CI/CD to catch misconfigurations early.
 *
 * Usage:
 *   pnpm validate:graphql
 *   npx tsx scripts/validate-graphql.ts
 *   npx tsx scripts/validate-graphql.ts --fix (generates stubs for missing resolvers)
 */

import * as fs from 'fs';
import * as path from 'path';

const SCHEMA_PATH = path.join(__dirname, '../apps/api/src/graphql/schema.ts');
const RESOLVERS_PATH = path.join(__dirname, '../apps/api/src/graphql/resolvers.ts');

interface ValidationResult {
  missingQueryResolvers: string[];
  missingMutationResolvers: string[];
  missingTypeResolvers: { type: string; fields: string[] }[];
  jsonbParsingIssues: { file: string; line: number; code: string }[];
  offsetPaginationIssues: { file: string; line: number; code: string }[];
  n1QueryPatterns: { file: string; line: number; description: string }[];
}

function extractSchemaFields(schemaContent: string, typeName: string): string[] {
  // Match type definition: type Query { ... } or type Mutation { ... }
  const typeRegex = new RegExp(`type\\s+${typeName}\\s*\\{([^}]+)\\}`, 'gs');
  const match = typeRegex.exec(schemaContent);

  if (!match) return [];

  const body = match[1];
  const fields: string[] = [];

  // Match field definitions like: fieldName(args): ReturnType
  const fieldRegex = /^\s*(\w+)\s*[(:]/gm;
  let fieldMatch;

  while ((fieldMatch = fieldRegex.exec(body)) !== null) {
    fields.push(fieldMatch[1]);
  }

  return fields;
}

function extractResolverFields(resolversContent: string, typeName: string): string[] {
  // Match resolver object: Query: { ... } or Mutation: { ... }
  const resolverRegex = new RegExp(`${typeName}:\\s*\\{`, 'g');
  const startMatch = resolverRegex.exec(resolversContent);

  if (!startMatch) return [];

  let braceCount = 1;
  let pos = startMatch.index + startMatch[0].length;

  while (braceCount > 0 && pos < resolversContent.length) {
    if (resolversContent[pos] === '{') braceCount++;
    if (resolversContent[pos] === '}') braceCount--;
    pos++;
  }

  const body = resolversContent.substring(startMatch.index + startMatch[0].length, pos - 1);
  const fields: string[] = [];

  // Match resolver implementations: fieldName: async or fieldName:
  const fieldRegex = /^\s*(\w+)\s*:/gm;
  let fieldMatch;

  while ((fieldMatch = fieldRegex.exec(body)) !== null) {
    fields.push(fieldMatch[1]);
  }

  return fields;
}

function checkJsonbParsing(apiPath: string): { file: string; line: number; code: string }[] {
  const issues: { file: string; line: number; code: string }[] = [];
  const files = findTsFiles(apiPath);

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Check for JSON.parse on common JSONB column patterns
      if (line.includes('JSON.parse') &&
          (line.includes('_data') || line.includes('_json') || line.includes('settings') ||
           line.includes('metadata') || line.includes('config'))) {
        issues.push({
          file: path.relative(process.cwd(), file),
          line: index + 1,
          code: line.trim()
        });
      }
    });
  }

  return issues;
}

function checkOffsetPagination(apiPath: string): { file: string; line: number; code: string }[] {
  const issues: { file: string; line: number; code: string }[] = [];
  const files = findTsFiles(apiPath);

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      if (line.includes('.offset(') && !line.includes('// OK: offset')) {
        issues.push({
          file: path.relative(process.cwd(), file),
          line: index + 1,
          code: line.trim()
        });
      }
    });
  }

  return issues;
}

function checkN1Patterns(apiPath: string): { file: string; line: number; description: string }[] {
  const issues: { file: string; line: number; description: string }[] = [];
  const files = findTsFiles(apiPath);

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    let inLoop = false;
    let loopStartLine = 0;

    lines.forEach((line, index) => {
      // Detect loop starts
      if (line.includes('for (') || line.includes('for(') ||
          line.includes('.forEach(') || line.includes('.map(')) {
        inLoop = true;
        loopStartLine = index + 1;
      }

      // Detect potential N+1: database call inside loop
      if (inLoop && (line.includes('await db(') || line.includes('await knex(') ||
                     line.includes('.where(') || line.includes('.first()'))) {
        // Check if it's not a batched query
        if (!line.includes('whereIn') && !line.includes('ANY(')) {
          issues.push({
            file: path.relative(process.cwd(), file),
            line: index + 1,
            description: `Potential N+1 query inside loop starting at line ${loopStartLine}`
          });
        }
      }

      // Detect loop ends (simplified)
      if (line.includes('})') && inLoop) {
        inLoop = false;
      }
    });
  }

  return issues;
}

function findTsFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory() && !entry.name.includes('node_modules') && !entry.name.includes('dist')) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

function validate(): ValidationResult {
  console.log('🔍 Validating GraphQL schema vs resolvers...\n');

  const schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  const resolversContent = fs.readFileSync(RESOLVERS_PATH, 'utf-8');

  // Extract schema fields
  const schemaQueries = extractSchemaFields(schemaContent, 'Query');
  const schemaMutations = extractSchemaFields(schemaContent, 'Mutation');

  // Extract resolver implementations
  const resolverQueries = extractResolverFields(resolversContent, 'Query');
  const resolverMutations = extractResolverFields(resolversContent, 'Mutation');

  // Find missing resolvers
  const missingQueryResolvers = schemaQueries.filter(q => !resolverQueries.includes(q));
  const missingMutationResolvers = schemaMutations.filter(m => !resolverMutations.includes(m));

  // Check for anti-patterns
  const apiPath = path.join(__dirname, '../apps/api/src');
  const jsonbParsingIssues = checkJsonbParsing(apiPath);
  const offsetPaginationIssues = checkOffsetPagination(apiPath);
  const n1QueryPatterns = checkN1Patterns(apiPath);

  return {
    missingQueryResolvers,
    missingMutationResolvers,
    missingTypeResolvers: [], // TODO: Implement type field resolver checking
    jsonbParsingIssues,
    offsetPaginationIssues,
    n1QueryPatterns
  };
}

function printResults(results: ValidationResult): void {
  let hasIssues = false;

  // Missing Query Resolvers
  if (results.missingQueryResolvers.length > 0) {
    hasIssues = true;
    console.log('❌ MISSING QUERY RESOLVERS:');
    results.missingQueryResolvers.forEach(q => console.log(`   - ${q}`));
    console.log(`   Total: ${results.missingQueryResolvers.length}\n`);
  } else {
    console.log('✅ All query resolvers implemented\n');
  }

  // Missing Mutation Resolvers
  if (results.missingMutationResolvers.length > 0) {
    hasIssues = true;
    console.log('❌ MISSING MUTATION RESOLVERS:');
    results.missingMutationResolvers.forEach(m => console.log(`   - ${m}`));
    console.log(`   Total: ${results.missingMutationResolvers.length}\n`);
  } else {
    console.log('✅ All mutation resolvers implemented\n');
  }

  // JSONB Parsing Issues
  if (results.jsonbParsingIssues.length > 0) {
    hasIssues = true;
    console.log('⚠️  JSONB PARSING ISSUES (PostgreSQL returns JSONB as objects):');
    results.jsonbParsingIssues.forEach(i => {
      console.log(`   ${i.file}:${i.line}`);
      console.log(`   > ${i.code}\n`);
    });
  } else {
    console.log('✅ No JSONB parsing issues found\n');
  }

  // OFFSET Pagination
  if (results.offsetPaginationIssues.length > 0) {
    hasIssues = true;
    console.log('⚠️  OFFSET PAGINATION (use keyset pagination instead):');
    results.offsetPaginationIssues.forEach(i => {
      console.log(`   ${i.file}:${i.line}`);
      console.log(`   > ${i.code}\n`);
    });
  } else {
    console.log('✅ No OFFSET pagination issues found\n');
  }

  // N+1 Patterns
  if (results.n1QueryPatterns.length > 0) {
    hasIssues = true;
    console.log('⚠️  POTENTIAL N+1 QUERY PATTERNS:');
    results.n1QueryPatterns.forEach(i => {
      console.log(`   ${i.file}:${i.line}`);
      console.log(`   > ${i.description}\n`);
    });
  } else {
    console.log('✅ No obvious N+1 patterns found\n');
  }

  // Summary
  console.log('='.repeat(60));
  if (hasIssues) {
    console.log('❌ VALIDATION FAILED - Issues found above');
    process.exit(1);
  } else {
    console.log('✅ VALIDATION PASSED - No issues found');
    process.exit(0);
  }
}

function generateStubs(results: ValidationResult): void {
  console.log('\n📝 Generating resolver stubs...\n');

  let stubs = '// Generated resolver stubs - add implementations\n\n';

  if (results.missingQueryResolvers.length > 0) {
    stubs += '// Missing Query Resolvers:\n';
    results.missingQueryResolvers.forEach(q => {
      stubs += `    ${q}: async (_: unknown, args: unknown, context: Context) => {\n`;
      stubs += `      // TODO: Implement ${q} resolver\n`;
      stubs += `      throw new Error('${q} resolver not implemented');\n`;
      stubs += `    },\n\n`;
    });
  }

  if (results.missingMutationResolvers.length > 0) {
    stubs += '// Missing Mutation Resolvers:\n';
    results.missingMutationResolvers.forEach(m => {
      stubs += `    ${m}: async (_: unknown, args: unknown, context: Context) => {\n`;
      stubs += `      // TODO: Implement ${m} resolver\n`;
      stubs += `      throw new Error('${m} resolver not implemented');\n`;
      stubs += `    },\n\n`;
    });
  }

  const stubsPath = path.join(__dirname, '../apps/api/src/graphql/resolver-stubs.ts');
  fs.writeFileSync(stubsPath, stubs);
  console.log(`Stubs written to: ${stubsPath}`);
}

// Main
const args = process.argv.slice(2);
const results = validate();
printResults(results);

if (args.includes('--fix')) {
  generateStubs(results);
}
