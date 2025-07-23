import React from 'react'
import { Button, Box, Typography, Paper } from '@mui/material'
import { useTransactionStore } from '../stores/transactionStore'
import { useChainId } from 'wagmi'

const TransactionTestWidget: React.FC = () => {
  const { addTransaction } = useTransactionStore()
  const chainId = useChainId()

  const testCreatePool = () => {
    addTransaction({
      type: 'createPool',
      status: 'pending',
      title: 'Creating Pool',
      description: 'USDT/BNB - Bin Step: 25',
      chainId: chainId,
      hash: '0x1234567890abcdef1234567890abcdef12345678'
    })
  }

  const testAddLiquidity = () => {
    addTransaction({
      type: 'addLiquidity',
      status: 'pending',
      title: 'Adding Liquidity',
      description: 'USDT/BNB - Dual-sided liquidity',
      chainId: chainId,
      hash: '0xabcdef1234567890abcdef1234567890abcdef12'
    })
  }

  const testSwap = () => {
    addTransaction({
      type: 'swap',
      status: 'pending',
      title: 'Token Swap',
      description: 'BNB → USDT (1.0 BNB)',
      chainId: chainId,
      hash: '0x567890abcdef1234567890abcdef1234567890ab'
    })
  }

  const testRemoveLiquidity = () => {
    addTransaction({
      type: 'removeLiquidity',
      status: 'pending',
      title: 'Removing Liquidity',
      description: 'USDT/BNB - Removing from 5 bin(s)',
      chainId: chainId,
      hash: '0x90abcdef1234567890abcdef1234567890abcdef'
    })
  }

  const testApproval = () => {
    addTransaction({
      type: 'approve',
      status: 'pending',
      title: 'Token Approval',
      description: 'Approve USDT for trading',
      chainId: chainId,
      hash: '0xcdef1234567890abcdef1234567890abcdef1234'
    })
  }

  return (
    <Paper 
      sx={{ 
        position: 'fixed',
        top: 20,
        right: 20,
        p: 2,
        zIndex: 1400,
        maxWidth: 300,
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Typography variant="h6" gutterBottom>
        🧪 Transaction Status Test
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Click buttons to test transaction status widget
      </Typography>
      
      <Box display="flex" flexDirection="column" gap={1}>
        <Button 
          variant="outlined" 
          size="small" 
          onClick={testCreatePool}
          color="primary"
        >
          Test Create Pool
        </Button>
        
        <Button 
          variant="outlined" 
          size="small" 
          onClick={testAddLiquidity}
          color="success"
        >
          Test Add Liquidity
        </Button>
        
        <Button 
          variant="outlined" 
          size="small" 
          onClick={testSwap}
          color="warning"
        >
          Test Swap
        </Button>
        
        <Button 
          variant="outlined" 
          size="small" 
          onClick={testRemoveLiquidity}
          color="error"
        >
          Test Remove Liquidity
        </Button>
        
        <Button 
          variant="outlined" 
          size="small" 
          onClick={testApproval}
          color="info"
        >
          Test Approval
        </Button>
      </Box>
    </Paper>
  )
}

export default TransactionTestWidget
