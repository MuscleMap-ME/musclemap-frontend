import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@apollo/client/react';
import clsx from 'clsx';
import {
  BUDDY_QUERY,
  BUDDY_INVENTORY_QUERY,
  BUDDY_EVOLUTION_PATH_QUERY,
  CREDITS_BALANCE_QUERY,
  CREATE_BUDDY_MUTATION,
  UPDATE_BUDDY_MUTATION,
  UPDATE_BUDDY_NICKNAME_MUTATION,
  UPDATE_BUDDY_SETTINGS_MUTATION,
  EQUIP_BUDDY_ITEM_MUTATION,
  UNEQUIP_BUDDY_ITEM_MUTATION,
} from '../graphql';

// Types
interface Buddy {
  userId: string;
  species: string;
  nickname: string | null;
  level: number;
  xp: number;
  xpToNextLevel: number;
  stage: number;
  stageName: string;
  stageDescription: string | null;
  equippedAura: string | null;
  equippedArmor: string | null;
  equippedWings: string | null;
  equippedTool: string | null;
  equippedSkin: string | null;
  equippedEmotePack: string | null;
  equippedVoicePack: string | null;
  unlockedAbilities: string[];
  visible: boolean;
  showOnProfile: boolean;
  showInWorkouts: boolean;
  totalXpEarned: number;
  workoutsTogether: number;
  streaksWitnessed: number;
  prsCelebrated: number;
  createdAt: string;
  updatedAt: string;
}

interface BuddyInventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  slot: string | null;
  rarity: string | null;
  equipped: boolean;
  icon: string | null;
  description: string | null;
}

interface BuddyEvolutionStage {
  species: string;
  stage: number;
  minLevel: number;
  stageName: string;
  description: string | null;
  unlockedFeatures: string[];
}

const Icons = {
  Back: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7"/></svg>,
  Check: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>,
  Sparkle: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>,
  Close: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12"/></svg>,
  Edit: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>,
};

const SPECIES_CONFIG: Record<string, { emoji: string; color: string; name: string }> = {
  wolf: { emoji: '🐺', color: 'from-gray-500 to-gray-700', name: 'Wolf' },
  bear: { emoji: '🐻', color: 'from-amber-700 to-amber-900', name: 'Bear' },
  eagle: { emoji: '🦅', color: 'from-amber-500 to-amber-700', name: 'Eagle' },
  phoenix: { emoji: '🔥', color: 'from-orange-500 to-red-600', name: 'Phoenix' },
  dragon: { emoji: '🐉', color: 'from-emerald-600 to-teal-800', name: 'Dragon' },
  tiger: { emoji: '🐅', color: 'from-orange-600 to-orange-800', name: 'Tiger' },
  ox: { emoji: '🐂', color: 'from-stone-600 to-stone-800', name: 'Ox' },
  shark: { emoji: '🦈', color: 'from-blue-600 to-blue-900', name: 'Shark' },
};

const RARITY_CONFIG: Record<string, { label: string; color: string; border: string; bg: string }> = {
  common: { label: 'Common', color: 'from-gray-500 to-gray-600', border: 'border-gray-500/30', bg: 'bg-gray-500/10' },
  uncommon: { label: 'Uncommon', color: 'from-green-500 to-emerald-600', border: 'border-green-500/30', bg: 'bg-green-500/10' },
  rare: { label: 'Rare', color: 'from-blue-500 to-cyan-600', border: 'border-blue-500/30', bg: 'bg-blue-500/10' },
  epic: { label: 'Epic', color: 'from-purple-500 to-violet-600', border: 'border-purple-500/30', bg: 'bg-purple-500/10' },
  legendary: { label: 'Legendary', color: 'from-amber-400 to-orange-500', border: 'border-amber-500/30', bg: 'bg-amber-500/10' },
};

const COSMETIC_SLOTS = [
  { key: 'aura', label: 'Aura', category: 'buddy_aura' },
  { key: 'armor', label: 'Armor', category: 'buddy_armor' },
  { key: 'wings', label: 'Wings', category: 'buddy_wings' },
  { key: 'tool', label: 'Tool', category: 'buddy_tool' },
  { key: 'skin', label: 'Skin', category: 'buddy_skin' },
  { key: 'emote_pack', label: 'Emotes', category: 'buddy_emote' },
  { key: 'voice_pack', label: 'Voice', category: 'buddy_voice' },
];

