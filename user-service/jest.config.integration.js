module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/integration/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.test.json" }],
  },
  testTimeout: 60_000,
  collectCoverage: false,
};
