import type { UserRewards } from '../types';
import { createApiResponse, createErrorResponse, parseQueryParams, getRequestContext } from '../utils';

// Handler for user rewards
export async function handleUserRewards(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const { routeParams, corsHeaders } = getRequestContext(env);
  const userAddress = routeParams.userAddress;
  const { chainId } = parseQueryParams(url);
  const chain = chainId || '43114'; // Default to Avalanche

  // Mock rewards data structure
  const mockRewards = {
    userAddress: userAddress,
    chain: chain,
    totalRewards: "15000.50",
    claimableRewards: "5000.25",
    rewardsHistory: [
      {
        tokenAddress: "0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd",
        tokenSymbol: "UNC",
        amount: "1500.75",
        timestamp: Math.floor(Date.now() / 1000),
        txHash: "0x1234567890abcdef1234567890abcdef12345678",
        status: "claimed"
      },
      {
        tokenAddress: "0x9e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd",
        tokenSymbol: "REWARD",
        amount: "3500.25",
        timestamp: Math.floor(Date.now() / 1000) - 86400,
        txHash: "0xabcdef1234567890abcdef1234567890abcdef12",
        status: "pending"
      }
    ],
    merkleProofs: [
      {
        tokenAddress: "0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd",
        amount: "1500.75",
        proof: ["0xproof1", "0xproof2", "0xproof3"]
      }
    ]
  };

  return createApiResponse(mockRewards, corsHeaders);
}

// Handler for batch rewards proof
export async function handleBatchRewardsProof(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const { routeParams, corsHeaders } = getRequestContext(env);
  const { chainId } = parseQueryParams(url);
  const chain = chainId || '43114'; // Default to Avalanche
  
  // For batch proof, we expect user addresses in the request body
  const requestBody = await request.json().catch(() => ({})) as { userAddresses?: string[] };
  const userAddresses = requestBody.userAddresses || [];

  // Mock batch rewards proof response
  const mockBatchProof = {
    userAddresses: userAddresses,
    chain: chain,
    batchProofs: [
      {
        tokenAddress: "0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd",
        tokenSymbol: "UNC",
        totalAmount: "5000.50",
        merkleRoot: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        proofs: [
          {
            amount: "2500.25",
            proof: ["0xproof1a", "0xproof1b", "0xproof1c"]
          },
          {
            amount: "2500.25", 
            proof: ["0xproof2a", "0xproof2b", "0xproof2c"]
          }
        ]
      }
    ],
    expirationTimestamp: Math.floor(Date.now() / 1000) + 604800, // 7 days from now
    signature: "0xsignature1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
  };

  return new Response(JSON.stringify(mockBatchProof), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Handler for claimable rewards
export async function handleClaimableRewards(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const chain = pathSegments[5];
  const userAddress = pathSegments[6];

  const mockClaimableRewards = {
    userAddress: userAddress,
    chain: chain,
    totalClaimable: "8500.75",
    claimableTokens: [
      {
        tokenAddress: "0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd",
        tokenSymbol: "UNC",
        tokenName: "Unicorn Token",
        decimals: 18,
        amount: "5000.50",
        amountUsd: "12500.75",
        lastUpdated: Math.floor(Date.now() / 1000)
      },
      {
        tokenAddress: "0x9e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd", 
        tokenSymbol: "REWARD",
        tokenName: "Reward Token",
        decimals: 18,
        amount: "3500.25",
        amountUsd: "7000.50",
        lastUpdated: Math.floor(Date.now() / 1000)
      }
    ],
    estimatedGasCost: "0.005",
    nextClaimAvailable: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
  };

  return new Response(JSON.stringify(mockClaimableRewards), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Handler for rewards history
export async function handleRewardsHistory(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const chain = pathSegments[5];
  const userAddress = pathSegments[6];
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '50');

  const mockRewardsHistory = {
    userAddress: userAddress,
    chain: chain,
    pagination: {
      page: page,
      limit: limit,
      total: 125,
      hasMore: page * limit < 125
    },
    history: [
      {
        id: "reward_001",
        tokenAddress: "0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd",
        tokenSymbol: "UNC",
        tokenName: "Unicorn Token",
        amount: "1500.75",
        amountUsd: "3751.88",
        type: "liquidity_provision",
        poolAddress: "0x1234567890abcdef1234567890abcdef12345678",
        timestamp: Math.floor(Date.now() / 1000) - 86400,
        blockNumber: 12345678,
        txHash: "0x1234567890abcdef1234567890abcdef12345678",
        status: "claimed",
        claimedAt: Math.floor(Date.now() / 1000) - 3600
      },
      {
        id: "reward_002",
        tokenAddress: "0x9e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd",
        tokenSymbol: "REWARD",
        tokenName: "Reward Token",
        amount: "3500.25",
        amountUsd: "7000.50",
        type: "trading_fees",
        poolAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
        timestamp: Math.floor(Date.now() / 1000) - 172800,
        blockNumber: 12345123,
        txHash: "0xabcdef1234567890abcdef1234567890abcdef12",
        status: "pending",
        claimedAt: null
      }
    ],
    summary: {
      totalEarned: "25000.75",
      totalEarnedUsd: "62500.00",
      totalClaimed: "15000.50",
      totalClaimedUsd: "37500.00",
      totalPending: "10000.25",
      totalPendingUsd: "25000.00"
    }
  };

  return new Response(JSON.stringify(mockRewardsHistory), {
    headers: { 'Content-Type': 'application/json' }
  });
}
