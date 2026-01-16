/**
 * DailyChallenges Component (Gamification Module)
 *
 * Re-exports the DailyChallenges component from the challenges module
 * with gamification-specific enhancements for integration with loot drops.
 *
 * @example
 * import { DailyChallenges } from '@/components/gamification';
 *
 * <DailyChallenges
 *   onChallengeComplete={(challenge, reward) => console.log('Completed:', challenge)}
 *   showTimer={true}
 *   compact={false}
 * />
 */

import { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { DailyChallenges as BaseDailyChallenges } from '../challenges/DailyChallenges';
import { useLootDrop } from '../loot/useLootDrop';
import { LOOT_TABLES, generateFromTable } from '../loot/lootTables';

/**
 * Enhanced DailyChallenges component that integrates with the loot drop system.
 * When all challenges are completed, triggers a special loot drop reward.
 */
export function DailyChallenges({
  userId = 'anonymous',
  onChallengeComplete,
  onRewardClaimed,
  showTimer: _showTimer = true,
  compact: _compact = false,
  enableLootDrops = true,
  className = '',
}) {
  const [completedCount, setCompletedCount] = useState(0);
  const { showLootDrop } = useLootDrop();

  // Handle challenge completion with loot drop integration
  const handleChallengeComplete = useCallback(
    (challenge) => {
      setCompletedCount((prev) => prev + 1);
      onChallengeComplete?.(challenge, challenge.rewards);
    },
    [onChallengeComplete]
  );

  // Handle reward claimed with optional loot drop
  const handleRewardClaimed = useCallback(
    (challenge, rewards) => {
      onRewardClaimed?.(challenge, rewards);

      // Trigger bonus loot drop after claiming all 3 challenges
      if (enableLootDrops && completedCount >= 2) {
        // Generate special daily challenge loot
        const loot = {
          id: `daily_bonus_${Date.now()}`,
          chest: {
            id: 'daily_bonus',
            name: 'Daily Challenge Bonus',
            description: 'Reward for completing all daily challenges',
          },
          items: generateFromTable(LOOT_TABLES.DAILY_CHALLENGE, 2),
          rarity: 'rare',
          timestamp: Date.now(),
        };

        // Show loot drop after a brief delay
        setTimeout(() => {
          showLootDrop(loot, {
            onClaim: (items) => {
              console.log('[Gamification] Daily challenge bonus claimed:', items);
            },
          });
        }, 1500);
      }
    },
    [onRewardClaimed, enableLootDrops, completedCount, showLootDrop]
  );

  return (
    <BaseDailyChallenges
      userId={userId}
      onChallengeComplete={handleChallengeComplete}
      onRewardClaimed={handleRewardClaimed}
      className={className}
    />
  );
}

DailyChallenges.propTypes = {
  /** User ID for personalized challenge selection */
  userId: PropTypes.string,
  /** Callback when a challenge is completed */
  onChallengeComplete: PropTypes.func,
  /** Callback when a reward is claimed */
  onRewardClaimed: PropTypes.func,
  /** Whether to show the countdown timer */
  showTimer: PropTypes.bool,
  /** Whether to use compact card variant */
  compact: PropTypes.bool,
  /** Whether to enable loot drop rewards */
  enableLootDrops: PropTypes.bool,
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default DailyChallenges;
