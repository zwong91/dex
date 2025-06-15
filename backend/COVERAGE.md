# Coverage Configuration

## Overview
This project uses Vitest with V8 coverage provider for comprehensive test coverage reporting.

## Coverage Scripts

### Basic Coverage
```bash
# Run all tests with coverage
npm run test:coverage

# Run unit tests with coverage
npm run test:coverage:unit

# Watch mode with coverage
npm run test:coverage:watch
```

### Coverage Reports
The coverage reports are generated in multiple formats:
- **Text**: Console output during test runs
- **HTML**: Interactive web interface (`./coverage/index.html`)
- **LCOV**: For CI/CD integration (`./coverage/lcov.info`)
- **JSON**: Machine-readable format (`./coverage/coverage-final.json`)

### Opening Coverage Report
```bash
# Open HTML coverage report in browser
npm run coverage:open
```

## Coverage Thresholds

The project enforces the following minimum coverage thresholds:
- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 70%
- **Statements**: 80%

## What's Covered

### Included in Coverage
- All source files in `src/` directory
- TypeScript and JavaScript files (`.ts`, `.js`)

### Excluded from Coverage
- Node modules (`node_modules/`)
- Build output (`dist/`)
- Test files (`test/`)
- Type definitions (`**/*.d.ts`)
- Configuration files (`**/*.config.{ts,js}`)
- Wrangler configuration files (`**/wrangler.*.toml`)

## Coverage with Test Script

You can also run the comprehensive test suite with coverage:

```bash
# Run full test suite with coverage
./run-tests.sh --coverage

# View help for test script
./run-tests.sh --help
```

## CI/CD Integration

The LCOV report format is compatible with most CI/CD platforms and coverage services like:
- GitHub Actions
- Codecov
- Coveralls
- SonarQube

Example for GitHub Actions:
```yaml
- name: Run tests with coverage
  run: npm run test:coverage

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```
