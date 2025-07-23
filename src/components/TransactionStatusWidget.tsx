import React, { useEffect, useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  IconButton,
  Fade,
  Chip,
  Link,
  Alert,
  Collapse
} from '@mui/material'
import {
  CheckCircle,
  Close,
  OpenInNew,
  Pending,
  SwapHoriz,
  Add,
  Remove,
  Pool
} from '@mui/icons-material'
import { useTransactionStore, TransactionStatus } from '../stores/transactionStore'
import { usePublicClient } from 'wagmi'
import { formatDistanceToNow } from 'date-fns'

const getTransactionIcon = (type: TransactionStatus['type']) => {
  switch (type) {
    case 'createPool':
      return <Pool fontSize="small" />
    case 'addLiquidity':
      return <Add fontSize="small" />
    case 'removeLiquidity':
      return <Remove fontSize="small" />
    case 'swap':
      return <SwapHoriz fontSize="small" />
    case 'approve':
      return <CheckCircle fontSize="small" />
    default:
      return <Pending fontSize="small" />
  }
}

const getTransactionColor = (status: TransactionStatus['status']) => {
  switch (status) {
    case 'pending':
      return 'warning'
    case 'success':
      return 'success'
    case 'failed':
      return 'error'
    default:
      return 'default'
  }
}

const getChainExplorerUrl = (chainId: number, hash: string) => {
  // BSC主网和测试网的区块浏览器
  switch (chainId) {
    case 56: // BSC Mainnet
      return `https://bscscan.com/tx/${hash}`
    case 97: // BSC Testnet
      return `https://testnet.bscscan.com/tx/${hash}`
    default:
      return `https://bscscan.com/tx/${hash}`
  }
}

interface TransactionItemProps {
  transaction: TransactionStatus
  onRemove: (id: string) => void
}

