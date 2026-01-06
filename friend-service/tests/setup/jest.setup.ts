/**
 * Global Jest Setup
 * Runs before all tests to configure the testing environment
 */

import { describe, test, expect, jest, beforeEach, beforeAll, afterAll } from '@jest/globals';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3005';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.KEYCLOAK_URL = 'https://keycloak.test.local';
process.env.KEYCLOAK_REALM = 'test-realm';
process.env.RABBITMQ_URL = 'amqp://test:test@localhost:5672';

// Increase timeout for tests that might be slower
jest.setTimeout(10000);

// Global beforeAll - runs once before all test suites
beforeAll(() => {
  // Suppress console.log during tests (optional - uncomment if needed)
  // jest.spyOn(console, 'log').mockImplementation(() => {});
  // jest.spyOn(console, 'error').mockImplementation(() => {});
});

// Global afterAll - runs once after all test suites
afterAll(() => {
  // Restore console
  jest.restoreAllMocks();
});

// Extend expect with custom matchers if needed
expect.extend({
  toBeUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    return {
      message: () =>
        pass
          ? `expected ${received} not to be a valid UUID`
          : `expected ${received} to be a valid UUID`,
      pass,
    };
  },
});

// Export to make this a module
export {};