export default function Buddy() {
  const [activeTab, setActiveTab] = useState('overview');
  const [_selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showSpeciesModal, setShowSpeciesModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingNickname, setEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [snackbar, setSnackbar] = useState({ show: false, message: '', type: 'success' });

  // GraphQL Queries
  const { data: buddyData, loading: buddyLoading, refetch: refetchBuddy } = useQuery<{ buddy: Buddy | null }>(
    BUDDY_QUERY,
    { fetchPolicy: 'cache-and-network' }
  );

  const { data: inventoryData, refetch: refetchInventory } = useQuery<{ buddyInventory: BuddyInventoryItem[] }>(
    BUDDY_INVENTORY_QUERY,
    { fetchPolicy: 'cache-and-network' }
  );

  const { data: walletData } = useQuery<{ creditsBalance: { balance: number } }>(
    CREDITS_BALANCE_QUERY,
    { fetchPolicy: 'cache-and-network' }
  );

  const { data: evolutionData } = useQuery<{ buddyEvolutionPath: BuddyEvolutionStage[] }>(
    BUDDY_EVOLUTION_PATH_QUERY,
    {
      variables: { species: buddyData?.buddy?.species || 'wolf' },
      skip: !buddyData?.buddy?.species,
      fetchPolicy: 'cache-and-network',
    }
  );

  // GraphQL Mutations
  const [createBuddyMutation] = useMutation(CREATE_BUDDY_MUTATION, {
    onCompleted: () => {
      refetchBuddy();
      refetchInventory();
      setShowCreateModal(false);
      showSnackbar('Training buddy created!', 'success');
    },
    onError: () => showSnackbar('Failed to create buddy', 'error'),
  });

  const [changeSpeciesMutation] = useMutation(UPDATE_BUDDY_MUTATION, {
    onCompleted: () => {
      refetchBuddy();
      setShowSpeciesModal(false);
      showSnackbar('Species changed!', 'success');
    },
    onError: () => showSnackbar('Failed to change species', 'error'),
  });

  const [updateNicknameMutation] = useMutation(UPDATE_BUDDY_NICKNAME_MUTATION, {
    onCompleted: () => {
      refetchBuddy();
      setEditingNickname(false);
      showSnackbar('Nickname updated!', 'success');
    },
    onError: () => showSnackbar('Failed to update nickname', 'error'),
  });

  const [updateSettingsMutation] = useMutation(UPDATE_BUDDY_SETTINGS_MUTATION, {
    onCompleted: () => {
      refetchBuddy();
      showSnackbar('Settings updated!', 'success');
    },
    onError: () => showSnackbar('Failed to update settings', 'error'),
  });

  const [equipCosmeticMutation] = useMutation(EQUIP_BUDDY_ITEM_MUTATION, {
    onCompleted: () => {
      refetchBuddy();
      refetchInventory();
      setSelectedSlot(null);
      showSnackbar('Cosmetic equipped!', 'success');
    },
    onError: () => showSnackbar('Failed to equip cosmetic', 'error'),
  });

  const [unequipCosmeticMutation] = useMutation(UNEQUIP_BUDDY_ITEM_MUTATION, {
    onCompleted: () => {
      refetchBuddy();
      refetchInventory();
      showSnackbar('Cosmetic unequipped!', 'success');
    },
    onError: () => showSnackbar('Failed to unequip cosmetic', 'error'),
  });

  const buddy = buddyData?.buddy;
  const inventory = inventoryData?.buddyInventory || [];
  const evolutionPath = evolutionData?.buddyEvolutionPath || [];
  const walletBalance = walletData?.creditsBalance?.balance || 0;

  const createBuddy = (species: string) => {
    createBuddyMutation({ variables: { input: { species } } });
  };

  const changeSpecies = (species: string) => {
    changeSpeciesMutation({ variables: { species } });
  };

  const updateNickname = () => {
    updateNicknameMutation({ variables: { nickname: newNickname || null } });
  };

  const equipCosmetic = (sku: string, slot: string) => {
    equipCosmeticMutation({ variables: { sku, slot } });
  };

  const unequipCosmetic = (slot: string) => {
    unequipCosmeticMutation({ variables: { slot } });
  };

  const toggleVisibility = (setting: string, value: boolean) => {
    updateSettingsMutation({ variables: { input: { [setting]: value } } });
  };

  const showSnackbar = (message: string, type: string) => {
    setSnackbar({ show: true, message, type });
    setTimeout(() => setSnackbar({ show: false, message: '', type: 'success' }), 3000);
  };

  const getEquippedItem = (slot: string) => {
    const slotKey = slot === 'emote_pack' ? 'equippedEmotePack' :
                    slot === 'voice_pack' ? 'equippedVoicePack' :
                    `equipped${slot.charAt(0).toUpperCase() + slot.slice(1)}`;
    const equippedSku = buddy?.[slotKey as keyof Buddy];
    if (!equippedSku || typeof equippedSku !== 'string') return null;
    return inventory.find(i => i.sku === equippedSku);
  };

  const getAvailableItems = (slot: string) => {
    const slotConfig = COSMETIC_SLOTS.find(s => s.key === slot);
    if (!slotConfig) return [];
    return inventory.filter(i => i.category?.includes(slotConfig.category.replace('buddy_', '')));
  };

  const xpProgress = buddy ? (buddy.xp / buddy.xpToNextLevel) * 100 : 0;
  const speciesConfig = buddy ? SPECIES_CONFIG[buddy.species] : null;

  if (buddyLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!buddy) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        <header className="sticky top-0 z-40 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-white/5">
                <Icons.Back />
              </Link>
              <h1 className="text-xl font-semibold">Training Buddy</h1>
            </div>
          </div>
        </header>

        <main className="max-w-md mx-auto px-4 py-16 text-center">
          <div className="text-8xl mb-6">🐺</div>
          <h2 className="text-2xl font-bold mb-4">Choose Your Training Companion</h2>
          <p className="text-gray-400 mb-8">
            Your training buddy will accompany you on your fitness journey, celebrating your victories and pushing you to be better.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-8 py-3 bg-violet-600 hover:bg-violet-700 rounded-xl font-semibold transition-all"
          >
            Choose Your Buddy
          </button>
        </main>

        {/* Create Buddy Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowCreateModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden"
              >
                <div className="p-6">
                  <h2 className="text-xl font-bold mb-4">Choose Your Companion</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(SPECIES_CONFIG).map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() => createBuddy(key)}
                        className={clsx(
                          'p-4 rounded-xl bg-gradient-to-br transition-all hover:scale-105',
                          config.color
                        )}
                      >
                        <div className="text-4xl mb-2">{config.emoji}</div>
                        <div className="font-semibold">{config.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-white/5">
              <Icons.Back />
            </Link>
            <h1 className="text-xl font-semibold">Training Buddy</h1>
          </div>
          <Link to="/wallet" className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all">
            <Icons.Sparkle />
            <span className="font-semibold">{walletBalance}</span>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Buddy Card */}
        <div className={clsx(
          'rounded-2xl p-6 mb-6 bg-gradient-to-br relative overflow-hidden',
          speciesConfig?.color || 'from-violet-600 to-violet-800'
        )}>
          <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
            <div className="text-[12rem] leading-none">{speciesConfig?.emoji}</div>
          </div>

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-5xl">{speciesConfig?.emoji}</span>
                  <div>
                    {editingNickname ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newNickname}
                          onChange={(e) => setNewNickname(e.target.value)}
                          placeholder="Enter nickname"
                          className="px-3 py-1 bg-black/30 border border-white/20 rounded-lg text-white placeholder-white/50"
                          maxLength={30}
                        />
                        <button onClick={updateNickname} className="p-1 hover:bg-white/20 rounded">
                          <Icons.Check />
                        </button>
                        <button onClick={() => setEditingNickname(false)} className="p-1 hover:bg-white/20 rounded">
                          <Icons.Close />
                        </button>
                      </div>
                    ) : (
                      <h2 className="text-2xl font-bold flex items-center gap-2">
                        {buddy.nickname || speciesConfig?.name}
                        <button onClick={() => { setNewNickname(buddy.nickname || ''); setEditingNickname(true); }} className="p-1 hover:bg-white/20 rounded">
                          <Icons.Edit />
                        </button>
                      </h2>
                    )}
                    <p className="text-white/70">Level {buddy.level} {speciesConfig?.name}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowSpeciesModal(true)}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-all"
              >
                Change Species
              </button>
            </div>

            {/* XP Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>XP Progress</span>
                <span>{buddy.xp} / {buddy.xpToNextLevel}</span>
              </div>
              <div className="h-3 bg-black/30 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${xpProgress}%` }}
                  className="h-full bg-white/80 rounded-full"
                />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-black/20 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold">{buddy.level}</div>
                <div className="text-xs text-white/70">Level</div>
              </div>
              <div className="bg-black/20 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold">{buddy.stage}</div>
                <div className="text-xs text-white/70">Stage</div>
              </div>
              <div className="bg-black/20 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold">{buddy.totalXpEarned || 0}</div>
                <div className="text-xs text-white/70">Total XP</div>
              </div>
              <div className="bg-black/20 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold">{buddy.workoutsTogether || 0}</div>
                <div className="text-xs text-white/70">Workouts</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-6">
          {['overview', 'cosmetics', 'evolution', 'settings'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'flex-1 py-2.5 text-sm font-medium rounded-lg transition-all capitalize',
                activeTab === tab ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Equipped Items */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Equipped Cosmetics</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {COSMETIC_SLOTS.map(slot => {
                  const equipped = getEquippedItem(slot.key);
                  return (
                    <div
                      key={slot.key}
                      className="bg-white/5 rounded-xl p-4 text-center cursor-pointer hover:bg-white/10 transition-all"
                      onClick={() => setSelectedSlot(slot.key)}
                    >
                      <div className="text-xs text-gray-400 mb-2">{slot.label}</div>
                      {equipped ? (
                        <>
                          <div className={clsx(
                            'text-xs px-2 py-0.5 rounded-full mb-2 inline-block bg-gradient-to-r text-white',
                            RARITY_CONFIG[equipped.rarity || 'common']?.color || 'from-gray-500 to-gray-600'
                          )}>
                            {RARITY_CONFIG[equipped.rarity || 'common']?.label || 'Common'}
                          </div>
                          <div className="font-medium text-sm truncate">{equipped.name}</div>
                        </>
                      ) : (
                        <div className="text-gray-500 text-sm">Empty</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Training Stats</h3>
              <div className="bg-white/5 rounded-xl p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">PRs Celebrated</span>
                  <span className="font-medium">{buddy.prsCelebrated || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Streaks Witnessed</span>
                  <span className="font-medium">{buddy.streaksWitnessed || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Workouts Together</span>
                  <span className="font-medium">{buddy.workoutsTogether || 0}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cosmetics' && (
          <div className="space-y-6">
            {COSMETIC_SLOTS.map(slot => {
              const items = getAvailableItems(slot.key);
              const equipped = getEquippedItem(slot.key);

              return (
                <div key={slot.key}>
                  <h3 className="text-lg font-semibold mb-3">{slot.label}</h3>
                  {items.length === 0 ? (
                    <div className="bg-white/5 rounded-xl p-6 text-center text-gray-400">
                      No {slot.label.toLowerCase()} items owned. <Link to="/store" className="text-violet-400 hover:underline">Visit Store</Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {items.map(item => {
                        const isEquipped = equipped?.sku === item.sku;
                        const rarity = RARITY_CONFIG[item.rarity || 'common'] || RARITY_CONFIG.common;

                        return (
                          <div
                            key={item.sku}
                            className={clsx(
                              'rounded-xl border p-4 cursor-pointer transition-all',
                              isEquipped ? 'border-violet-500 bg-violet-500/20' : rarity.border,
                              rarity.bg
                            )}
                            onClick={() => isEquipped ? unequipCosmetic(slot.key) : equipCosmetic(item.sku, slot.key)}
                          >
                            {isEquipped && (
                              <div className="flex items-center gap-1 text-violet-400 text-xs mb-2">
                                <Icons.Check /> Equipped
                              </div>
                            )}
                            <span className={clsx(
                              'text-xs px-2 py-0.5 rounded-full bg-gradient-to-r text-white',
                              rarity.color
                            )}>
                              {rarity.label}
                            </span>
                            <div className="font-medium mt-2">{item.name}</div>
                            <div className="text-xs text-gray-400 mt-1 line-clamp-2">{item.description}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'evolution' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Evolution Path</h3>
            {evolutionPath.map((stage) => {
              const isUnlocked = buddy.level >= stage.minLevel;
              const isCurrent = buddy.stage === stage.stage;

              return (
                <div
                  key={stage.stage}
                  className={clsx(
                    'flex items-center gap-4 p-4 rounded-xl transition-all',
                    isCurrent ? 'bg-violet-500/20 border border-violet-500' :
                    isUnlocked ? 'bg-white/5' : 'bg-white/5 opacity-50'
                  )}
                >
                  <div className={clsx(
                    'w-12 h-12 rounded-full flex items-center justify-center text-2xl',
                    isUnlocked ? 'bg-violet-600' : 'bg-gray-700'
                  )}>
                    {isUnlocked ? speciesConfig?.emoji : '🔒'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{stage.stageName}</span>
                      {isCurrent && <span className="text-xs bg-violet-600 px-2 py-0.5 rounded-full">Current</span>}
                    </div>
                    <div className="text-sm text-gray-400">{stage.description}</div>
                    <div className="text-xs text-gray-500 mt-1">Level {stage.minLevel}+</div>
                  </div>
                  {isUnlocked && (
                    <Icons.Check />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Display Settings</h3>

            <div className="bg-white/5 rounded-xl divide-y divide-white/5">
              <div className="flex items-center justify-between p-4">
                <div>
                  <div className="font-medium">Show Buddy</div>
                  <div className="text-sm text-gray-400">Display your buddy throughout the app</div>
                </div>
                <button
                  onClick={() => toggleVisibility('visible', !buddy.visible)}
                  className={clsx(
                    'w-12 h-7 rounded-full transition-all relative',
                    buddy.visible ? 'bg-violet-600' : 'bg-gray-700'
                  )}
                >
                  <div className={clsx(
                    'w-5 h-5 rounded-full bg-white absolute top-1 transition-all',
                    buddy.visible ? 'right-1' : 'left-1'
                  )} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4">
                <div>
                  <div className="font-medium">Show on Profile</div>
                  <div className="text-sm text-gray-400">Display buddy on your public profile</div>
                </div>
                <button
                  onClick={() => toggleVisibility('showOnProfile', !buddy.showOnProfile)}
                  className={clsx(
                    'w-12 h-7 rounded-full transition-all relative',
                    buddy.showOnProfile ? 'bg-violet-600' : 'bg-gray-700'
                  )}
                >
                  <div className={clsx(
                    'w-5 h-5 rounded-full bg-white absolute top-1 transition-all',
                    buddy.showOnProfile ? 'right-1' : 'left-1'
                  )} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4">
                <div>
                  <div className="font-medium">Show in Workouts</div>
                  <div className="text-sm text-gray-400">Display buddy during workout sessions</div>
                </div>
                <button
                  onClick={() => toggleVisibility('showInWorkouts', !buddy.showInWorkouts)}
                  className={clsx(
                    'w-12 h-7 rounded-full transition-all relative',
                    buddy.showInWorkouts ? 'bg-violet-600' : 'bg-gray-700'
                  )}
                >
                  <div className={clsx(
                    'w-5 h-5 rounded-full bg-white absolute top-1 transition-all',
                    buddy.showInWorkouts ? 'right-1' : 'left-1'
                  )} />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Species Change Modal */}
      <AnimatePresence>
        {showSpeciesModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowSpeciesModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6">
                <h2 className="text-xl font-bold mb-2">Change Species</h2>
                <p className="text-gray-400 text-sm mb-4">Your buddy will keep all progress and cosmetics.</p>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(SPECIES_CONFIG).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => changeSpecies(key)}
                      disabled={key === buddy.species}
                      className={clsx(
                        'p-4 rounded-xl bg-gradient-to-br transition-all',
                        key === buddy.species ? 'opacity-50 cursor-not-allowed ring-2 ring-white' : 'hover:scale-105',
                        config.color
                      )}
                    >
                      <div className="text-4xl mb-2">{config.emoji}</div>
                      <div className="font-semibold">{config.name}</div>
                      {key === buddy.species && <div className="text-xs opacity-70">Current</div>}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Snackbar */}
      <AnimatePresence>
        {snackbar.show && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={clsx(
              'fixed bottom-4 left-4 right-4 mx-auto max-w-md px-4 py-3 rounded-xl text-center font-medium z-50',
              snackbar.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            )}
          >
            {snackbar.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
