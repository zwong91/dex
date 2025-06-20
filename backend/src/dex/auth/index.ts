import type { ApiKeyValidationResult, RateLimitResult } from '../types';

// Helper function to check permissions
export function hasPermission(userPermissions: string[], required: string): boolean {
  return userPermissions.includes(required) || userPermissions.includes('admin_system');
}

// API key validation function
export async function validateApiKey(env: any, apiKey: string): Promise<ApiKeyValidationResult> {
  if (!apiKey) {
    return { valid: false, error: 'API key is required' };
  }

  try {
    // Support demo API keys for testing
    if (apiKey === 'test-key') {
      return {
        valid: true,
        user: {
          id: 'test-user-001',
          email: 'test@entysquare.com'
        },
        permissions: ['pools_read', 'analytics_read'],
        tier: 'basic'
      };
    }

    if (apiKey === 'admin-key') {
      return {
        valid: true,
        user: {
          id: 'admin-user-001',
          email: 'admin@entysquare.com'
        },
        permissions: ['admin_system', 'analytics_read', 'pools_read', 'rewards_read', 'user_read', 'vaults_read'],
        tier: 'enterprise'
      };
    }

    // Database lookup for production keys
    if (!env.D1_DATABASE) {
      return { valid: false, error: 'Database not available' };
    }

    // Find API key by key hash (simplified - in production use proper hashing)
    const keyRecord = await env.D1_DATABASE.prepare(`
      SELECT ak.*, u.id as user_id, u.email, u.status as user_status,
             ak.permissions
      FROM api_keys ak
      JOIN users u ON ak.user_id = u.id
      WHERE ak.key_hash = ? AND ak.status = 'active' AND u.status = 'active'
    `).bind(apiKey).first();

    if (!keyRecord) {
      return { valid: false, error: 'API key not found or inactive' };
    }

    // Check expiration
    if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
      return { valid: false, error: 'API key has expired' };
    }

    // Parse permissions
    let permissions = [];
    try {
      permissions = JSON.parse(keyRecord.permissions || '[]');
    } catch (e) {
      console.error('Failed to parse permissions:', e);
    }

    return {
      valid: true,
      user: {
        id: keyRecord.user_id,
        email: keyRecord.email
      },
      permissions,
      tier: keyRecord.tier
    };
  } catch (error) {
    console.error('API key validation error:', error);
    return { valid: false, error: 'Validation failed' };
  }
}

// Helper function to check rate limits
export async function checkRateLimit(env: any, userId: string, tier: string): Promise<RateLimitResult> {
  // Simplified rate limiting - in production use Redis or more sophisticated approach
  const limits = {
    free: 50,
    basic: 1000,
    pro: 10000,
    enterprise: 999999
  };

  const limit = limits[tier as keyof typeof limits] || limits.free;
  
  // For now, return not exceeded (implement proper rate limiting later)
  return {
    exceeded: false,
    limit,
    resetTime: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
  };
}

// Helper function to track API usage
export async function trackApiUsage(env: any, apiKey: string, endpoint: string, method: string, userId: string): Promise<void> {
  try {
    if (!env.D1_DATABASE) return;

    await env.D1_DATABASE.prepare(`
      INSERT INTO api_usage (api_key_id, user_id, endpoint, method, status_code, timestamp, date)
      VALUES (?, ?, ?, ?, 200, ?, ?)
    `).bind(
      apiKey, // Simplified - should be actual API key ID
      userId,
      endpoint,
      method,
      Date.now(),
      new Date().toISOString().split('T')[0]
    ).run();
  } catch (error) {
    console.error('Failed to track API usage:', error);
  }
}
