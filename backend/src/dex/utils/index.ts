/**
 * DEX Utilities Module
 * Common utility functions used across the DEX API
 */

import type { CorsHeaders, PaginationInfo } from '../types';

/**
 * Create standardized pagination info
 */
export function createPaginationInfo(
  page: number,
  limit: number,
  total: number
): PaginationInfo {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
}

/**
 * Parse query parameters with defaults
 */
export function parseQueryParams(url: URL): {
  page: number;
  limit: number;
  chainId?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
} {
  const params = url.searchParams;
  
  return {
    page: Math.max(1, parseInt(params.get('page') || '1', 10)),
    limit: Math.min(100, Math.max(1, parseInt(params.get('limit') || '20', 10))),
    chainId: params.get('chainId') || params.get('chain') || undefined,
    status: params.get('status') || undefined,
    sortBy: params.get('sortBy') || params.get('sort') || undefined,
    sortOrder: (params.get('sortOrder') || params.get('order')) === 'desc' ? 'desc' : 'asc'
  };
}

/**
 * Create standardized API response
 */
export function createApiResponse(
  data: any,
  corsHeaders: CorsHeaders,
  status: number = 200,
  pagination?: PaginationInfo
): Response {
  const responseBody = {
    success: status < 400,
    data,
    ...(pagination && { pagination }),
    timestamp: new Date().toISOString()
  };

  return new Response(JSON.stringify(responseBody), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: string,
  message: string,
  corsHeaders: CorsHeaders,
  status: number = 400,
  code?: string
): Response {
  const responseBody = {
    success: false,
    error,
    message,
    ...(code && { code }),
    timestamp: new Date().toISOString()
  };

  return new Response(JSON.stringify(responseBody), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

/**
 * Validate Ethereum address format
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate chain ID
 */
export function isValidChainId(chainId: string): boolean {
  const validChains = ['43114', '1', '56', '137', '42161', '10'];
  return validChains.includes(chainId);
}

/**
 * Format token amount with decimals
 */
export function formatTokenAmount(amount: string | number, decimals: number = 18): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  return (value / Math.pow(10, decimals)).toFixed(6);
}

/**
 * Calculate APR from rewards
 */
export function calculateAPR(
  rewardsPerDay: number,
  totalStaked: number,
  tokenPrice: number
): number {
  if (totalStaked === 0) return 0;
  
  const dailyYield = (rewardsPerDay * tokenPrice) / totalStaked;
  return dailyYield * 365 * 100; // Convert to annual percentage
}

/**
 * Generate cache key for data caching
 */
export function generateCacheKey(prefix: string, ...params: (string | number)[]): string {
  return `${prefix}:${params.join(':')}`;
}

/**
 * Sanitize string for safe usage
 */
export function sanitizeString(input: string): string {
  return input.replace(/[<>"\';()&+]/g, '').trim();
}

/**
 * Parse timestamp range from query parameters
 */
export function parseTimeRange(url: URL): { start?: Date; end?: Date } {
  const params = url.searchParams;
  const start = params.get('start') || params.get('startTime');
  const end = params.get('end') || params.get('endTime');
  
  return {
    start: start ? new Date(start) : undefined,
    end: end ? new Date(end) : undefined
  };
}

/**
 * Get request context from environment
 */
export function getRequestContext(env: any): {
  user: any;
  permissions: string[];
  tier: string;
  routeParams: Record<string, string>;
  corsHeaders: CorsHeaders;
} {
  return env._requestContext || {
    user: null,
    permissions: [],
    tier: 'basic',
    routeParams: {},
    corsHeaders: {}
  };
}
