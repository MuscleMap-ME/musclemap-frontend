import React, { useState } from 'react';
import { SafeMotion, SafeAnimatePresence } from '@/utils/safeMotion';
import { X, Gift, Sparkles, Crown, Flame, Star, Heart, Zap, Send, User } from 'lucide-react';

interface VirtualGift {
  id: string;
  name: string;
  icon: string;
  price: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  animation?: string;
}

interface GiftSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (giftId: string, message?: string) => Promise<void>;
  recipientName: string;
  recipientAvatar?: string;
  userBalance: number;
  gifts?: VirtualGift[];
}

const DEFAULT_GIFTS: VirtualGift[] = [
  { id: 'protein-shake', name: 'Protein Shake', icon: '🥤', price: 25, rarity: 'common' },
  { id: 'dumbbell', name: 'Golden Dumbbell', icon: '🏋️', price: 50, rarity: 'common' },
  { id: 'trophy', name: 'Trophy', icon: '🏆', price: 100, rarity: 'rare' },
  { id: 'fire', name: 'Fire Boost', icon: '🔥', price: 150, rarity: 'rare' },
  { id: 'lightning', name: 'Lightning Strike', icon: '⚡', price: 250, rarity: 'epic' },
  { id: 'diamond', name: 'Diamond', icon: '💎', price: 500, rarity: 'epic' },
  { id: 'crown', name: 'Crown', icon: '👑', price: 1000, rarity: 'legendary' },
  { id: 'meteor', name: 'Meteor Shower', icon: '☄️', price: 2500, rarity: 'legendary' },
];

export function GiftSelector({
  isOpen,
  onClose,
  onSend,
  recipientName,
  recipientAvatar,
  userBalance,
  gifts = DEFAULT_GIFTS,
}: GiftSelectorProps) {
  const [selectedGift, setSelectedGift] = useState<VirtualGift | null>(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRarityColor = (rarity: VirtualGift['rarity']) => {
    switch (rarity) {
      case 'legendary':
        return 'border-amber-500 bg-amber-500/10';
      case 'epic':
        return 'border-purple-500 bg-purple-500/10';
      case 'rare':
        return 'border-blue-500 bg-blue-500/10';
      default:
        return 'border-gray-600 bg-gray-800/50';
    }
  };

  const getRarityGlow = (rarity: VirtualGift['rarity']) => {
    switch (rarity) {
      case 'legendary':
        return 'shadow-amber-500/30';
      case 'epic':
        return 'shadow-purple-500/30';
      case 'rare':
        return 'shadow-blue-500/30';
      default:
        return '';
    }
  };

  const handleSend = async () => {
    if (!selectedGift) {
      setError('Please select a gift');
      return;
    }
    if (selectedGift.price > userBalance) {
      setError('Insufficient balance');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      await onSend(selectedGift.id, message || undefined);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send gift');
    } finally {
      setIsSending(false);
    }
  };

  const canSend = selectedGift && selectedGift.price <= userBalance && !isSending;

  return (
    <SafeAnimatePresence>
      {isOpen && (
        <SafeMotion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <SafeMotion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gradient-to-r from-pink-500/10 to-purple-500/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Send a Gift</h3>
                  <p className="text-sm text-gray-400">Choose something special</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Recipient */}
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                  {recipientAvatar ? (
                    <img src={recipientAvatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-400">Sending to</p>
                  <p className="font-medium text-white">{recipientName}</p>
                </div>
              </div>
            </div>

            {/* Gift Grid */}
            <div className="p-4">
              <div className="grid grid-cols-4 gap-3 max-h-64 overflow-y-auto">
                {gifts.map((gift) => (
                  <button
                    key={gift.id}
                    onClick={() => setSelectedGift(gift)}
                    disabled={gift.price > userBalance}
                    className={`relative p-3 rounded-xl border-2 transition-all ${
                      selectedGift?.id === gift.id
                        ? `${getRarityColor(gift.rarity)} ring-2 ring-offset-2 ring-offset-gray-900 ring-purple-500`
                        : gift.price > userBalance
                        ? 'border-gray-700 bg-gray-800/30 opacity-50 cursor-not-allowed'
                        : `${getRarityColor(gift.rarity)} hover:scale-105`
                    } ${selectedGift?.id === gift.id ? `shadow-lg ${getRarityGlow(gift.rarity)}` : ''}`}
                  >
                    <div className="text-3xl mb-1">{gift.icon}</div>
                    <p className="text-xs text-white font-medium truncate">{gift.name}</p>
                    <p className="text-xs text-gray-400">{gift.price}</p>
                    {gift.rarity !== 'common' && (
                      <div
                        className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${
                          gift.rarity === 'legendary'
                            ? 'bg-amber-500'
                            : gift.rarity === 'epic'
                            ? 'bg-purple-500'
                            : 'bg-blue-500'
                        }`}
                      >
                        {gift.rarity === 'legendary' ? (
                          <Crown className="w-2.5 h-2.5 text-white" />
                        ) : gift.rarity === 'epic' ? (
                          <Sparkles className="w-2.5 h-2.5 text-white" />
                        ) : (
                          <Star className="w-2.5 h-2.5 text-white" />
                        )}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Gift Preview */}
            {selectedGift && (
              <div className="px-4 pb-4">
                <div className={`p-3 rounded-xl border ${getRarityColor(selectedGift.rarity)}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{selectedGift.icon}</span>
                      <div>
                        <p className="font-medium text-white">{selectedGift.name}</p>
                        <p className="text-sm text-gray-400 capitalize">{selectedGift.rarity}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white">{selectedGift.price}</p>
                      <p className="text-xs text-gray-400">credits</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Message */}
            <div className="px-4 pb-4">
              <label className="block text-sm text-gray-400 mb-2">Add a message (optional)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Say something nice..."
                rows={2}
                maxLength={200}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none resize-none"
              />
            </div>

            {/* Balance info */}
            <div className="px-4 pb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Your balance</span>
                <span className="text-white font-medium">{userBalance.toLocaleString()} credits</span>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="px-4 pb-4">
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                  {error}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="p-4 border-t border-gray-800">
              <button
                onClick={handleSend}
                disabled={!canSend}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${
                  canSend
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:shadow-lg hover:shadow-purple-500/25'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isSending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Gift {selectedGift && `(${selectedGift.price} credits)`}
                  </>
                )}
              </button>
            </div>
          </SafeMotion.div>
        </SafeMotion.div>
      )}
    </SafeAnimatePresence>
  );
}
