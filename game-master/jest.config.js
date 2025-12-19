const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg
  },
  preset: "ts-jest",
collectCoverage: true,
  collectCoverageFrom: [
    "src/**/*.ts",        // include all JS files in src
    "!src/**/*.test.js",  // exclude test files
  ],
  coverageDirectory: "coverage",
};