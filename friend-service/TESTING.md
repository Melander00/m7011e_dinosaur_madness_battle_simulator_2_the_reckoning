# Testing Guide for Friend Service

This document explains how to run tests and generate code coverage reports for the friend-service.

## Prerequisites

- Node.js 18+
- Docker (required for integration tests)

Install dependencies:
```bash
npm install
```

## Running Tests

### Unit Tests

Unit tests use mocks and don't require external services.

```bash
# Run unit tests with coverage report
npm run test:unit

# Run unit tests in watch mode (re-runs on file changes)
npm run test:watch
```

### Integration Tests

Integration tests use [Testcontainers](https://testcontainers.com/) to spin up a real PostgreSQL database in Docker. **Docker must be running.**

```bash
# Run integration tests
npm run test:integration

# Run integration tests with coverage report
npm run test:integration:coverage
```

### All Tests

```bash
# Run both unit and integration tests
npm run test:all
```

## Code Coverage Reports

Coverage reports are generated automatically when using the coverage commands:

| Command | Coverage Report Location |
|---------|-------------------------|
| `npm run test:unit` | `coverage/` |
| `npm run test:integration:coverage` | `coverage/integration/` |

### Viewing Coverage Reports

After running tests with coverage, open the HTML report in your browser:

- **Unit tests:** `coverage/lcov-report/index.html`
- **Integration tests:** `coverage/integration/lcov-report/index.html`

### Coverage Metrics Explained

| Metric | Description |
|--------|-------------|
| **Statements** | Percentage of code statements executed |
| **Branches** | Percentage of conditional branches (if/else, ternary) tested |
| **Functions** | Percentage of functions called |
| **Lines** | Percentage of lines executed |

## Test Structure

```
tests/
├── setup/
│   └── jest.setup.ts       # Common test setup
├── helpers/
│   ├── auth.helpers.ts     # Authentication test utilities
│   └── db.helpers.ts       # Database test utilities
├── unit/                   # Unit tests (mocked dependencies)
│   ├── db.test.ts
│   ├── server.test.ts
│   ├── keycloak.test.ts
│   ├── rabbitmq.test.ts
│   ├── friendships.routes.test.ts
│   └── requests.routes.test.ts
└── integration/            # Integration tests (real database)
    ├── setup.ts            # Testcontainers setup
    ├── friendships.integration.test.ts
    └── requests.integration.test.ts
```

## Troubleshooting

### Integration tests fail to start

Make sure Docker is running:
```bash
docker info
```

### "PostgreSQL pool error" messages

These appear when the test container stops while connections are still open. They're harmless and don't affect test results.

### Tests timeout

Integration tests have a 60-second timeout for container startup. If tests timeout:
1. Check Docker is running
2. Check available disk space
3. Try running with `--runInBand` flag for sequential execution
