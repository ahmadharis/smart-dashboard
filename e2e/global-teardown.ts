async function globalTeardown() {
  console.log('🧹 Starting E2E test global teardown...')
  
  // Clean up any global resources here
  // For example, clear test data, close connections, etc.
  
  console.log('✅ E2E test global teardown completed')
}

export default globalTeardown