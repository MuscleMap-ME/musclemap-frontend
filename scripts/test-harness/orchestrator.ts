/**
 * Test Orchestrator
 * Coordinates test execution, manages context, and runs test suites
 */

import type {
  TestScript,
  TestStep,
  TestResult,
  SuiteResult,
  TestContext,
  ExecutionOptions,
  PersonaConfig,
  TestCategory,
  Environment,
  TestStatus,
} from './types.js';
import { executeAction, httpAction, extractToken, extractUserId } from './executor.js';
import { runAssertions, allPassed } from './assertions.js';
import { getPersona, generateTestEmail, getDefaultPersona } from './personas.js';
import { generateScorecard, printScorecard } from './scorecard.js';
import type { Scorecard } from './types.js';

// ============================================================================
// Environment Configuration
// ============================================================================

const environments: Record<Environment, string> = {
  local: 'http://localhost:3001',
  staging: 'https://staging.musclemap.me',
  production: 'https://musclemap.me',
};

// ============================================================================
// Context Management
// ============================================================================

/**
 * Create a new test context
 */
export function createContext(
  options: ExecutionOptions,
  persona: PersonaConfig
): TestContext {
  const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    runId,
    environment: options.environment,
    baseUrl: environments[options.environment],
    persona,
    variables: new Map(),
    results: [],
    verbose: options.verbose,
    startTime: new Date(),
  };
}

/**
 * Update context with auth info
 */
export function setAuthToken(ctx: TestContext, token: string, userId?: string): void {
  ctx.token = token;
  if (userId) {
    ctx.userId = userId;
  }
  ctx.persona.state.isLoggedIn = true;
  ctx.variables.set('token', token);
  ctx.variables.set('userId', userId);
}

// ============================================================================
// Test Step Execution
// ============================================================================

/**
 * Execute a single test step
 */
async function executeStep(
  step: TestStep,
  ctx: TestContext
): Promise<TestResult> {
  const startTime = Date.now();
  ctx.currentStep = step;

  try {
    // Check if step should be skipped
    if (step.skip) {
      const shouldSkip = typeof step.skip === 'function' ? await step.skip(ctx) : step.skip;
      if (shouldSkip) {
        return {
          stepName: step.name,
          status: 'skipped',
          duration: 0,
          timestamp: new Date(),
        };
      }
    }

    // Run setup if defined
    if (step.setup) {
      await step.setup(ctx);
    }

    // Build and execute the action
    const action = {
      type: step.action as 'http_request',
      name: step.name,
      params: step.params || {},
    };

    // Execute with retry logic
    let result;
    let lastError: Error | undefined;
    const maxRetries = step.retries || 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        result = await executeAction(action, ctx);

        if (result.success) break;
        lastError = result.error instanceof Error ? result.error : new Error(String(result.error));

        if (attempt < maxRetries) {
          // Wait before retry with exponential backoff
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500));
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    if (!result) {
      return {
        stepName: step.name,
        status: 'error',
        duration: Date.now() - startTime,
        error: lastError || new Error('Unknown error'),
        timestamp: new Date(),
      };
    }

    // Run assertions if defined
    let assertionResults;
    if (step.assertions && step.assertions.length > 0) {
      assertionResults = await runAssertions(step.assertions, result.data, ctx);
    }

    // Run teardown if defined
    if (step.teardown) {
      await step.teardown(ctx);
    }

    // Determine final status
    let status: TestStatus = 'passed';
    if (!result.success) {
      status = 'failed';
    } else if (assertionResults && !allPassed(assertionResults)) {
      status = 'failed';
    }

    return {
      stepName: step.name,
      status,
      duration: Date.now() - startTime,
      assertions: assertionResults,
      metadata: {
        response: result.data,
        statusCode: result.statusCode,
        headers: result.headers,
      },
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      stepName: step.name,
      status: 'error',
      duration: Date.now() - startTime,
      error: error instanceof Error ? error : new Error(String(error)),
      timestamp: new Date(),
    };
  } finally {
    ctx.currentStep = undefined;
  }
}

// ============================================================================
// Test Script Execution
// ============================================================================

/**
 * Execute a test script
 */
