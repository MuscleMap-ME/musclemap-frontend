/**
 * MSW Browser Worker Setup
 *
 * This file sets up the Mock Service Worker for browser environments.
 * It intercepts GraphQL requests and returns mock data for development.
 */

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
