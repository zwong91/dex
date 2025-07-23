import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export interface TransactionStatus {
  id: string
  hash?: string
  type: 'createPool' | 'addLiquidity' | 'removeLiquidity' | 'swap' | 'approve'
  status: 'pending' | 'success' | 'failed'
  title: string
  description?: string
  timestamp: number
  chainId?: number
  errorMessage?: string
}

interface TransactionState {
  transactions: TransactionStatus[]
  addTransaction: (transaction: Omit<TransactionStatus, 'id' | 'timestamp'>) => string
  updateTransaction: (id: string, updates: Partial<TransactionStatus>) => void
  removeTransaction: (id: string) => void
  clearOldTransactions: () => void
  getActiveTransactions: () => TransactionStatus[]
  getLatestTransaction: () => TransactionStatus | null
}

export const useTransactionStore = create<TransactionState>()(
  devtools(
    (set, get) => ({
      transactions: [],
      
      addTransaction: (transaction) => {
        const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
        const newTransaction: TransactionStatus = {
          ...transaction,
          id,
          timestamp: Date.now(),
        }
        
        set((state) => ({
          transactions: [newTransaction, ...state.transactions]
        }))
        
        return id
      },
      
      updateTransaction: (id, updates) => {
        set((state) => ({
          transactions: state.transactions.map(tx =>
            tx.id === id ? { ...tx, ...updates } : tx
          )
        }))
      },
      
      removeTransaction: (id) => {
        set((state) => ({
          transactions: state.transactions.filter(tx => tx.id !== id)
        }))
      },
      
      clearOldTransactions: () => {
        const oneHourAgo = Date.now() - (60 * 60 * 1000) // 1 hour
        set((state) => ({
          transactions: state.transactions.filter(tx => 
            tx.timestamp > oneHourAgo || tx.status === 'pending'
          )
        }))
      },
      
      getActiveTransactions: () => {
        return get().transactions.filter(tx => tx.status === 'pending')
      },
      
      getLatestTransaction: () => {
        const transactions = get().transactions
        return transactions.length > 0 ? transactions[0] : null
      }
    }),
    {
      name: 'transaction-store',
    }
  )
)
