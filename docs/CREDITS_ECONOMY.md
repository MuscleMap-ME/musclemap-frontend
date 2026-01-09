# Credits Economy System

MuscleMap features a comprehensive in-app economy built around **Credits** - a virtual currency that rewards consistent training and enables customization.

## Overview

The Credits Economy consists of several interconnected systems:

1. **Wallet** - Store and manage credits
2. **Earning** - Earn credits through workouts, achievements, and leaderboards
3. **Store** - Spend credits on cosmetics and buddy items
4. **Training Buddy** - A customizable companion that grows with you
5. **Trainer System** - Trainers can set wages and receive credits from trainees
6. **Transfers** - Send credits to other users
7. **Anti-Abuse** - Fraud detection and prevention

## Wallet

Every user has a wallet that tracks:

- **Balance** - Current spendable credits
- **Total Earned** - Lifetime credits earned
- **Total Spent** - Lifetime credits spent on store items
- **Total Transferred Out** - Credits sent to other users
- **Status** - `active`, `frozen`, or `pending_review`

### Wallet Status

| Status | Description |
|--------|-------------|
| `active` | Normal operation |
| `frozen` | Wallet suspended (admin action or fraud detection) |
| `pending_review` | Under investigation |

## Earning Credits

Credits are awarded automatically for various activities:

### Workout Completion

| Action | Credits | Description |
|--------|---------|-------------|
| `workout_complete` | 10 | Complete any workout |
| `pr_set` | 25 | Set a personal record |
| `streak_maintained` | 15 | Maintain a training streak |

### Achievements & Goals

| Action | Credits | Description |
|--------|---------|-------------|
| `achievement_earned` | Varies | Unlock an achievement (based on rarity) |
| `goal_completed` | 50 | Complete a training goal |

### Leaderboard Rewards

Top performers on daily, weekly, and monthly leaderboards receive credits:

| Rank | Daily | Weekly | Monthly |
|------|-------|--------|---------|
| 1st | 100 | 250 | 500 |
| 2nd | 75 | 175 | 350 |
| 3rd | 50 | 125 | 250 |
| 4-10 | 25 | 75 | 150 |

Leaderboard rewards are processed automatically at the end of each period.

### Skill Achievements

| Action | Credits | XP | Description |
|--------|---------|-----|-------------|
| `skill_unlock` | 50 | 100 | Achieve a gymnastics/calisthenics skill |

Skills have individual credit/XP rewards defined per-skill, with harder skills rewarding more (25-200 credits, 50-500 XP).

### Other Actions

| Action | Credits | Description |
|--------|---------|-------------|
| `first_workout` | 50 | Bonus for first workout |
| `referral_bonus` | 100 | When a referred user completes first workout |
| `daily_login` | 5 | Daily login bonus |
| `weekly_challenge` | Variable | Complete weekly challenges |

### Idempotency

All earning events are idempotent - the same event won't award credits twice. Each award is tracked with a unique `source_type` and `source_id` combination.

## Store

The store offers items purchasable with credits:

### Item Categories

- **buddy_species** - Alternative buddy species (wolf is free)
- **buddy_aura** - Aura effects for your buddy
- **buddy_armor** - Armor cosmetics
- **buddy_wings** - Wing attachments
- **buddy_tool** - Accessory items
- **buddy_skin** - Skin variants
- **buddy_emote** - Emote packs
- **buddy_voice** - Voice packs
- **buddy_ability** - Special abilities
- **profile_flair** - Profile decorations
- **profile_badge** - Display badges
- **profile_banner** - Profile banners
- **theme** - App themes
- **boost** - Temporary XP/credit boosts

### Rarity System

Items have rarity levels affecting pricing:

| Rarity | Typical Price Range |
|--------|-------------------|
| Common | 100-500 |
| Uncommon | 500-1000 |
| Rare | 1000-2500 |
| Epic | 2500-5000 |
| Legendary | 5000-10000 |

### Inventory

Purchased items are stored in the user's inventory. Items can be:
- **Consumable** - Single use
- **Permanent** - Owned forever once purchased

## Training Buddy

The Training Buddy is a customizable companion that levels up alongside your training.

### Species

8 species are available (wolf is free, others purchasable):

- Wolf (Free)
- Bear
- Eagle
- Phoenix
- Dragon
- Tiger
- Ox
- Shark

### Leveling

Buddies gain XP from your training activities:

- Workout completion: 10 XP
- PR set: 25 XP
- Streak maintained: 15 XP

XP required per level follows a curve: `100 * level^1.5`

Maximum level: 100

### Evolution Stages

Each species has 6 evolution stages:

| Stage | Min Level | Description |
|-------|-----------|-------------|
| 1 | 1 | Hatchling/Pup |
| 2 | 10 | Juvenile |
| 3 | 25 | Adolescent |
| 4 | 45 | Adult |
| 5 | 70 | Elder |
| 6 | 90 | Legendary |

Each evolution unlocks new visual features and abilities.

### Cosmetic Slots

Buddies have 7 customization slots:

