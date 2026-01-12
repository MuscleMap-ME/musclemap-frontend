/**
 * MSW Server Setup
 *
 * This file sets up the Mock Service Worker for Node.js environments.
 * Useful for testing with Vitest/Jest.
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
