/**
 * CompanionContext
 *
 * Provides state management for the user's personal companion creature.
 * Uses GraphQL via Apollo Client for all data operations.
 *
 * Handles:
 * - Companion state (stage, XP, cosmetics, abilities)
 * - Upgrades and purchasing
 * - Event reactions
 * - Settings persistence
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  MASCOT_STATE_QUERY,
  MASCOT_SHOP_QUERY,
  MASCOT_PENDING_REACTIONS_QUERY,
} from '@/graphql/queries';
import {
  UPDATE_MASCOT_NICKNAME_MUTATION,
  UPDATE_MASCOT_SETTINGS_MUTATION,
  PURCHASE_MASCOT_COSMETIC_MUTATION,
  EQUIP_MASCOT_COSMETIC_MUTATION,
  MARK_MASCOT_REACTIONS_SEEN_MUTATION,
} from '@/graphql/mutations';

interface MascotProgression {
  currentXp: number;
  prevStageXp: number;
  nextStageXp: number;
  progressPercent: number;
  isMaxStage: boolean;
}

interface MascotState {
  id: string;
  userId: string;
  nickname: string | null;
  stage: number;
  xp: number;
  progression: MascotProgression;
  isVisible: boolean;
  isMinimized: boolean;
  soundsEnabled: boolean;
  tipsEnabled: boolean;
  createdAt: string;
}

interface MascotCosmetic {
  id: string;
  itemKey: string;
  name: string;
  description?: string;
  slot: string;
  rarity: string;
  price: number;
  requiredStage?: number;
  assetUrl?: string;
}

interface MascotShopItem {
  slotNumber: number;
  cosmetic: MascotCosmetic;
  discountPercent: number;
  finalPrice: number;
  expiresAt?: string;
  owned: boolean;
}

interface MascotReaction {
  id: string;
  eventId: string;
  reactionType: string;
  message: string;
  emote: string;
  animation: string;
  duration: number;
  intensity: number;
  soundEffect?: string;
  shown: boolean;
  createdAt: string;
}

interface CompanionContextType {
  // State
  state: MascotState | null;
  stageName: string;
  upgradesData: { balance: number; upgrades: MascotShopItem[] };
  events: MascotReaction[];
  reaction: MascotReaction | null;
  panelOpen: boolean;
  loading: boolean;
  error: Error | null;
  reducedMotion: boolean;

  // Actions
  setPanelOpen: (open: boolean) => void;
  updateSettings: (settings: { isVisible?: boolean; isMinimized?: boolean; soundsEnabled?: boolean; tipsEnabled?: boolean }) => Promise<void>;
  setNickname: (nickname: string) => Promise<{ success: boolean; error?: string }>;
  purchaseUpgrade: (upgradeId: string) => Promise<{ success: boolean; error?: string; upgrade?: MascotCosmetic }>;
  equipCosmetic: (slot: string, upgradeId: string) => Promise<{ success: boolean; error?: string }>;
  showReaction: (event: MascotReaction) => void;
  getNextTip: () => Promise<{ tip: string | null; reason: string }>;
  refetch: () => Promise<void>;
}

const CompanionContext = createContext<CompanionContextType | null>(null);

// Stage progression thresholds
const STAGE_NAMES: Record<number, string> = {
  1: 'Baby',
  2: 'Adolescent',
  3: 'Capable',
  4: 'Armored',
  5: 'Flying',
  6: 'Magnificent',
};

export function CompanionProvider({ children }: { children: React.ReactNode }) {
  const [reaction, setReaction] = useState<MascotReaction | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  // Check for reduced motion preference
  const reducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Fetch companion state via GraphQL
  const {
    data: stateData,
    loading: stateLoading,
    error: stateError,
    refetch: refetchState,
  } = useQuery(MASCOT_STATE_QUERY, {
    fetchPolicy: 'cache-and-network',
    skip: !localStorage.getItem('musclemap_token'),
  });

  // Fetch shop items via GraphQL
  const {
    data: shopData,
    loading: shopLoading,
    refetch: refetchShop,
  } = useQuery(MASCOT_SHOP_QUERY, {
    fetchPolicy: 'cache-and-network',
    skip: !localStorage.getItem('musclemap_token'),
  });

  // Fetch pending reactions via GraphQL
  const {
    data: reactionsData,
    refetch: refetchReactions,
  } = useQuery(MASCOT_PENDING_REACTIONS_QUERY, {
    variables: { limit: 5 },
    fetchPolicy: 'cache-and-network',
    skip: !localStorage.getItem('musclemap_token') || !stateData?.mascot?.isVisible,
    pollInterval: 30000, // Poll every 30 seconds
  });

  // Mutations
  const [updateNicknameMutation] = useMutation(UPDATE_MASCOT_NICKNAME_MUTATION);
  const [updateSettingsMutation] = useMutation(UPDATE_MASCOT_SETTINGS_MUTATION);
  const [purchaseCosmeticMutation] = useMutation(PURCHASE_MASCOT_COSMETIC_MUTATION);
  const [equipCosmeticMutation] = useMutation(EQUIP_MASCOT_COSMETIC_MUTATION);
  const [markReactionsSeenMutation] = useMutation(MARK_MASCOT_REACTIONS_SEEN_MUTATION);

  // Extract state from query response
  const state = stateData?.mascot || null;
  const loading = stateLoading || shopLoading;
  const error = stateError || null;

  // Extract events from reactions query - memoized to prevent useMemo dependency issues
  const events = useMemo(
    () => reactionsData?.mascotPendingReactions || [],
    [reactionsData?.mascotPendingReactions]
  );

  // Handle new reactions
  useEffect(() => {
    if (events.length > 0 && !reducedMotion && state?.isVisible) {
      // Show reaction for first pending event
      showReaction(events[0]);

      // Mark reactions as seen
      const reactionIds = events.map((e: MascotReaction) => e.id);
      markReactionsSeenMutation({
        variables: { reactionIds },
      }).catch(console.error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.length, reducedMotion, state?.isVisible]);

  // Show a reaction animation
  const showReaction = useCallback((event: MascotReaction) => {
    setReaction(event);
    setTimeout(() => setReaction(null), 3500);
  }, []);

  // Update settings
  const updateSettings = useCallback(async (settings: {
    isVisible?: boolean;
    isMinimized?: boolean;
    soundsEnabled?: boolean;
    tipsEnabled?: boolean;
  }) => {
    try {
      await updateSettingsMutation({
        variables: { input: settings },
        optimisticResponse: {
          updateMascotSettings: {
            ...state,
            ...settings,
            __typename: 'MascotState',
          },
        },
      });
    } catch (err) {
      console.error('Failed to update settings:', err);
      throw err;
    }
  }, [updateSettingsMutation, state]);

  // Set nickname
  const setNickname = useCallback(async (nickname: string) => {
    try {
      const { data } = await updateNicknameMutation({
        variables: { nickname },
      });

      if (data?.updateMascotNickname) {
        return { success: true };
      }

      return { success: false, error: 'Failed to update nickname' };
    } catch (err) {
      console.error('Failed to set nickname:', err);
      return { success: false, error: (err as Error).message };
    }
  }, [updateNicknameMutation]);

  // Purchase upgrade
  const purchaseUpgrade = useCallback(async (upgradeId: string) => {
    try {
      const { data } = await purchaseCosmeticMutation({
        variables: { cosmeticId: upgradeId },
      });

      if (data?.purchaseMascotCosmetic?.success) {
        await refetchState();
        await refetchShop();

        // Show reaction for purchase
        showReaction({
          id: `purchase-${upgradeId}`,
          eventId: upgradeId,
          reactionType: 'upgrade_purchased',
          message: 'New cosmetic acquired!',
          emote: '🎉',
          animation: 'celebrate',
          duration: 3000,
          intensity: 1.0,
          shown: false,
          createdAt: new Date().toISOString(),
        });

        return { success: true, upgrade: data.purchaseMascotCosmetic.cosmetic };
      }

      return {
        success: false,
        error: data?.purchaseMascotCosmetic?.error || 'Purchase failed',
      };
    } catch (err) {
      console.error('Failed to purchase upgrade:', err);
      return { success: false, error: (err as Error).message };
    }
  }, [purchaseCosmeticMutation, refetchState, refetchShop, showReaction]);

  // Equip cosmetic
  const equipCosmetic = useCallback(async (slot: string, upgradeId: string) => {
    try {
      const { data } = await equipCosmeticMutation({
        variables: { cosmeticId: upgradeId, slot },
      });

      if (data?.equipMascotCosmetic) {
        await refetchState();
        return { success: true };
      }

      return { success: false, error: 'Failed to equip cosmetic' };
    } catch (err) {
      console.error('Failed to equip cosmetic:', err);
      return { success: false, error: (err as Error).message };
    }
  }, [equipCosmeticMutation, refetchState]);

  // Get next tip - simplified, could be enhanced with a dedicated query
  const getNextTip = useCallback(async () => {
    // Tips are now part of reactions, return empty for now
    // This could be enhanced with a dedicated mascotNextTip query
    return { tip: null, reason: 'no_tips_available' };
  }, []);

  // Refetch all data
  const refetch = useCallback(async () => {
    await Promise.all([refetchState(), refetchShop(), refetchReactions()]);
  }, [refetchState, refetchShop, refetchReactions]);

  // Computed values
  const stageName = state ? STAGE_NAMES[state.stage] || 'Unknown' : '';

  // Transform shop data to match expected format
  const upgradesData = useMemo(() => ({
    balance: 0, // Balance comes from user economy, not companion
    upgrades: shopData?.mascotShop || [],
  }), [shopData]);

  const value = useMemo(() => ({
    // State
    state,
    stageName,
    upgradesData,
    events,
    reaction,
    panelOpen,
    loading,
    error,
    reducedMotion,

    // Actions
    setPanelOpen,
    updateSettings,
    setNickname,
    purchaseUpgrade,
    equipCosmetic,
    showReaction,
    getNextTip,
    refetch,
  }), [
    state,
    stageName,
    upgradesData,
    events,
    reaction,
    panelOpen,
    loading,
    error,
    reducedMotion,
    updateSettings,
    setNickname,
    purchaseUpgrade,
    equipCosmetic,
    showReaction,
    getNextTip,
    refetch,
  ]);

  return (
    <CompanionContext.Provider value={value}>
      {children}
    </CompanionContext.Provider>
  );
}

export function useCompanion() {
  const context = useContext(CompanionContext);
  if (!context) {
    throw new Error('useCompanion must be used within a CompanionProvider');
  }
  return context;
}

export default CompanionContext;
