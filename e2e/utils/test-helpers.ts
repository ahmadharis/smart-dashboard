import { Page, expect } from '@playwright/test'

/**
 * E2E Test Helper Functions for Smart Dashboard
 */

// Navigation helpers
export class NavigationHelpers {
  constructor(private page: Page) {}

  async goToHomePage() {
    await this.page.goto('/')
  }

  async goToTenantPage(tenantId: string) {
    await this.page.goto(`/${tenantId}`)
  }

  async goToTenantDashboard(tenantId: string) {
    await this.page.goto(`/${tenantId}/dashboard`)
  }

  async goToTenantManage(tenantId: string) {
    await this.page.goto(`/${tenantId}/manage`)
  }

  async goToAuth(page: 'login' | 'sign-up') {
    await this.page.goto(`/auth/${page}`)
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle')
  }
}

// Authentication helpers
export class AuthHelpers {
  constructor(private page: Page) {}

  async login(email: string = 'test@example.com', password: string = 'password123') {
    await this.page.goto('/auth/login')
    await this.page.fill('input[name="email"]', email)
    await this.page.fill('input[name="password"]', password)
    await this.page.click('button[type="submit"]')
    await this.page.waitForLoadState('networkidle')
  }

  async logout() {
    await this.page.click('[data-testid="user-menu"]')
    await this.page.click('[data-testid="logout-button"]')
    await this.page.waitForURL('/auth/login')
  }

  async signUp(email: string = 'newuser@example.com', password: string = 'password123') {
    await this.page.goto('/auth/sign-up')
    await this.page.fill('input[name="email"]', email)
    await this.page.fill('input[name="password"]', password)
    await this.page.fill('input[name="confirmPassword"]', password)
    await this.page.click('button[type="submit"]')
    await this.page.waitForLoadState('networkidle')
  }
}

// Dashboard helpers
export class DashboardHelpers {
  constructor(private page: Page) {}

  async createDashboard(name: string, description?: string) {
    await this.page.click('[data-testid="create-dashboard-button"]')
    await this.page.fill('input[name="name"]', name)
    if (description) {
      await this.page.fill('textarea[name="description"]', description)
    }
    await this.page.click('button[type="submit"]')
    await this.page.waitForLoadState('networkidle')
  }

  async deleteDashboard(dashboardName: string) {
    const dashboardRow = this.page.locator(`[data-testid="dashboard-row"]:has-text("${dashboardName}")`)
    await dashboardRow.locator('[data-testid="delete-button"]').click()
    await this.page.click('[data-testid="confirm-delete"]')
    await this.page.waitForLoadState('networkidle')
  }

  async editDashboard(oldName: string, newName: string) {
    const dashboardRow = this.page.locator(`[data-testid="dashboard-row"]:has-text("${oldName}")`)
    await dashboardRow.locator('[data-testid="edit-button"]').click()
    await this.page.fill('input[name="name"]', newName)
    await this.page.click('button[type="submit"]')
    await this.page.waitForLoadState('networkidle')
  }

  async verifyDashboardExists(name: string) {
    await expect(this.page.locator(`text=${name}`)).toBeVisible()
  }

  async verifyDashboardNotExists(name: string) {
    await expect(this.page.locator(`text=${name}`)).not.toBeVisible()
  }
}

// Data file helpers
export class DataFileHelpers {
  constructor(private page: Page) {}

  async uploadDataFile(filePath: string, fileName?: string) {
    await this.page.setInputFiles('input[type="file"]', filePath)
    if (fileName) {
      await this.page.fill('input[name="fileName"]', fileName)
    }
    await this.page.click('[data-testid="upload-button"]')
    await this.page.waitForLoadState('networkidle')
  }

  async deleteDataFile(fileName: string) {
    const fileRow = this.page.locator(`[data-testid="file-row"]:has-text("${fileName}")`)
    await fileRow.locator('[data-testid="delete-button"]').click()
    await this.page.click('[data-testid="confirm-delete"]')
    await this.page.waitForLoadState('networkidle')
  }

  async verifyFileExists(fileName: string) {
    await expect(this.page.locator(`text=${fileName}`)).toBeVisible()
  }
}

// Assertion helpers
export class AssertionHelpers {
  constructor(private page: Page) {}

  async expectPageTitle(title: string) {
    await expect(this.page).toHaveTitle(title)
  }

  async expectPageURL(url: string | RegExp) {
    await expect(this.page).toHaveURL(url)
  }

  async expectElementVisible(selector: string) {
    await expect(this.page.locator(selector)).toBeVisible()
  }

  async expectElementHidden(selector: string) {
    await expect(this.page.locator(selector)).toBeHidden()
  }

  async expectTextContent(selector: string, text: string) {
    await expect(this.page.locator(selector)).toContainText(text)
  }

  async expectSuccessMessage() {
    await expect(this.page.locator('[data-testid="success-message"]')).toBeVisible()
  }

  async expectErrorMessage() {
    await expect(this.page.locator('[data-testid="error-message"]')).toBeVisible()
  }
}

// Multi-tenant helpers
export class TenantHelpers {
  constructor(private page: Page) {}

  async switchTenant(tenantId: string) {
    await this.page.click('[data-testid="tenant-switcher"]')
    await this.page.click(`[data-testid="tenant-option"][data-value="${tenantId}"]`)
    await this.page.waitForLoadState('networkidle')
  }

  async verifyCurrentTenant(tenantName: string) {
    await expect(this.page.locator('[data-testid="current-tenant"]')).toContainText(tenantName)
  }

  async createTenant(name: string) {
    await this.page.click('[data-testid="create-tenant-button"]')
    await this.page.fill('input[name="name"]', name)
    await this.page.click('button[type="submit"]')
    await this.page.waitForLoadState('networkidle')
  }
}

// Test data cleanup
export class CleanupHelpers {
  constructor(private page: Page) {}

  async cleanupTestData() {
    // Clean up any test data created during E2E tests
    // This would typically involve API calls to delete test data
    console.log('Cleaning up test data...')
  }

  async resetDatabase() {
    // Reset database to clean state if needed
    console.log('Resetting database state...')
  }
}

// Factory function to create all helpers for a page
export function createTestHelpers(page: Page) {
  return {
    navigation: new NavigationHelpers(page),
    auth: new AuthHelpers(page),
    dashboard: new DashboardHelpers(page),
    dataFile: new DataFileHelpers(page),
    assertions: new AssertionHelpers(page),
    tenant: new TenantHelpers(page),
    cleanup: new CleanupHelpers(page),
  }
}