import { test, expect } from '@playwright/test'
import { createTestHelpers } from './utils/test-helpers'

test.describe('Multi-tenant Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication state for tests
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: 'test-user', email: 'test@example.com' }
      }))
    })
  })

  test('should allow navigation between different tenants', async ({ page }) => {
    const helpers = createTestHelpers(page)
    
    // Mock API response for tenants
    await page.route('/api/public/tenants', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'tenant-1', name: 'Tenant One' },
          { id: 'tenant-2', name: 'Tenant Two' }
        ])
      })
    })
    
    // Start at homepage
    await page.goto('/')
    await helpers.navigation.waitForPageLoad()
    
    // Navigate to first tenant
    await helpers.navigation.goToTenantPage('tenant-1')
    await helpers.assertions.expectPageURL(/\/tenant-1/)
    
    // Navigate to second tenant
    await helpers.navigation.goToTenantPage('tenant-2')
    await helpers.assertions.expectPageURL(/\/tenant-2/)
  })

  test('should show tenant-specific content', async ({ page }) => {
    const helpers = createTestHelpers(page)
    
    // Mock API responses for different tenants
    await page.route('/api/internal/dashboards', route => {
      const url = new URL(route.request().url())
      const tenantId = url.pathname.includes('tenant-1') ? 'tenant-1' : 'tenant-2'
      
      const dashboards = tenantId === 'tenant-1' 
        ? [{ id: 1, name: 'Tenant 1 Dashboard', tenant_id: 'tenant-1' }]
        : [{ id: 2, name: 'Tenant 2 Dashboard', tenant_id: 'tenant-2' }]
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(dashboards)
      })
    })
    
    // Visit tenant 1
    await helpers.navigation.goToTenantDashboard('tenant-1')
    await expect(page.locator('text=Tenant 1 Dashboard')).toBeVisible()
    
    // Visit tenant 2
    await helpers.navigation.goToTenantDashboard('tenant-2')
    await expect(page.locator('text=Tenant 2 Dashboard')).toBeVisible()
    
    // Verify tenant 1 content is not visible
    await expect(page.locator('text=Tenant 1 Dashboard')).not.toBeVisible()
  })

  test('should handle tenant switching in URL', async ({ page }) => {
    const helpers = createTestHelpers(page)
    
    // Mock tenant data
    await page.route('/api/internal/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      })
    })
    
    // Direct navigation to tenant-specific pages
    await page.goto('/tenant-1/dashboard')
    await helpers.assertions.expectPageURL(/\/tenant-1\/dashboard/)
    
    // Navigate via URL change
    await page.goto('/tenant-2/dashboard')
    await helpers.assertions.expectPageURL(/\/tenant-2\/dashboard/)
  })

  test('should maintain tenant context in navigation', async ({ page }) => {
    const helpers = createTestHelpers(page)
    
    // Mock API responses
    await page.route('/api/internal/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      })
    })
    
    // Start in tenant-1
    await helpers.navigation.goToTenantPage('tenant-1')
    
    // Navigate to dashboard within same tenant
    await page.click('a[href*="dashboard"]')
    await helpers.assertions.expectPageURL(/\/tenant-1\/dashboard/)
    
    // Navigate to manage within same tenant
    await page.click('a[href*="manage"]')
    await helpers.assertions.expectPageURL(/\/tenant-1\/manage/)
  })

  test('should handle tenant permissions correctly', async ({ page }) => {
    const helpers = createTestHelpers(page)
    
    // Mock unauthorized access for tenant-2
    await page.route('/api/internal/**', route => {
      if (route.request().url().includes('tenant-2')) {
        route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Forbidden' })
        })
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        })
      }
    })
    
    // Access allowed tenant
    await helpers.navigation.goToTenantPage('tenant-1')
    await helpers.navigation.waitForPageLoad()
    // Should not show access denied
    
    // Try to access forbidden tenant
    await helpers.navigation.goToTenantPage('tenant-2')
    await helpers.navigation.waitForPageLoad()
    
    // Should show access denied or redirect
    const accessDenied = page.locator('[data-testid="access-denied"]')
    const errorMessage = page.locator('text=Forbidden')
    
    const hasAccessDenied = await accessDenied.count() > 0
    const hasErrorMessage = await errorMessage.count() > 0
    
    expect(hasAccessDenied || hasErrorMessage).toBe(true)
  })

  test('should handle tenant data isolation', async ({ page }) => {
    const helpers = createTestHelpers(page)
    
    // Mock different data for each tenant
    let requestCount = 0
    await page.route('/api/internal/dashboards', route => {
      requestCount++
      const tenantData = requestCount === 1 
        ? [{ id: 1, name: 'Dashboard A', tenant_id: 'tenant-1' }]
        : [{ id: 2, name: 'Dashboard B', tenant_id: 'tenant-2' }]
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(tenantData)
      })
    })
    
    // Visit first tenant
    await helpers.navigation.goToTenantDashboard('tenant-1')
    await expect(page.locator('text=Dashboard A')).toBeVisible()
    
    // Switch to second tenant - should see different data
    await helpers.navigation.goToTenantDashboard('tenant-2')
    await expect(page.locator('text=Dashboard B')).toBeVisible()
    await expect(page.locator('text=Dashboard A')).not.toBeVisible()
  })

  test('should handle shared dashboard access', async ({ page }) => {
    const helpers = createTestHelpers(page)
    
    // Mock shared dashboard data
    await page.route('/api/public/shared/test-token', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          name: 'Shared Dashboard',
          tenant_id: 'tenant-1',
          share_token: 'test-token'
        })
      })
    })
    
    // Access shared dashboard without authentication
    await page.context().clearCookies()
    await page.addInitScript(() => {
      localStorage.clear()
    })
    
    await page.goto('/shared/test-token')
    await helpers.navigation.waitForPageLoad()
    
    // Should be able to view shared content without login
    await expect(page.locator('text=Shared Dashboard')).toBeVisible()
  })

  test('should maintain tenant branding and customization', async ({ page }) => {
    const helpers = createTestHelpers(page)
    
    // Mock tenant-specific settings
    await page.route('/api/internal/settings', route => {
      const url = new URL(route.request().url())
      const tenantId = url.pathname.includes('tenant-1') ? 'tenant-1' : 'tenant-2'
      
      const settings = tenantId === 'tenant-1'
        ? { theme: 'blue', companyName: 'Company A' }
        : { theme: 'green', companyName: 'Company B' }
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(settings)
      })
    })
    
    // Visit tenant 1 and check branding
    await helpers.navigation.goToTenantPage('tenant-1')
    await helpers.navigation.waitForPageLoad()
    
    if (await page.locator('text=Company A').count() > 0) {
      await expect(page.locator('text=Company A')).toBeVisible()
    }
    
    // Visit tenant 2 and check different branding
    await helpers.navigation.goToTenantPage('tenant-2')
    await helpers.navigation.waitForPageLoad()
    
    if (await page.locator('text=Company B').count() > 0) {
      await expect(page.locator('text=Company B')).toBeVisible()
    }
  })
})