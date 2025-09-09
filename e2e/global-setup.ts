import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test global setup...')
  
  // Start browser for authentication if needed
  const browser = await chromium.launch()
  const page = await browser.newPage()
  
  try {
    // Check if the app is running
    const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000'
    console.log(`📍 Checking if app is running at ${baseURL}`)
    
    await page.goto(`${baseURL}/api/health`, { timeout: 30000 })
    const response = await page.textContent('pre')
    
    if (response?.includes('ok')) {
      console.log('✅ Application is running and healthy')
    } else {
      console.warn('⚠️ Application health check returned unexpected response')
    }
    
    // Perform any global authentication setup here if needed
    // For example, login and save authentication state
    
  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  } finally {
    await browser.close()
  }
  
  console.log('✅ E2E test global setup completed')
}

export default globalSetup