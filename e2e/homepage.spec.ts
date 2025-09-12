import { test, expect } from '@playwright/test'
import { createTestHelpers } from './utils/test-helpers'

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the homepage before each test
    await page.goto('/')
  })

  test('should load homepage successfully', async ({ page }) => {
    const helpers = createTestHelpers(page)
    
    // Wait for page to load
    await helpers.navigation.waitForPageLoad()
    
    // Check that we're redirected to auth if not logged in
    // or shows tenant selector if logged in
    await expect(page).toHaveURL(/\/(auth\/login|$)/)
  })

  test('should show loading spinner initially', async ({ page }) => {
    // Check for loading spinner
    const loadingSpinner = page.locator('.animate-spin')
    await expect(loadingSpinner).toBeVisible()
  })

  test('should handle unauthenticated users', async ({ page }) => {
    const helpers = createTestHelpers(page)
    
    // Wait for navigation
    await helpers.navigation.waitForPageLoad()
    
    // Should redirect to login page
    await helpers.assertions.expectPageURL(/\/auth\/login/)
  })

  test('should show tenant selector for authenticated users', async ({ page }) => {
    const helpers = createTestHelpers(page)
    
    // Mock authentication (this would typically be done via a proper login flow)
    await page.addInitScript(() => {
      // Mock authenticated state
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: 'test-user', email: 'test@example.com' }
      }))
    })
    
    await page.goto('/')
    await helpers.navigation.waitForPageLoad()
    
    // Should show tenant selector instead of redirecting
    await expect(page.locator('[data-testid="tenant-selector"]')).toBeVisible()
  })

  test('should handle page errors gracefully', async ({ page }) => {
    // Intercept and mock a network error
    await page.route('/api/**', route => route.abort())
    
    await page.goto('/')
    
    // Should still show some content, not a blank page
    const body = await page.locator('body').textContent()
    expect(body).toBeTruthy()
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/')
    
    // Check that page elements are still visible and accessible
    const body = page.locator('body')
    await expect(body).toBeVisible()
    
    // Verify no horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1) // Allow for 1px tolerance
  })

  test('should have proper accessibility attributes', async ({ page }) => {
    await page.goto('/')
    
    // Check for basic accessibility
    const main = page.locator('main')
    if (await main.count() > 0) {
      await expect(main).toBeVisible()
    }
    
    // Check that focusable elements are accessible
    const focusableElements = page.locator('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])')
    const count = await focusableElements.count()
    
    if (count > 0) {
      for (let i = 0; i < Math.min(count, 5); i++) {
        const element = focusableElements.nth(i)
        await expect(element).toBeVisible()
      }
    }
  })

  test('should handle theme switching', async ({ page }) => {
    await page.goto('/')
    
    // Check if theme switcher exists
    const themeSwitcher = page.locator('[data-testid="theme-switcher"]')
    
    if (await themeSwitcher.count() > 0) {
      // Test theme switching
      await themeSwitcher.click()
      
      // Check if dark mode class is applied
      const htmlElement = page.locator('html')
      const classes = await htmlElement.getAttribute('class')
      
      expect(classes).toContain('dark')
    }
  })
})

test.describe('Homepage SEO and Meta Tags', () => {
  test('should have proper meta tags', async ({ page }) => {
    await page.goto('/')
    
    // Check title
    await expect(page).toHaveTitle(/Smart Dashboard/)
    
    // Check meta description
    const metaDescription = page.locator('meta[name="description"]')
    if (await metaDescription.count() > 0) {
      const content = await metaDescription.getAttribute('content')
      expect(content).toBeTruthy()
    }
    
    // Check viewport meta tag
    const viewport = page.locator('meta[name="viewport"]')
    await expect(viewport).toBeAttached()
  })

  test('should have proper Open Graph tags', async ({ page }) => {
    await page.goto('/')
    
    // Check for basic OG tags
    const ogTitle = page.locator('meta[property="og:title"]')
    const ogDescription = page.locator('meta[property="og:description"]')
    
    if (await ogTitle.count() > 0) {
      const title = await ogTitle.getAttribute('content')
      expect(title).toBeTruthy()
    }
    
    if (await ogDescription.count() > 0) {
      const description = await ogDescription.getAttribute('content')
      expect(description).toBeTruthy()
    }
  })
})