export async function executeScript(
  script: TestScript,
  ctx: TestContext,
  options: ExecutionOptions
): Promise<SuiteResult> {
  const startTime = new Date();
  const results: TestResult[] = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  if (options.verbose) {
    console.log(`\n\x1b[1m[Suite: ${script.name}]\x1b[0m`);
  }

  try {
    // Run script setup
    if (script.setup) {
      await script.setup(ctx);
    }

    // Execute each step
    for (const step of script.steps) {
      if (options.verbose) {
        process.stdout.write(`  ${step.name}... `);
      }

      const result = await executeStep(step, ctx);
      results.push(result);
      ctx.results.push(result);

      // Update counters
      switch (result.status) {
        case 'passed':
          passed++;
          break;
        case 'failed':
        case 'error':
          failed++;
          break;
        case 'skipped':
          skipped++;
          break;
      }

      // Print result
      if (options.verbose) {
        const statusIcon =
          result.status === 'passed'
            ? '\x1b[32mPASS\x1b[0m'
            : result.status === 'skipped'
              ? '\x1b[33mSKIP\x1b[0m'
              : '\x1b[31mFAIL\x1b[0m';
        console.log(`${statusIcon} (${result.duration}ms)`);

        if (result.error && options.verbose) {
          console.log(
            `    \x1b[31mError: ${result.error instanceof Error ? result.error.message : result.error}\x1b[0m`
          );
        }
      }

      // Fail fast if enabled
      if (options.failFast && (result.status === 'failed' || result.status === 'error')) {
        if (options.verbose) {
          console.log('  \x1b[33mFail fast enabled, stopping suite\x1b[0m');
        }
        break;
      }
    }

    // Run script teardown
    if (script.teardown) {
      await script.teardown(ctx);
    }
  } catch (error) {
    if (options.verbose) {
      console.log(`  \x1b[31mSuite error: ${error}\x1b[0m`);
    }
  }

  const endTime = new Date();
  const status: TestStatus =
    failed > 0 ? 'failed' : skipped === results.length ? 'skipped' : 'passed';

  return {
    suiteName: script.name,
    category: script.category,
    persona: ctx.persona.id,
    status,
    results,
    duration: endTime.getTime() - startTime.getTime(),
    passed,
    failed,
    skipped,
    startTime,
    endTime,
  };
}

// ============================================================================
// Suite Execution
// ============================================================================

/**
 * Execute multiple test scripts
 */
export async function executeSuites(
  scripts: TestScript[],
  options: ExecutionOptions
): Promise<{
  suiteResults: SuiteResult[];
  scorecard: Scorecard;
}> {
  const persona = options.persona ? getPersona(options.persona) : getDefaultPersona();
  const ctx = createContext(options, persona);

  if (options.verbose) {
    console.log('\n\x1b[1m========================================\x1b[0m');
    console.log(`\x1b[1mMuscleMap Test Harness\x1b[0m`);
    console.log('\x1b[1m========================================\x1b[0m');
    console.log(`Environment: ${options.environment}`);
    console.log(`Persona: ${persona.name} (${persona.id})`);
    console.log(`Base URL: ${ctx.baseUrl}`);
    console.log(`Run ID: ${ctx.runId}`);
  }

  const suiteResults: SuiteResult[] = [];

  // Filter scripts by category if specified
  let filteredScripts = scripts;
  if (options.category) {
    filteredScripts = scripts.filter((s) => s.category === options.category);
  }
  if (options.suite) {
    filteredScripts = filteredScripts.filter((s) =>
      s.name.toLowerCase().includes(options.suite!.toLowerCase())
    );
  }

  // Execute scripts
  if (options.parallel) {
    // Parallel execution
    const results = await Promise.all(
      filteredScripts.map((script) => {
        const scriptCtx = createContext(options, persona);
        return executeScript(script, scriptCtx, options);
      })
    );
    suiteResults.push(...results);
  } else {
    // Sequential execution
    for (const script of filteredScripts) {
      const result = await executeScript(script, ctx, options);
      suiteResults.push(result);

      // Fail fast at suite level
      if (options.failFast && result.status === 'failed') {
        break;
      }
    }
  }

  // Generate scorecard
  const scorecard = generateScorecard(
    ctx.runId,
    options.environment,
    persona.id,
    suiteResults,
    ctx.startTime
  );

  if (options.verbose) {
    printScorecard(scorecard);
  }

  return { suiteResults, scorecard };
}

// ============================================================================
// Authentication Helper
// ============================================================================

/**
 * Authenticate a persona and update context
 */
