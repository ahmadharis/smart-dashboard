# Testing Technical Guide

This document provides technical implementation details for developers writing tests.

> **Status**: See `CLAUDE.md` for current testing status and Phase 1/2 breakdown.

## Overview

Technical implementation covers:
- Test framework configuration (Jest, Playwright, MSW)
- How to write different types of tests
- Mocking strategies and best practices
- Troubleshooting common issues

## Technology Stack

| Tool | Purpose | Version |
|------|---------|---------|
| Jest | Unit & Integration Test Framework | ^29.7.0 |
| React Testing Library | Component Testing | ^16.1.0 |
| Playwright | E2E Testing | ^1.50.0 |
| MSW | API Mocking | ^2.6.8 |
| @testing-library/jest-dom | Custom Matchers | ^6.6.3 |

## Project Structure

```
├── __tests__/
│   ├── unit/
│   │   └── components/
│   │       └── ui/
│   │           └── button.test.tsx
│   ├── integration/
│   │   └── api/
│   │       └── dashboards.test.ts
│   └── utils/
│       └── test-utils.tsx
├── e2e/
│   ├── fixtures/
│   │   └── test-data.json
│   ├── utils/
│   │   └── test-helpers.ts
│   ├── global-setup.ts
│   ├── global-teardown.ts
│   ├── homepage.spec.ts
│   └── multi-tenant.spec.ts
├── src/
│   └── mocks/
│       ├── handlers.ts
│       ├── server.ts
│       └── browser.ts
├── jest.config.js
├── jest.setup.js
└── playwright.config.ts
```

## Available Commands

### Unit & Integration Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests  
npm run test:integration
```


### E2E Tests
```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in headed mode
npm run test:e2e:headed

# Run all tests (unit + integration + E2E)
npm run test:all
```

## Writing Tests

### Unit Tests

Unit tests are located in `__tests__/unit/` and follow the pattern `*.test.tsx` or `*.test.ts`.

```typescript
import { render, screen } from '@/__tests__/utils/test-utils'
import { Button } from '@/components/ui/button'

describe('Button Component', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })
})
```

### Integration Tests

Integration tests are located in `__tests__/integration/` and test API routes and complex interactions.

```typescript
/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/internal/dashboards/route'

describe('API Route', () => {
  it('returns data successfully', async () => {
    const request = new NextRequest('http://localhost:3000/api/internal/dashboards')
    const response = await GET(request)
    expect(response.status).toBe(200)
  })
})
```

### E2E Tests

E2E tests are located in `e2e/` and follow the pattern `*.spec.ts`.

```typescript
import { test, expect } from '@playwright/test'

test('homepage loads correctly', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Smart Dashboard/)
})
```

## Mocking Strategy

### API Mocking with MSW

MSW (Mock Service Worker) is used to mock API calls in tests. Handlers are defined in `src/mocks/handlers.ts`:

```typescript
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/internal/dashboards', () => {
    return HttpResponse.json([
      { id: 1, name: 'Test Dashboard' }
    ])
  })
]
```

### Database Mocking

**Database Testing**: All database calls are mocked using Jest mocks and MSW handlers. Database-dependent tests use `describe.skip()` during Phase 1.

### Authentication Mocking

Authentication is mocked in `jest.setup.js` to provide consistent test environments:

```javascript
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: 'test-user' } } }
      })
    }
  })
}))
```

## Multi-tenant Testing

Special consideration is given to multi-tenant functionality:

1. **Tenant Isolation**: Tests verify that data is properly isolated between tenants
2. **Tenant Switching**: Tests verify correct behavior when switching between tenants
3. **Shared Resources**: Tests verify shared dashboard functionality

## Test Utilities

### Custom Render Function

Located in `__tests__/utils/test-utils.tsx`, provides:
- Wrapped providers (Theme, etc.)
- Mock data factories
- Common testing utilities

### E2E Helper Classes

Located in `e2e/utils/test-helpers.ts`, provides:
- Navigation helpers
- Authentication helpers
- Dashboard helpers
- Assertion helpers
- Tenant helpers

## Configuration

### Jest Configuration

- Environment: jsdom for components, node for API tests
- Setup file: `jest.setup.js` with global mocks
- Coverage thresholds: 70% for all metrics
- Module mapping for absolute imports

### Playwright Configuration

- Browsers: Chromium, Firefox, WebKit
- Base URL: http://localhost:3000
- Global setup/teardown scripts
- Test artifacts: screenshots, videos, traces
- Parallel execution support

## Best Practices

### Test Structure (AAA Pattern)

All tests follow the Arrange-Act-Assert pattern:

```typescript
it('should do something', () => {
  // Arrange
  const mockData = createMockDashboard()
  
  // Act
  const result = processData(mockData)
  
  // Assert
  expect(result).toBe(expectedValue)
})
```

### Test Naming

- Descriptive test names that explain the behavior
- Use "should" or "returns" to describe expected behavior
- Group related tests in describe blocks

### Mocking Guidelines

- Mock external dependencies
- Use MSW for API calls
- Mock browser APIs (localStorage, etc.) in setup
- Keep mocks close to tests when possible

### Coverage Guidelines

- Aim for 70%+ coverage across all metrics
- Focus on testing behavior, not implementation
- Test error scenarios and edge cases

## Troubleshooting

### Common Issues

1. **MSW not working**: Ensure handlers are properly set up and server is started
2. **Window not defined**: Check test environment (jsdom vs node)
3. **Module not found**: Check Jest module mapping configuration
4. **Playwright browser not found**: Run `npx playwright install`

### Debug Commands

```bash
# Debug Jest tests
npm test -- --detectOpenHandles --forceExit

# Debug Playwright tests
npm run test:e2e -- --debug

# Run specific test file
npm test -- path/to/test.test.ts
```

## Continuous Integration

The testing setup is designed to work in CI environments:

- Deterministic tests with proper cleanup
- Browser installation handled automatically
- Coverage reports generated
- Parallel execution support
- Proper timeout handling

## Phase 2 Implementation Guide

### Database Integration Testing
When ready for Phase 2:
1. Remove `.skip` from database test suites in `__tests__/unit/lib/data-utils.test.ts`
2. Set up test database with proper tenant isolation
3. Configure test authentication with Supabase
4. Add multi-tenant data separation tests

### Additional Testing Opportunities
- Visual regression testing with Playwright
- Performance testing and load testing
- Accessibility testing with axe-core  
- Contract testing for API routes

For more information, see the individual configuration files and test examples in the codebase.