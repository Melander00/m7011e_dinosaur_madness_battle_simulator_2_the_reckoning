// Global test setup
// This file runs before all tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3005';

// Increase timeout for tests that might be slower
jest.setTimeout(10000);
