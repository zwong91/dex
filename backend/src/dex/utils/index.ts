/**
 * DEX Utilities Module
 * Common utility functions used across the DEX API
 */

import type { CorsHeaders, PaginationInfo } from '../types';

/**
 * Validate Ethereum address format
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
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