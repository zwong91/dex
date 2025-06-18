import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useChainId } from 'wagmi';
import {
  Container,
  Box,
  Typography,
  IconButton,
  Card,
  CardContent,
  Alert,
  Button,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import Navigation from '../components/Navigation';
import { useRealPoolData } from '../dex';

interface PoolData {
  id: string;
  token0: string;
  token1: string;
  icon0: string;
  icon1: string;
  tvl: string;
  apr: string;
  volume24h: string;
  fees24h: string;
  userLiquidity?: string;
  pairAddress?: string;
  binStep?: number;
  tokenXAddress?: string;
  tokenYAddress?: string;
}

// Import the AddLiquidity component content from the dialog
import AddLiquidityForm from '../components/pool/AddLiquidityForm';

const AddLiquidityPage: React.FC = () => {
  const navigate = useNavigate();
  const chainId = useChainId();
  const [searchParams] = useSearchParams();
  const [selectedPool, setSelectedPool] = useState<PoolData | null>(null);
  
  // Get pool data
  const { pools: realPoolData, loading: isLoading } = useRealPoolData();
  
  // Get pool ID from URL parameters
  const poolId = searchParams.get('poolId');
  
  useEffect(() => {
    console.log('🔍 AddLiquidity Debug:', {
      poolId,
      realPoolDataLength: realPoolData?.length,
      poolIds: realPoolData?.map((p: PoolData) => p.id),
    });
    
    if (poolId && realPoolData) {
      // Try exact match first
      let pool = realPoolData.find((p: PoolData) => p.id === poolId);
      
      // If not found, try case-insensitive match
      if (!pool) {
        pool = realPoolData.find((p: PoolData) => p.id.toLowerCase() === poolId.toLowerCase());
      }
      
      // If still not found, try decoded poolId
      if (!pool) {
        const decodedPoolId = decodeURIComponent(poolId);
        pool = realPoolData.find((p: PoolData) => p.id === decodedPoolId || p.id.toLowerCase() === decodedPoolId.toLowerCase());
      }
      
      // If still not found, try using pairAddress
      if (!pool) {
        pool = realPoolData.find((p: PoolData) => 
          p.pairAddress === poolId || 
          p.pairAddress?.toLowerCase() === poolId.toLowerCase()
        );
      }
      
      console.log('🎯 Pool search result:', { poolId, foundPool: pool });
      
      if (pool) {
        setSelectedPool(pool);
      } else {
        console.warn('❌ Pool not found for ID:', poolId);
        // Don't redirect immediately, let user see the error
      }
    } else if (!poolId) {
      // No pool ID provided, redirect back to pool list
      navigate('/pool');
    }
  }, [poolId, realPoolData, navigate]);

  const handleBack = () => {
    navigate('/pool');
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg">
        <Navigation />
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
          <Typography>Loading...</Typography>
        </Box>
      </Container>
    );
  }

  if (!selectedPool) {
    return (
      <Container maxWidth="lg">
        <Navigation />
        <Box sx={{ mt: 4 }}>
          <Alert severity="error">
            <Typography variant="h6" gutterBottom>Pool not found</Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Pool ID from URL: {poolId}
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Available pools: {realPoolData?.length || 0}
            </Typography>
            {realPoolData && realPoolData.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" fontWeight="bold">Available Pool IDs:</Typography>
                <ul>
                  {realPoolData.slice(0, 5).map((pool: PoolData) => (
                    <li key={pool.id}>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {pool.id} ({pool.token0}/{pool.token1})
                      </Typography>
                    </li>
                  ))}
                  {realPoolData.length > 5 && (
                    <li>
                      <Typography variant="caption">... and {realPoolData.length - 5} more</Typography>
                    </li>
                  )}
                </ul>
              </Box>
            )}
            <Button 
              variant="contained" 
              onClick={() => navigate('/pool')}
              sx={{ mt: 2 }}
            >
              Back to Pools
            </Button>
          </Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Navigation />
      <Box sx={{ mt: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <IconButton 
            onClick={handleBack} 
            sx={{ mr: 2 }}
            aria-label="back to pools"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1" fontWeight={600}>
            Add Liquidity to {selectedPool.token0}/{selectedPool.token1}
          </Typography>
        </Box>

        {/* Pool Info Card */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <img
                  src={selectedPool.icon0}
                  alt={selectedPool.token0}
                  style={{ width: 32, height: 32, borderRadius: '50%' }}
                />
                <img
                  src={selectedPool.icon1}
                  alt={selectedPool.token1}
                  style={{ width: 32, height: 32, borderRadius: '50%', marginLeft: -8 }}
                />
              </Box>
              <Typography variant="h6" fontWeight={600}>
                {selectedPool.token0}/{selectedPool.token1}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                TVL: {selectedPool.tvl} • APR: {selectedPool.apr}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Add Liquidity Form */}
        <AddLiquidityForm 
          selectedPool={selectedPool}
          chainId={chainId}
          onSuccess={handleBack}
        />
      </Box>
    </Container>
  );
};

export default AddLiquidityPage;
