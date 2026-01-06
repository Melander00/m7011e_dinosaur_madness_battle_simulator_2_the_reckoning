module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/unit/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.test.json" }],
  },
  collectCoverage: true,
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    // Focus coverage on business logic (routes + repos). Auth/metrics/DB wiring are tested elsewhere.
    "src/routes/**/*.ts",
    "src/repositories/**/*.ts",
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  }
};
