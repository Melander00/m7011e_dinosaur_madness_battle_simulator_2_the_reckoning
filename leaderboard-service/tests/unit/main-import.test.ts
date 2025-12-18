/**
 * Import Test for Main.ts
 * Simple import to ensure main.ts code is covered
 */

import { describe, test, expect, jest } from '@jest/globals';

// Mock all dependencies before importing main
jest.mock('../../src/db');
jest.mock('../../src/auth/keycloak');

// Create mock router
const express = require('express');
const mockRouter = express.Router();
jest.mock('../../src/routes/leaderboard', () => mockRouter);

// Set environment  
process.env.ENABLE_DEV_ENDPOINTS = 'true';

describe('Main.ts Import Coverage', () => {
  test('should export app', async () => {
    const { app } = await import('../../src/main');
    expect(app).toBeDefined();
    expect(typeof app).toBe('function'); // Express app is a function
  });
});
