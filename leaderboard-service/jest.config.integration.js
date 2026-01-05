/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/integration'],
  testMatch: ['**/tests/integration/**/*.test.ts'],
  
  // Coverage not needed for integration tests (they test SQL, not code paths)
  collectCoverage: false,
  
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
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
};
