# End-to-End Testing Suite

## Overview

This directory contains comprehensive end-to-end (E2E) tests for the Akashic Core platform, covering both GraphQL API operations and CLI commands.

## Test Structure

### Core Test Files

- `entity-types.e2e-spec.ts` - Tests for EntityType CRUD operations
- `entities.e2e-spec.ts` - Tests for Entity CRUD operations and queries
- `relations.e2e-spec.ts` - Tests for Relation operations (partially implemented)
- `cli.e2e-spec.ts` - Tests for CLI commands
- `app.e2e-spec.ts` - Basic application setup tests

### Support Files

- `helpers/test-helpers.ts` - Utility functions for test setup and GraphQL requests
- `fixtures/test-data.ts` - Test data definitions and fixtures

## Running Tests

### Run All Tests (Unit + E2E)
```bash
npm run test:all
```

### Run E2E Tests Only
```bash
npm run test:e2e
```

### Run E2E Tests with Watch Mode
```bash
npm run test:e2e:watch
```

### Run E2E Tests with Coverage
```bash
npm run test:e2e:coverage
```

### Run Specific E2E Test Files
```bash
npm run test:e2e -- entity-types.e2e-spec.ts
```

## Test Coverage

### Fully Implemented
- ✅ EntityType CRUD operations
- ✅ Entity creation and queries
- ✅ GraphQL schema validation
- ✅ Data type validation

### Partially Implemented
- ⚠️ Relations (missing RelationType mutations in API)
- ⚠️ Entity deletion (no deleteEntity mutation in API)
- ⚠️ CLI commands (basic coverage)

### Not Yet Implemented
- ❌ Process system tests
- ❌ Event system tests
- ❌ WebSocket/real-time tests
- ❌ Performance tests

## Known Issues

1. **Entity Cleanup**: No deleteEntity mutation exists, so entities can't be cleaned up after tests
2. **RelationType API**: Some relation type operations are not fully implemented
3. **Async Cleanup**: Some tests may leave async operations running (use `--detectOpenHandles` to debug)

## Writing New Tests

### Test Structure Example
```typescript
describe('Feature (E2E)', () => {
  let testHelper: TestHelper;
  
  beforeAll(async () => {
    testHelper = new TestHelper();
    await testHelper.setupTestApp();
  });
  
  afterAll(async () => {
    await testHelper.teardownTestApp();
  });
  
  it('should perform operation', async () => {
    const result = await testHelper.graphqlMutation(mutation, variables);
    expect(result).toBeDefined();
  });
});
```

### Best Practices

1. **Isolation**: Each test suite should set up and tear down its own test data
2. **Unique Names**: Use `generateTestId()` to create unique names and avoid conflicts
3. **Error Handling**: Wrap cleanup operations in try-catch blocks
4. **Assertions**: Test both success and failure cases
5. **Data Validation**: Verify both structure and content of responses

## CI/CD Integration

The E2E tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run E2E Tests
  run: |
    npm run db:migrate
    npm run seed
    npm run test:e2e
```

## Debugging

### Enable Verbose Output
```bash
npm run test:e2e:verbose
```

### Detect Open Handles
```bash
npm run test:e2e -- --detectOpenHandles
```

### Run Single Test
```bash
npm run test:e2e -- -t "should create a new entity type"
```