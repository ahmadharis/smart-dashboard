import { defineConfig, devices } from '@playwright/test'
import { execSync } from 'child_process'

// Function to check if a browser is available
function isBrowserAvailable(browserName: string): boolean {
  try {
    execSync(`npx playwright install-deps ${browserName}`, { stdio: 'pipe' })
    execSync(`npx playwright install ${browserName}`, { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

// Function to check if a browser channel exists
function isBrowserChannelAvailable(channel: string): boolean {
  try {
    switch (channel) {
      case 'msedge':
        // Check for Microsoft Edge on macOS
        execSync('which "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"', { stdio: 'pipe' })
        return true
      case 'chrome':
        // Check for Google Chrome on macOS  
        execSync('which "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"', { stdio: 'pipe' })
        return true
      default:
        return false
    }
  } catch {
    return false
  }
}

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: './e2e',
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
  ],
  
  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: 'http://localhost:3000',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Record video on failure
    video: 'retain-on-failure',
  },

  // Configure projects for major browsers - only include available browsers
  projects: [
    // Core browsers (always available via Playwright)
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox', 
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile viewports (using core browsers)
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    // Optional branded browsers - only add if available
    ...(isBrowserChannelAvailable('msedge') ? [{
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' as const },
    }] : []),
    
    ...(isBrowserChannelAvailable('chrome') ? [{
      name: 'Google Chrome', 
      use: { ...devices['Desktop Chrome'], channel: 'chrome' as const },
    }] : []),
  ],

  // Global setup and teardown
  globalSetup: require.resolve('./e2e/global-setup.ts'),
  globalTeardown: require.resolve('./e2e/global-teardown.ts'),

  // Run your local dev server before starting the tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  
  // Test timeout
  timeout: 30 * 1000,
  
  // Expect timeout for assertions
  expect: {
    timeout: 10 * 1000,
  },
  
  // Output directory for test artifacts
  outputDir: 'test-results/',
})