export async function authenticatePersona(ctx: TestContext): Promise<boolean> {
  const { persona } = ctx;

  if (!persona.credentials) {
    console.error('Persona has no credentials');
    return false;
  }

  // Generate unique email for this run
  const testEmail = generateTestEmail(persona.id, ctx.runId);

  // Try to register or login
  const registerResult = await executeAction(
    httpAction('POST', '/auth/register', {
      body: {
        email: testEmail,
        password: persona.credentials.password,
        username: persona.name.replace(/\s+/g, '_'),
      },
      expectedStatus: [200, 201, 409], // 409 if user exists
    }),
    ctx
  );

  let token: string | undefined;
  let userId: string | undefined;

  if (registerResult.success && registerResult.statusCode !== 409) {
    token = extractToken(registerResult);
    userId = extractUserId(registerResult);
  } else {
    // Try login instead
    const loginResult = await executeAction(
      httpAction('POST', '/auth/login', {
        body: {
          email: testEmail,
          password: persona.credentials.password,
        },
        expectedStatus: [200],
      }),
      ctx
    );

    if (loginResult.success) {
      token = extractToken(loginResult);
      userId = extractUserId(loginResult);
    }
  }

  if (token) {
    setAuthToken(ctx, token, userId);
    return true;
  }

  return false;
}

// ============================================================================
// Script Loading
// ============================================================================

/**
 * Load test scripts from a directory
 */
export async function loadScripts(scriptsDir: string): Promise<TestScript[]> {
  const { readdir } = await import('fs/promises');
  const { join } = await import('path');

  const scripts: TestScript[] = [];

  try {
    const files = await readdir(scriptsDir);

    for (const file of files) {
      if (file.endsWith('.ts') || file.endsWith('.js')) {
        try {
          const scriptPath = join(scriptsDir, file);
          const module = await import(scriptPath);

          // Prefer default export if it exists
          if (module.default) {
            if (Array.isArray(module.default)) {
              scripts.push(...module.default);
            } else if (isTestScript(module.default)) {
              scripts.push(module.default);
            }
          } else {
            // Only check named exports if no default export
            for (const [key, value] of Object.entries(module)) {
              if (isTestScript(value)) {
                scripts.push(value as TestScript);
              }
            }
          }
        } catch (error) {
          console.error(`Failed to load script ${file}:`, error);
        }
      }
    }
  } catch {
    // Directory doesn't exist, return empty array
  }

  return scripts;
}

function isTestScript(value: unknown): value is TestScript {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    'category' in value &&
    'steps' in value &&
    Array.isArray((value as TestScript).steps)
  );
}

// ============================================================================
// Built-in Test Suites
// ============================================================================

/**
 * Core health check suite
 */
export const coreHealthSuite: TestScript = {
  name: 'Core Health Checks',
  description: 'Basic API health and connectivity tests',
  category: 'core',
  personas: ['active_andy'],
  steps: [
    {
      name: 'Health endpoint',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/health',
        expectedStatus: [200],
      },
      assertions: [
        { type: 'exists', path: 'data.status' },
      ],
    },
    {
      name: 'Ready endpoint',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/ready',
        expectedStatus: [200],
      },
    },
    {
      name: 'GraphQL introspection',
      action: 'graphql_query',
      params: {
        query: `
          query IntrospectionQuery {
            __schema {
              queryType { name }
            }
          }
        `,
      },
      assertions: [
        { type: 'exists', path: 'data.__schema' },
      ],
    },
  ],
};

/**
 * Authentication suite
 */
export const authSuite: TestScript = {
  name: 'Authentication Tests',
  description: 'Test auth flows including register, login, logout',
  category: 'auth',
  personas: ['nova_fresh'],
  steps: [
    {
      name: 'Register new user',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/auth/register',
        body: {
          email: 'test-${runId}@test.musclemap.me',
          password: 'TestPassword123!',
          username: 'testuser_${runId}',
        },
        expectedStatus: [200, 201],
      },
      assertions: [
        { type: 'exists', path: 'data.token', message: 'Should return token' },
      ],
    },
    {
      name: 'Login with credentials',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/auth/login',
        body: {
          email: 'test-${runId}@test.musclemap.me',
          password: 'TestPassword123!',
        },
        expectedStatus: [200],
      },
      assertions: [
        { type: 'exists', path: 'data.token' },
      ],
    },
    {
      name: 'Get current user',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/auth/me',
        expectedStatus: [200, 401],
      },
    },
  ],
};

/**
 * Export built-in suites
 */
export const builtInSuites: TestScript[] = [coreHealthSuite, authSuite];
