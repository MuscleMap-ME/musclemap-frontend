import React from 'react';
import { SafeMotion } from '@/utils/safeMotion';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Gift,
  Coins,
  Rocket,
  Trophy,
  ShoppingCart,
  Sparkles,
  CreditCard,
  Clock,
} from 'lucide-react';

interface CreditTransaction {
  id: string;
  type: 'credit' | 'debit';
  category: 'tip' | 'gift' | 'boost' | 'purchase' | 'reward' | 'transfer' | 'subscription' | 'other';
  amount: number;
  balance: number;
  description: string;
  counterpartyName?: string;
  createdAt: string;
  status: 'completed' | 'pending' | 'failed';
}

interface CreditTransactionListProps {
  transactions: CreditTransaction[];
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function CreditTransactionList({
  transactions,
  isLoading,
  onLoadMore,
  hasMore,
}: CreditTransactionListProps) {
  const getCategoryIcon = (category: CreditTransaction['category']) => {
    switch (category) {
      case 'tip':
        return <Coins className="w-4 h-4" />;
      case 'gift':
        return <Gift className="w-4 h-4" />;
      case 'boost':
        return <Rocket className="w-4 h-4" />;
      case 'purchase':
        return <ShoppingCart className="w-4 h-4" />;
      case 'reward':
        return <Trophy className="w-4 h-4" />;
      case 'transfer':
        return <ArrowUpRight className="w-4 h-4" />;
      case 'subscription':
        return <CreditCard className="w-4 h-4" />;
      default:
        return <Sparkles className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: CreditTransaction['category'], type: 'credit' | 'debit') => {
    if (type === 'credit') {
      return 'bg-emerald-500/20 text-emerald-400';
    }
    switch (category) {
      case 'tip':
        return 'bg-amber-500/20 text-amber-400';
      case 'gift':
        return 'bg-pink-500/20 text-pink-400';
      case 'boost':
        return 'bg-purple-500/20 text-purple-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 1) {
      const minutes = Math.floor(diffMs / (1000 * 60));
      return `${minutes}m ago`;
    }
    if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`;
    }
    if (diffDays < 7) {
      return `${Math.floor(diffDays)}d ago`;
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (transactions.length === 0 && !isLoading) {
    return (
      <div className="bg-gray-800 rounded-2xl p-6 text-center">
        <Clock className="w-12 h-12 mx-auto text-gray-600 mb-3" />
        <h3 className="text-lg font-medium text-white mb-1">No Transactions</h3>
        <p className="text-sm text-gray-400">
          Your transaction history will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map((transaction, index) => (
        <SafeMotion.div
          key={transaction.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.03 }}
          className={`p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 ${
            transaction.status === 'pending' ? 'opacity-70' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Icon */}
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${getCategoryColor(
                  transaction.category,
                  transaction.type
                )}`}
              >
                {getCategoryIcon(transaction.category)}
              </div>

              {/* Details */}
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-white">{transaction.description}</p>
                  {transaction.status === 'pending' && (
                    <span className="px-1.5 py-0.5 text-xs rounded bg-amber-500/20 text-amber-400">
                      Pending
                    </span>
                  )}
                  {transaction.status === 'failed' && (
                    <span className="px-1.5 py-0.5 text-xs rounded bg-red-500/20 text-red-400">
                      Failed
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  {transaction.counterpartyName && (
                    <>
                      <span>
                        {transaction.type === 'credit' ? 'From' : 'To'} {transaction.counterpartyName}
                      </span>
                      <span>•</span>
                    </>
                  )}
                  <span>{formatDate(transaction.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Amount */}
            <div className="text-right">
              <p
                className={`font-semibold ${
                  transaction.type === 'credit' ? 'text-emerald-400' : 'text-white'
                }`}
              >
                {transaction.type === 'credit' ? '+' : '-'}
                {transaction.amount.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                Balance: {transaction.balance.toLocaleString()}
              </p>
            </div>
          </div>
        </SafeMotion.div>
      ))}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Load more button */}
      {hasMore && !isLoading && (
        <button
          onClick={onLoadMore}
          className="w-full py-3 text-sm text-purple-400 hover:text-purple-300 transition-colors"
        >
          Load more transactions
        </button>
      )}
    </div>
  );
}
