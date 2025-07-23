/**
 * Test cache key generation for user-specific routes
 * Run with: tsx test-cache-keys.ts
 */

import { extractUserFromPath, validateUserAccess } from '../src/middleware/cache'

// Mock context for testing
const createMockContext = (userAddress?: string, path?: string) => ({
	get: (key: string) => key === 'userAddress' ? userAddress : undefined,
	req: { path: path || '/test' }
} as any)

// Test cases for user extraction
const testUserExtraction = () => {
	console.log('🧪 Testing user address extraction from paths...\n')
	
	const testCases = [
		{
			path: '/user/bin-ids/0x1234567890123456789012345678901234567890/bsc/pool123',
			expected: '0x1234567890123456789012345678901234567890'
		},
		{
			path: '/user/pool-ids/0xAbCdEf1234567890123456789012345678901234/bsc',
			expected: '0xabcdef1234567890123456789012345678901234'
		},
		{
			path: '/user/fees-earned/bsc/0x1111111111111111111111111111111111111111/pool456',
			expected: '0x1111111111111111111111111111111111111111'
		},
		{
			path: '/user/0x2222222222222222222222222222222222222222/rewards',
			expected: '0x2222222222222222222222222222222222222222'
		},
		{
			path: '/user-lifetime-stats/bsc/users/0x3333333333333333333333333333333333333333/swap-stats',
			expected: '0x3333333333333333333333333333333333333333'
		},
		{
			path: '/pools/bsc',
			expected: null
		}
	]
	
	testCases.forEach(({ path, expected }, index) => {
		const result = extractUserFromPath(path)
		const status = result === expected ? '✅' : '❌'
		console.log(`${status} Test ${index + 1}: ${path}`)
		console.log(`   Expected: ${expected}`)
		console.log(`   Got:      ${result}`)
		console.log()
	})
}

// Test cases for access validation
const testAccessValidation = () => {
	console.log('🔐 Testing user access validation...\n')
	
	const testCases = [
		{
			name: 'User accessing own data',
			authUser: '0x1234567890123456789012345678901234567890',
			path: '/user/bin-ids/0x1234567890123456789012345678901234567890/bsc/pool123',
			expected: true
		},
		{
			name: 'User accessing other user data',
			authUser: '0x1234567890123456789012345678901234567890',
			path: '/user/bin-ids/0x9999999999999999999999999999999999999999/bsc/pool123',
			expected: false
		},
		{
			name: 'Case insensitive matching',
			authUser: '0x1234567890123456789012345678901234567890',
			path: '/user/bin-ids/0X1234567890123456789012345678901234567890/bsc/pool123',
			expected: true
		},
		{
			name: 'No user in path (public data)',
			authUser: '0x1234567890123456789012345678901234567890',
			path: '/pools/bsc',
			expected: true
		},
		{
			name: 'No authenticated user accessing user data',
			authUser: undefined,
			path: '/user/bin-ids/0x1234567890123456789012345678901234567890/bsc/pool123',
			expected: false
		}
	]
	
	testCases.forEach(({ name, authUser, path, expected }, index) => {
		const context = createMockContext(authUser, path)
		const result = validateUserAccess(context, path)
		const status = result === expected ? '✅' : '❌'
		console.log(`${status} Test ${index + 1}: ${name}`)
		console.log(`   Auth User: ${authUser || 'none'}`)
		console.log(`   Path:      ${path}`)
		console.log(`   Expected:  ${expected}`)
		console.log(`   Got:       ${result}`)
		console.log()
	})
}

// Test cache key generation
const testCacheKeyGeneration = () => {
	console.log('🔑 Testing cache key generation...\n')
	
	// This would require importing the actual function and creating proper context
	// For now, let's show expected behavior
	console.log('Expected cache keys:')
	console.log('User data:  dex-api:/v1/api/dex/user/bin-ids/0x123.../bsc/pool123')
	console.log('Pool data:  dex-api:/v1/api/dex/pools/bsc')
	console.log('Price data: dex-api:/v1/api/dex/price')
	console.log()
}

// Run all tests
console.log('🚀 Running cache key validation tests...\n')
testUserExtraction()
testAccessValidation()
testCacheKeyGeneration()

console.log('✨ Tests completed!')
