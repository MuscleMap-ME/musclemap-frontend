/**
 * CompanionPanel
 *
 * Full companion management panel with tabs:
 * - Overview: Stats, progression, nickname
 * - Upgrades: Purchase new cosmetics and abilities
 * - Customizer: Equip owned cosmetics
 * - Settings: Visibility, sounds, tips
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCompanion } from './CompanionContext';
import CompanionCharacter from './CompanionCharacter';
import CompanionProgress from './CompanionProgress';

// Tab definitions
const TABS = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'upgrades', label: 'Upgrades', icon: '🛍️' },
  { id: 'customize', label: 'Customize', icon: '✨' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

// Category labels
const CATEGORY_LABELS = {
  aura: '✨ Auras',
  armor: '🛡️ Armor',
  wings: '🦋 Wings',
  tools: '🔧 Tools',
  badge: '🏅 Badges',
  ability: '💫 Abilities',
};

// Rarity colors
const RARITY_COLORS = {
  common: 'border-gray-500 bg-gray-500/10',
  rare: 'border-blue-500 bg-blue-500/10',
  epic: 'border-purple-500 bg-purple-500/10',
  legendary: 'border-yellow-500 bg-yellow-500/10',
};

export default function CompanionPanel({ onClose }) {
  const {
    state,
    stageName,
    upgradesData,
    updateSettings,
    setNickname,
    purchaseUpgrade,
    equipCosmetic,
    reducedMotion,
  } = useCompanion();

  const [activeTab, setActiveTab] = useState('overview');
  const [nicknameInput, setNicknameInput] = useState(state?.nickname || '');
  const [purchasing, setPurchasing] = useState(null);
  const [message, setMessage] = useState(null);

  if (!state) return null;

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSaveNickname = async () => {
    const result = await setNickname(nicknameInput);
    if (result.success) {
      showMessage('Nickname saved!');
    } else {
      showMessage(result.error || 'Failed to save', 'error');
    }
  };

  const handlePurchase = async (upgradeId) => {
    setPurchasing(upgradeId);
    const result = await purchaseUpgrade(upgradeId);
    setPurchasing(null);

    if (result.success) {
      showMessage(`Purchased ${result.upgrade.name}!`);
    } else {
      showMessage(result.error || 'Purchase failed', 'error');
    }
  };

  const handleEquip = async (slot, upgradeId) => {
    const result = await equipCosmetic(slot, upgradeId);
    if (result.success) {
      showMessage('Equipped!');
    } else {
      showMessage(result.error || 'Failed to equip', 'error');
    }
  };

  // Group upgrades by category
  const upgradesByCategory = upgradesData.upgrades.reduce((acc, upgrade) => {
    if (!acc[upgrade.category]) acc[upgrade.category] = [];
    acc[upgrade.category].push(upgrade);
    return acc;
  }, {});

  // Get owned upgrades for customization
  const ownedUpgrades = upgradesData.upgrades.filter((u) => u.isUnlocked);
  const ownedByCategory = ownedUpgrades.reduce((acc, upgrade) => {
    if (!acc[upgrade.category]) acc[upgrade.category] = [];
    acc[upgrade.category].push(upgrade);
    return acc;
  }, {});

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg max-h-[90vh] bg-gray-900 rounded-xl shadow-2xl z-50 overflow-hidden border border-purple-500/20"
        initial={reducedMotion ? {} : { opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={reducedMotion ? {} : { opacity: 0, scale: 0.9, y: 20 }}
        role="dialog"
        aria-modal="true"
        aria-label="Companion panel"
      >
        {/* Header */}
        <div className="relative h-32 bg-gradient-to-b from-purple-900/80 to-gray-900 flex items-center justify-center">
          <div className="w-20 h-20">
            <CompanionCharacter
              stage={state.stage}
              equipped={state.equipped_cosmetics}
              reducedMotion={reducedMotion}
            />
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Balance display */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 bg-black/30 rounded-lg">
            <span className="text-yellow-400">🪙</span>
            <span className="text-sm font-medium text-white">{upgradesData.balance}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-purple-400 border-b-2 border-purple-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-4 max-h-80 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {/* Progression */}
                <CompanionProgress state={state} />

                {/* Nickname */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Nickname</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={nicknameInput}
                      onChange={(e) => setNicknameInput(e.target.value)}
                      placeholder={stageName}
                      maxLength={30}
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    />
                    <button
                      onClick={handleSaveNickname}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white text-sm font-medium transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>

                {/* Stats summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <div className="text-xs text-gray-400">Current Stage</div>
                    <div className="text-lg font-bold text-white">{state.stage}/6</div>
                  </div>
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <div className="text-xs text-gray-400">Total XP</div>
                    <div className="text-lg font-bold text-white">{state.xp}</div>
                  </div>
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <div className="text-xs text-gray-400">Upgrades Owned</div>
                    <div className="text-lg font-bold text-white">{state.unlocked_upgrades.length}</div>
                  </div>
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <div className="text-xs text-gray-400">Abilities</div>
                    <div className="text-lg font-bold text-white">{state.abilities.length}</div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'upgrades' && (
              <motion.div
                key="upgrades"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {Object.entries(upgradesByCategory).map(([category, upgrades]) => (
                  <div key={category}>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">
                      {CATEGORY_LABELS[category] || category}
                    </h3>
                    <div className="space-y-2">
                      {upgrades.map((upgrade) => (
                        <div
                          key={upgrade.id}
                          className={`p-3 rounded-lg border ${RARITY_COLORS[upgrade.rarity] || RARITY_COLORS.common}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium text-white">{upgrade.name}</div>
                              <div className="text-xs text-gray-400">{upgrade.description}</div>
                            </div>
                            {upgrade.isUnlocked ? (
                              <span className="text-green-400 text-xs font-medium">Owned</span>
                            ) : upgrade.canPurchase ? (
                              <button
                                onClick={() => handlePurchase(upgrade.id)}
                                disabled={purchasing === upgrade.id}
                                className="px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded text-xs font-medium text-white disabled:opacity-50"
                              >
                                {purchasing === upgrade.id ? '...' : `${upgrade.cost_units} 🪙`}
                              </button>
                            ) : (
                              <span className="text-xs text-gray-500">{upgrade.lockReason}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === 'customize' && (
              <motion.div
                key="customize"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {Object.entries(ownedByCategory).length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    No upgrades owned yet. Visit the Upgrades tab to purchase some!
                  </div>
                ) : (
                  Object.entries(ownedByCategory).map(([category, upgrades]) => {
                    const equippedId = state.equipped_cosmetics[category];
                    return (
                      <div key={category}>
                        <h3 className="text-sm font-medium text-gray-400 mb-2">
                          {CATEGORY_LABELS[category] || category}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {/* None option */}
                          <button
                            onClick={() => handleEquip(category, null)}
                            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                              !equippedId
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                          >
                            None
                          </button>
                          {upgrades.map((upgrade) => (
                            <button
                              key={upgrade.id}
                              onClick={() => handleEquip(category, upgrade.id)}
                              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                                equippedId === upgrade.id
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                              }`}
                            >
                              {upgrade.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {/* Toggle settings */}
                {[
                  { key: 'is_visible', label: 'Show Companion', desc: 'Display companion on screen' },
                  { key: 'sounds_enabled', label: 'Sounds', desc: 'Play companion sounds' },
                  { key: 'tips_enabled', label: 'Tips', desc: 'Show training tips (requires ability)' },
                ].map((setting) => (
                  <div
                    key={setting.key}
                    className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                  >
                    <div>
                      <div className="text-sm font-medium text-white">{setting.label}</div>
                      <div className="text-xs text-gray-400">{setting.desc}</div>
                    </div>
                    <button
                      onClick={() => updateSettings({ [setting.key]: !state[setting.key] })}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        state[setting.key] ? 'bg-purple-600' : 'bg-gray-600'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                          state[setting.key] ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Message toast */}
        <AnimatePresence>
          {message && (
            <motion.div
              className={`absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm font-medium ${
                message.type === 'error' ? 'bg-red-500' : 'bg-green-500'
              } text-white shadow-lg`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
