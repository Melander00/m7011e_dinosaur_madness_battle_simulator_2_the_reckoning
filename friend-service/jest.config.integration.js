/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/integration'],
  testMatch: ['**/tests/integration/**/*.test.ts'],
  
  // Coverage configuration for integration tests
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/generated/**',
  ],
  coverageDirectory: 'coverage/integration',
  coverageReporters: ['text', 'lcov', 'html'],
  
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Setup file for integration tests
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.ts'],
  
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json',
      },
    ],
  },
  
  // Integration tests are slower - increase timeout
  testTimeout: 60000, // 60 seconds for container startup
  
  // Run tests serially to avoid container conflicts
  maxWorkers: 1,
  
  verbose: true,
  
  // Display individual test results
  displayName: {
    name: 'INTEGRATION',
    color: 'blue',
  },
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
};