const TransactionItem: React.FC<TransactionItemProps> = ({ transaction, onRemove }) => {
  const publicClient = usePublicClient()
  const { updateTransaction } = useTransactionStore()
  const [checking, setChecking] = useState(false)

  // 定期检查pending交易状态
  useEffect(() => {
    if (transaction.status !== 'pending' || !transaction.hash || !publicClient) {
      return
    }

    let timeoutId: NodeJS.Timeout
    let attempts = 0
    const maxAttempts = 60 // 最多检查60次 (5分钟)

    const checkTransactionStatus = async () => {
      if (attempts >= maxAttempts) {
        updateTransaction(transaction.id, {
          status: 'failed',
          errorMessage: 'Transaction timeout - please check manually'
        })
        return
      }

      attempts++
      setChecking(true)

      try {
        const receipt = await publicClient.getTransactionReceipt({
          hash: transaction.hash as `0x${string}`
        })

        if (receipt) {
          const success = receipt.status === 'success'
          updateTransaction(transaction.id, {
            status: success ? 'success' : 'failed',
            errorMessage: success ? undefined : 'Transaction reverted'
          })
        } else {
          // 交易还在pending，继续检查
          timeoutId = setTimeout(checkTransactionStatus, 5000) // 每5秒检查一次
        }
      } catch (error) {
        // 如果是交易未找到错误，继续等待
        if ((error as Error).message?.includes('not found')) {
          timeoutId = setTimeout(checkTransactionStatus, 5000)
        } else {
          // 其他错误，标记为失败
          console.error('Error checking transaction:', error)
          updateTransaction(transaction.id, {
            status: 'failed',
            errorMessage: `Check failed: ${(error as Error).message}`
          })
        }
      } finally {
        setChecking(false)
      }
    }

    // 开始检查
    timeoutId = setTimeout(checkTransactionStatus, 2000) // 2秒后开始第一次检查

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [transaction.hash, transaction.status, transaction.id, publicClient, updateTransaction])

  const explorerUrl = transaction.hash && transaction.chainId 
    ? getChainExplorerUrl(transaction.chainId, transaction.hash)
    : null

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 2, 
        mb: 1, 
        borderLeft: 4, 
        borderLeftColor: `${getTransactionColor(transaction.status)}.main`,
        position: 'relative'
      }}
    >
      <Box display="flex" alignItems="flex-start" justifyContent="space-between">
        <Box display="flex" alignItems="center" gap={1} flex={1}>
          <Box color={`${getTransactionColor(transaction.status)}.main`}>
            {getTransactionIcon(transaction.type)}
          </Box>
          
          <Box flex={1}>
            <Typography variant="subtitle2" fontWeight="bold">
              {transaction.title}
            </Typography>
            
            {transaction.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {transaction.description}
              </Typography>
            )}
            
            <Box display="flex" alignItems="center" gap={1} mt={1}>
              <Chip 
                label={transaction.status}
                color={getTransactionColor(transaction.status)}
                size="small"
                variant="outlined"
              />
              
              {transaction.hash && explorerUrl && (
                <Link 
                  href={explorerUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 0.5,
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  <Typography variant="caption" color="primary">
                    View on Explorer
                  </Typography>
                  <OpenInNew sx={{ fontSize: 12 }} />
                </Link>
              )}
              
              <Typography variant="caption" color="text.secondary">
                {formatDistanceToNow(transaction.timestamp, { addSuffix: true })}
              </Typography>
            </Box>
          </Box>
        </Box>
        
        <IconButton 
          size="small" 
          onClick={() => onRemove(transaction.id)}
          sx={{ ml: 1 }}
        >
          <Close fontSize="small" />
        </IconButton>
      </Box>
      
      {transaction.status === 'pending' && (
        <LinearProgress 
          sx={{ 
            mt: 1, 
            borderRadius: 1,
            '& .MuiLinearProgress-bar': {
              transition: 'transform 2s ease-in-out'
            }
          }} 
          variant={checking ? 'indeterminate' : 'query'}
        />
      )}
      
      {transaction.status === 'failed' && transaction.errorMessage && (
        <Collapse in={true} sx={{ mt: 1 }}>
          <Alert severity="error" variant="outlined" sx={{ py: 0.5 }}>
            <Typography variant="caption">
              {transaction.errorMessage}
            </Typography>
          </Alert>
        </Collapse>
      )}
    </Paper>
  )
}

const TransactionStatusWidget: React.FC = () => {
  const { transactions, removeTransaction, clearOldTransactions } = useTransactionStore()
  const [isVisible, setIsVisible] = useState(false)
  
  // 只显示最近的3个交易
  const recentTransactions = transactions.slice(0, 3)
  
  // 如果有交易就显示组件
  useEffect(() => {
    setIsVisible(transactions.length > 0)
    
    // 定期清理旧交易
    const interval = setInterval(clearOldTransactions, 5 * 60 * 1000) // 每5分钟清理一次
    return () => clearInterval(interval)
  }, [transactions.length, clearOldTransactions])

  if (!isVisible || recentTransactions.length === 0) {
    return null
  }

  return (
    <Fade in={isVisible}>
      <Box
        sx={{
          position: 'fixed',
          bottom: 20,
          left: 20,
          zIndex: 1300,
          maxWidth: 400,
          minWidth: 320,
        }}
      >
        <Box>
          <Typography 
            variant="subtitle2" 
            color="text.secondary" 
            sx={{ mb: 1, px: 1 }}
          >
            Recent Transactions
          </Typography>
          
          {recentTransactions.map((transaction) => (
            <TransactionItem
              key={transaction.id}
              transaction={transaction}
              onRemove={removeTransaction}
            />
          ))}
          
          {transactions.length > 3 && (
            <Typography 
              variant="caption" 
              color="text.secondary" 
              sx={{ display: 'block', textAlign: 'center', mt: 1 }}
            >
              +{transactions.length - 3} more transactions
            </Typography>
          )}
        </Box>
      </Box>
    </Fade>
  )
}

export default TransactionStatusWidget
