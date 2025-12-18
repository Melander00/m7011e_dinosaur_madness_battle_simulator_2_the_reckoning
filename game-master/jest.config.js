const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
};

// /** @type {import('ts-jest').JestConfigWithTsJest} */
// module.exports = {
//   preset: 'ts-jest',
//   testEnvironment: 'node',

//   // Include your source and test files
//   roots: ['<rootDir>/src', '<rootDir>/test'],

//   moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

//   // This tells Jest to transform @kubernetes/client-node as well
//   transformIgnorePatterns: [
//     "node_modules/(?!@kubernetes/client-node)"
//   ],
// };