1. **Aura** - Glowing effects
2. **Armor** - Protective gear
3. **Wings** - Wing attachments
4. **Tool** - Held items
5. **Skin** - Alternate appearances
6. **Emote Pack** - Reaction animations
7. **Voice Pack** - Sound effects

### Display Settings

- **Visible** - Show buddy throughout app
- **Show on Profile** - Display on public profile
- **Show in Workouts** - Show during workout sessions

## Trainer System

Trainers can monetize their expertise with credits.

### Trainer Wages

Trainers set an hourly wage in credits. When trainees complete classes:
- Wage is deducted from trainee's wallet
- Credited to trainer's wallet
- Platform may take a percentage fee

### Class Sessions

Class sessions track:
- Duration
- Participants
- Total wages paid

## Transfers

Users can transfer credits to each other with limits:

### Transfer Limits

| Period | Default Limit |
|--------|---------------|
| Daily | 1000 credits |
| Weekly | 5000 credits |
| Monthly | 15000 credits |

Transfers are subject to fraud detection.

## Anti-Abuse System

The economy includes sophisticated fraud prevention.

### Rate Limiting

Each earning action has configurable rate limits:
- Max occurrences per period
- Cooldown between occurrences

### Fraud Detection

The system automatically flags suspicious activity:

| Flag Type | Description |
|-----------|-------------|
| `rapid_earning` | Earning too many credits too fast |
| `bulk_transfers` | Many transfers in short time |
| `transfer_loop` | Credits cycling between accounts |
| `velocity` | Unusual activity velocity |
| `self_farming` | Suspected alt-account farming |
| `bot_behavior` | Automated behavior patterns |
| `collusion` | Coordinated suspicious activity |

### Flag Severity

| Severity | Action |
|----------|--------|
| Low | Logged for review |
| Medium | Rate limits applied |
| High | Wallet flagged for review |
| Critical | Wallet frozen automatically |

### Admin Actions

Admins can:
- View fraud flags
- Review and resolve flags
- Freeze/unfreeze wallets
- Adjust credit balances
- Run manual abuse checks

## API Endpoints

### Wallet

```
GET /api/wallet           - Get wallet info
GET /api/wallet/history   - Get transaction history
```

### Earning

```
POST /api/credits/earn    - Earn credits (internal)
```

### Store

```
GET /api/store/items      - List store items
GET /api/store/inventory  - User's inventory
POST /api/store/purchase  - Purchase item
```

### Buddy

```
GET /api/buddy            - Get buddy info
POST /api/buddy           - Create buddy
PUT /api/buddy/species    - Change species
PUT /api/buddy/nickname   - Set nickname
POST /api/buddy/equip     - Equip cosmetic
POST /api/buddy/unequip   - Unequip cosmetic
PUT /api/buddy/settings   - Update display settings
GET /api/buddy/evolution/:species - Get evolution path
GET /api/buddy/leaderboard - Buddy leaderboard
```

### Transfers

```
POST /api/credits/transfer - Transfer credits
GET /api/credits/transfer/limits - Get transfer limits
```

### Admin

```
GET /api/admin/wallet/:userId       - Lookup user wallet
POST /api/admin/wallet/freeze       - Freeze wallet
POST /api/admin/wallet/unfreeze     - Unfreeze wallet
POST /api/admin/credits/adjust      - Adjust balance
GET /api/admin/credits/audit        - Audit log
GET /api/admin/fraud-flags          - List fraud flags
POST /api/admin/fraud-flags         - Create manual flag
POST /api/admin/fraud-flags/:id/review - Review flag
GET /api/admin/rate-limits          - Get rate limits
PUT /api/admin/rate-limits/:action  - Update rate limits
POST /api/admin/abuse-check/:userId - Run abuse check
POST /api/admin/leaderboard-rewards/trigger - Trigger rewards
```

## Database Tables

The economy uses these tables:

- `economy_wallets` - User wallets
- `economy_ledger` - All credit transactions
- `economy_store_items` - Store catalog
- `economy_inventory` - User-owned items
- `economy_credit_actions` - Earning action definitions
- `economy_rate_limits` - Rate limit configurations
- `economy_fraud_flags` - Fraud detection flags
- `economy_admin_audit` - Admin action log
- `training_buddies` - Buddy data
- `buddy_evolution_thresholds` - Evolution stage definitions
- `earning_awards` - Award history (idempotency)

## Configuration

Environment variables:

```env
# Redis required for rate limiting (optional)
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379
```

Rate limits and credit values are stored in the database and can be adjusted via admin endpoints.

## Scheduled Jobs

The scheduler (`apps/api/src/lib/scheduler.ts`) runs periodic tasks:

- **Daily Leaderboard Rewards** - Midnight UTC
- **Weekly Leaderboard Rewards** - Monday midnight UTC
- **Monthly Leaderboard Rewards** - 1st of month midnight UTC
- **Expired Mute Cleanup** - Every hour
- **Old Fraud Flag Cleanup** - Daily (removes resolved flags > 90 days)

Jobs use distributed locking to prevent duplicate processing across multiple server instances.
