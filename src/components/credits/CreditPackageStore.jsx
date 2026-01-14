/**
 * CreditPackageStore - Display and purchase credit packages
 *
 * Shows available credit packages with bonuses, allows purchase via Stripe.
 * Integrates with the enhanced economy API.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coins,
  Zap,
  Crown,
  Gift,
  Sparkles,
  Check,
  Star,
  TrendingUp,
  CreditCard,
  Loader2,
} from 'lucide-react';

// Package icons based on size
const PACKAGE_ICONS = {
  starter: Coins,
  bronze: Coins,
  silver: Star,
  gold: Crown,
  platinum: Sparkles,
  diamond: Sparkles,
  ultimate: Zap,
};

// Package colors
const PACKAGE_COLORS = {
  starter: { gradient: 'from-gray-500 to-gray-600', accent: '#6B7280' },
  bronze: { gradient: 'from-amber-700 to-amber-800', accent: '#B45309' },
  silver: { gradient: 'from-gray-400 to-gray-500', accent: '#9CA3AF' },
  gold: { gradient: 'from-yellow-500 to-amber-500', accent: '#EAB308' },
  platinum: { gradient: 'from-blue-400 to-cyan-500', accent: '#22D3EE' },
  diamond: { gradient: 'from-purple-400 to-pink-500', accent: '#A855F7' },
  ultimate: { gradient: 'from-red-500 to-orange-500', accent: '#EF4444' },
};

function formatPrice(cents) {
  return (cents / 100).toFixed(2);
}

function PackageCard({ pkg, onPurchase, isPurchasing, isSelected }) {
  const packageType = pkg.name?.toLowerCase().split(' ')[0] || 'starter';
  const colors = PACKAGE_COLORS[packageType] || PACKAGE_COLORS.starter;
  const Icon = PACKAGE_ICONS[packageType] || Coins;

  return (
    <motion.button
      onClick={() => onPurchase(pkg)}
      disabled={isPurchasing}
      className={`
        relative w-full p-4 rounded-xl border-2 transition-all
        ${isSelected
          ? `border-${colors.accent} bg-gradient-to-br ${colors.gradient} bg-opacity-20`
          : 'border-gray-700/50 bg-gray-900/50 hover:border-gray-600'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
      whileHover={!isPurchasing ? { scale: 1.02 } : undefined}
      whileTap={!isPurchasing ? { scale: 0.98 } : undefined}
      layout
    >
      {/* Popular/Best Value badges */}
      {(pkg.popular || pkg.bestValue) && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span
            className={`
              px-3 py-1 rounded-full text-xs font-bold uppercase
              ${pkg.bestValue
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black'
              }
            `}
          >
            {pkg.bestValue ? 'Best Value' : 'Popular'}
          </span>
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={`
            p-3 rounded-xl shrink-0
            bg-gradient-to-br ${colors.gradient}
          `}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 text-left">
          <div className="text-lg font-bold text-white">{pkg.name}</div>

          {/* Credits amount */}
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-amber-300">
              {pkg.credits.toLocaleString()}
            </span>
            <span className="text-sm text-white/60">credits</span>
          </div>

          {/* Bonus indicator */}
          {pkg.bonusCredits > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <Gift className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-400 font-medium">
                +{pkg.bonusCredits.toLocaleString()} bonus ({pkg.bonusPercent}% extra!)
              </span>
            </div>
          )}

          {pkg.description && (
            <div className="text-xs text-white/40 mt-1">
              {pkg.description}
            </div>
          )}
        </div>

        {/* Price */}
        <div className="text-right shrink-0">
          <div className="text-xl font-bold text-white">
            ${formatPrice(pkg.priceCents)}
          </div>
          <div className="text-xs text-white/50">
            ${(pkg.priceCents / pkg.totalCredits).toFixed(3)}/credit
          </div>
        </div>
      </div>

      {/* Loading overlay */}
      {isPurchasing && isSelected && (
        <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      )}
    </motion.button>
  );
}

export function CreditPackageStore({
  packages = [],
  onPurchase,
  loading = false,
  error = null,
  className = '',
}) {
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [purchasing, setPurchasing] = useState(false);

  // Auto-select popular package
  useEffect(() => {
    if (packages.length > 0 && !selectedPackage) {
      const popular = packages.find(p => p.popular);
      if (popular) setSelectedPackage(popular.id);
    }
  }, [packages, selectedPackage]);

  const handlePurchase = async (pkg) => {
    if (purchasing) return;

    setSelectedPackage(pkg.id);
    setPurchasing(true);

    try {
      await onPurchase?.(pkg);
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-gray-900/50 backdrop-blur-md rounded-xl border border-gray-800 p-8 ${className}`}>
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-3" />
          <span className="text-white/60">Loading packages...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gray-900/50 backdrop-blur-md rounded-xl border border-red-800 p-8 ${className}`}>
        <div className="text-center text-red-400">
          <p>Failed to load credit packages</p>
          <p className="text-sm text-red-400/60 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900/50 backdrop-blur-md rounded-xl border border-gray-800 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20">
            <CreditCard className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Buy Credits</h3>
            <p className="text-sm text-white/50">1 penny = 1 credit</p>
          </div>
        </div>
      </div>

      {/* Packages list */}
      <div className="p-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {packages.map((pkg, index) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <PackageCard
                pkg={pkg}
                onPurchase={handlePurchase}
                isPurchasing={purchasing}
                isSelected={selectedPackage === pkg.id}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800 bg-gray-800/30">
        <div className="flex items-center gap-2 text-xs text-white/40">
          <Check className="w-4 h-4 text-green-400" />
          <span>Secure payment via Stripe</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/40 mt-1">
          <TrendingUp className="w-4 h-4 text-amber-400" />
          <span>Bigger packages = bigger bonuses!</span>
        </div>
      </div>
    </div>
  );
}

export default CreditPackageStore;
