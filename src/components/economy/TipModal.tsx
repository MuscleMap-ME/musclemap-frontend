import React, { useState } from 'react';
import { SafeMotion, SafeAnimatePresence } from '@/utils/safeMotion';
import { X, Coins, Heart, Zap, Star, Send, User } from 'lucide-react';

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (amount: number, message?: string) => Promise<void>;
  recipientName: string;
  recipientAvatar?: string;
  userBalance: number;
  minTip?: number;
  maxTip?: number;
}

const PRESET_AMOUNTS = [10, 25, 50, 100, 250, 500];

const TIP_REACTIONS = [
  { emoji: '💪', label: 'Strong!' },
  { emoji: '🔥', label: 'Fire!' },
  { emoji: '⭐', label: 'Amazing!' },
  { emoji: '🎯', label: 'Perfect!' },
];

export function TipModal({
  isOpen,
  onClose,
  onSend,
  recipientName,
  recipientAvatar,
  userBalance,
  minTip = 1,
  maxTip = 10000,
}: TipModalProps) {
  const [amount, setAmount] = useState<number>(25);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [message, setMessage] = useState('');
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePresetClick = (preset: number) => {
    setAmount(preset);
    setCustomAmount('');
    setError(null);
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && parsed >= minTip) {
      setAmount(parsed);
      setError(null);
    }
  };

  const handleSend = async () => {
    if (amount < minTip) {
      setError(`Minimum tip is ${minTip} credits`);
      return;
    }
    if (amount > maxTip) {
      setError(`Maximum tip is ${maxTip} credits`);
      return;
    }
    if (amount > userBalance) {
      setError('Insufficient balance');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const finalMessage = selectedReaction
        ? `${selectedReaction} ${message}`.trim()
        : message;
      await onSend(amount, finalMessage || undefined);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send tip');
    } finally {
      setIsSending(false);
    }
  };

  const canSend = amount >= minTip && amount <= maxTip && amount <= userBalance && !isSending;

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
            className="w-full max-w-md bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gradient-to-r from-amber-500/10 to-yellow-500/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center">
                  <Coins className="w-5 h-5 text-gray-900" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Send Tip</h3>
                  <p className="text-sm text-gray-400">Show appreciation</p>
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
                  <p className="text-sm text-gray-400">Tipping</p>
                  <p className="font-medium text-white">{recipientName}</p>
                </div>
              </div>
            </div>

            {/* Amount Selection */}
            <div className="p-4 space-y-4">
              {/* Preset amounts */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Select Amount</label>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_AMOUNTS.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handlePresetClick(preset)}
                      disabled={preset > userBalance}
                      className={`py-2.5 rounded-lg font-medium transition-all ${
                        amount === preset && !customAmount
                          ? 'bg-amber-500 text-gray-900'
                          : preset > userBalance
                          ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                          : 'bg-gray-800 text-white hover:bg-gray-700'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom amount */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Or enter custom amount</label>
                <div className="relative">
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => handleCustomAmountChange(e.target.value)}
                    placeholder="Enter amount..."
                    min={minTip}
                    max={Math.min(maxTip, userBalance)}
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                    credits
                  </span>
                </div>
              </div>

              {/* Quick reactions */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Add a reaction (optional)</label>
                <div className="flex gap-2">
                  {TIP_REACTIONS.map((reaction) => (
                    <button
                      key={reaction.emoji}
                      onClick={() =>
                        setSelectedReaction(
                          selectedReaction === reaction.emoji ? null : reaction.emoji
                        )
                      }
                      className={`flex-1 py-2 rounded-lg text-center transition-all ${
                        selectedReaction === reaction.emoji
                          ? 'bg-purple-500/30 border border-purple-500'
                          : 'bg-gray-800 hover:bg-gray-700 border border-transparent'
                      }`}
                    >
                      <span className="text-xl">{reaction.emoji}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Message (optional)</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a note..."
                  rows={2}
                  maxLength={200}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none resize-none"
                />
              </div>

              {/* Balance info */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Your balance</span>
                <span className="text-white font-medium">{userBalance.toLocaleString()} credits</span>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                  {error}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-gray-800">
              <button
                onClick={handleSend}
                disabled={!canSend}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${
                  canSend
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900 hover:shadow-lg hover:shadow-amber-500/25'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isSending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send {amount.toLocaleString()} Credits
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
