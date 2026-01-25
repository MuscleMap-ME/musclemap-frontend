#!/usr/bin/env node
/**
 * Extract GraphQL Schema
 *
 * Extracts the GraphQL schema from the API's TypeScript file
 * and writes it to a .graphql file for codegen consumption.
 */

const fs = require('fs');
const path = require('path');

const schemaPath = path.resolve(__dirname, '../../../apps/api/src/graphql/schema.ts');
const outputPath = path.resolve(__dirname, '../src/graphql/schema.graphql');

// Read the TypeScript file
const content = fs.readFileSync(schemaPath, 'utf-8');

// Extract the GraphQL SDL from the template literal
// The schema is in: export const typeDefs = `#graphql ... `;
const match = content.match(/export const typeDefs = `#graphql([\s\S]*?)`;/);

if (!match) {
  console.error('Could not find typeDefs in schema.ts');
  process.exit(1);
}

const schema = match[1].trim();

// Ensure output directory exists
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write the schema
fs.writeFileSync(outputPath, schema);
console.log(`Schema extracted to ${outputPath}`);
console.log(`Schema size: ${schema.length} characters`);
