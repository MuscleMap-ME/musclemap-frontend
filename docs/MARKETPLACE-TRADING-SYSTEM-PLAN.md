# MuscleMap Marketplace & Cosmetics Trading System

## Executive Summary

This document outlines a comprehensive marketplace and trading system for MuscleMap that enables users to collect, buy, trade, sell, and showcase cosmetics, skins, and accessories. The system is designed to:

1. **Drive Engagement** - Create desire through scarcity, social proof, and collection mechanics
2. **Encourage Healthy Behavior** - Tie earning potential to exercise, nutrition, and sleep habits
3. **Foster Social Interaction** - Enable trading, gifting, and group activities around cosmetics
4. **Build Economy** - Create a sustainable credit-based economy with meaningful progression

---

## Table of Contents

1. [Core Systems Overview](#1-core-systems-overview)
2. [Marketplace Features](#2-marketplace-features)
3. [Trading System](#3-trading-system)
4. [Auction House](#4-auction-house)
5. [Collection & Showcase System](#5-collection--showcase-system)
6. [Behavioral Incentive Integration](#6-behavioral-incentive-integration)
7. [Social & Group Features](#7-social--group-features)
8. [Rarity & Scarcity Mechanics](#8-rarity--scarcity-mechanics)
9. [Database Schema](#9-database-schema)
10. [API Endpoints](#10-api-endpoints)
11. [Frontend Pages & Components](#11-frontend-pages--components)
12. [Gamification & Progression](#12-gamification--progression)
13. [Anti-Abuse & Economy Protection](#13-anti-abuse--economy-protection)
14. [Implementation Phases](#14-implementation-phases)

---

## 1. Core Systems Overview

### 1.1 Cosmetic Categories

Building on the existing spirit animal wardrobe system, expand to include:

| Category | Slot Type | Examples | Trading |
|----------|-----------|----------|---------|
| **Skins** | Single | Character/avatar skins, color variants | Yes |
| **Eyes** | Single | Eye colors, glowing effects, special patterns | Yes |
| **Outfits** | Single | Athletic wear, armor, formal, fantasy | Yes |
| **Headwear** | Single | Caps, crowns, halos, helmets | Yes |
| **Footwear** | Single | Sneakers, boots, special effects | Yes |
| **Accessories** | 3 slots | Belts, wings, capes, tattoos, auras | Yes |
| **Auras** | Single | Particle effects, glows, trails | Yes |
| **Emotes** | 2 slots | Victory dances, gestures, celebrations | Yes |
| **Backgrounds** | Single | Profile backgrounds, scene setups | Yes |
| **Frames** | Single | Profile picture frames | Yes |
| **Badges** | 5 slots | Achievement badges, event badges | Some |
| **Titles** | Single | Display titles under username | Yes |
| **Nameplates** | Single | Username styling/decoration | Yes |
| **Workout Cards** | Single | Customize workout summary appearance | Yes |
| **Leaderboard Flair** | Single | Special effects on leaderboard entries | Yes |
| **Sounds** | Multiple | Victory sounds, notification sounds | Yes |
| **Companion Skins** | Single | Training buddy visual overhaul | Yes |
| **Companion Accessories** | 3 slots | Buddy armor, tools, effects | Yes |

### 1.2 Rarity Tiers

```
┌─────────────────────────────────────────────────────────────────────┐
│  RARITY DISTRIBUTION                                                │
├─────────────────────────────────────────────────────────────────────┤
│  Common     (40%)  - Gray    - Base price: 50-200 credits          │
│  Uncommon   (25%)  - Green   - Base price: 200-500 credits         │
│  Rare       (18%)  - Blue    - Base price: 500-1,500 credits       │
│  Epic       (12%)  - Purple  - Base price: 1,500-5,000 credits     │
│  Legendary  (4%)   - Gold    - Base price: 5,000-15,000 credits    │
│  Mythic     (0.9%) - Red     - Base price: 15,000-50,000 credits   │
│  Divine     (0.1%) - Rainbow - Base price: 50,000+ credits         │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 Acquisition Methods

| Method | Description | Tradeable |
|--------|-------------|-----------|
| **Store Purchase** | Buy with credits from official store | Yes |
| **Marketplace Purchase** | Buy from other players | Yes |
| **Auction Win** | Win from player auctions | Yes |
| **Trade** | Direct trade with another player | Yes |
| **Gift** | Receive as gift from another player | Yes |
| **Achievement Unlock** | Earned through achievements | No |
| **Event Reward** | Seasonal/event exclusive | Time-limited |
| **Competition Prize** | Tournament/challenge rewards | Yes |
| **Mystery Box** | Random from loot boxes | Yes |
| **Crafting** | Combine items to create new ones | Yes |
| **Workout Reward** | Earned through exercise | Yes |
| **Daily Login** | Login streak rewards | Yes |
| **Referral Bonus** | Referring new users | Yes |
| **Crew Reward** | Crew challenge rewards | Yes |

---

## 2. Marketplace Features

### 2.1 Marketplace Types

#### 2.1.1 Official Store
- **Daily Rotation Shop** (12 items, refreshes every 24 hours)
  - 2 Featured items (15-30% discount)
  - 4 Random rare+ items
  - 6 Random common/uncommon items
- **Full Catalog** (browse all purchasable items)
- **Flash Sales** (2-hour limited offers, 50% off)
- **Bundle Deals** (themed sets at discount)
- **First-Time Purchase Bonus** (bonus item on first store purchase)

#### 2.1.2 Player Marketplace
- **Buy Now Listings** - Fixed price, instant purchase
- **Make Offer** - Negotiate price with seller
- **Bulk Listings** - List multiple items together
- **Reserved Listings** - Private listings for specific users

#### 2.1.3 Auction House
- **Standard Auctions** (1-7 day duration)
- **Quick Auctions** (1-24 hour duration)
- **Blind Auctions** (sealed bids, highest wins)
- **Dutch Auctions** (price decreases over time)
- **Reserve Auctions** (minimum price threshold)

### 2.2 Marketplace Listing Features

```typescript
interface MarketplaceListing {
  id: string;
  sellerId: string;
  cosmeticId: string;

  // Pricing
  listingType: 'buy_now' | 'auction' | 'offer_only' | 'reserved';
  price: number;              // Buy now price
  minOffer?: number;          // Minimum acceptable offer
  reservePrice?: number;      // Auction reserve

  // Auction specific
  auctionEndTime?: Date;
  startingBid?: number;
  currentBid?: number;
  bidIncrement?: number;

  // Listing options
  allowOffers: boolean;
  reservedForUserId?: string;
  expiresAt: Date;

  // Metadata
  quantity: number;           // For stackable items
  bundleItems?: string[];     // For bundle listings
  sellerNote?: string;

  // Stats
  viewCount: number;
  watchlistCount: number;
  offerCount: number;
}
```

### 2.3 Search & Discovery

- **Category Filters** - Filter by cosmetic type
- **Rarity Filters** - Filter by rarity tier
- **Price Range** - Min/max price slider
- **Sort Options** - Price, time listed, popularity, rarity
- **Search** - Full text search on name/description
- **Recommendations** - "Users who bought X also bought Y"
- **Recently Viewed** - Quick access to browsing history
- **Wishlist** - Save items for later
- **Price Alerts** - Notify when item drops below threshold
- **New Arrivals** - Highlight recently listed items

### 2.4 Seller Features

- **Listing History** - View all past listings
- **Active Listings** - Manage current listings
- **Bulk List** - List multiple items at once
- **Price Suggestions** - AI-suggested pricing based on market
- **Relisting** - Quick relist expired items
- **Sales Analytics** - Track sales performance
- **Seller Rating** - Build reputation over time
- **Verified Seller Badge** - For high-volume trusted sellers

### 2.5 Buyer Features

- **Purchase History** - View all purchases
- **Watchlist** - Track items without buying
- **Saved Searches** - Quick access to frequent searches
- **Price Comparison** - See price history for items
- **Offer Management** - Track outstanding offers
- **Buyer Protection** - Dispute resolution system

---

## 3. Trading System

### 3.1 Direct P2P Trading

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRADE INTERFACE                               │
├─────────────────┬───────────────────────────────────────────────┤
│   YOUR OFFER    │            THEIR OFFER                        │
├─────────────────┼───────────────────────────────────────────────┤
│ [Item 1]  Epic  │  [Item A]  Legendary                          │
│ [Item 2]  Rare  │  [Item B]  Epic                               │
│ [Item 3]  Rare  │                                               │
│                 │                                               │
│ + 500 credits   │  + 0 credits                                  │
├─────────────────┴───────────────────────────────────────────────┤
│  Total Value: 3,200    │    Total Value: 4,500                  │
│  Trade Value: -1,300   │    [ACCEPT] [COUNTER] [DECLINE]        │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Trade Features

- **Item + Credits Trades** - Combine items and credits in trades
- **Multi-Item Trades** - Trade multiple items at once (up to 10 each side)
- **Trade Value Calculator** - Show estimated market value
- **Trade History** - Full audit trail of all trades
- **Trade Reputation** - Build trust score from successful trades
- **Counter-Offers** - Negotiate back and forth
- **Trade Expiration** - Offers expire after 48 hours
- **Trade Lock** - Lock items once trade is accepted (15-minute window)
- **Trade Confirmation** - Two-step confirmation for high-value trades

### 3.3 Trade Request System

```typescript
interface TradeRequest {
  id: string;
  initiatorId: string;
  receiverId: string;
  status: 'pending' | 'countered' | 'accepted' | 'declined' | 'expired' | 'completed' | 'cancelled';

  // Offer details
  initiatorItems: string[];  // Cosmetic IDs
  initiatorCredits: number;
  receiverItems: string[];
  receiverCredits: number;

  // Metadata
  message?: string;
  counterCount: number;      // Track back-and-forth
  createdAt: Date;
  expiresAt: Date;
  completedAt?: Date;

  // Value tracking
  initiatorEstimatedValue: number;
  receiverEstimatedValue: number;
}
```

### 3.4 Trade Safety Features

- **Trade Lock Period** - Items locked during pending trades
- **High-Value Trade Verification** - Extra confirmation for trades over 10,000 credits
- **Scam Prevention** - Warning for trades with large value discrepancy
- **Cooldown Period** - 24-hour cooldown for newly acquired items
- **Block List** - Block users from sending trade requests
- **Report System** - Report suspicious trading behavior
- **Trade Rollback** - Admin ability to reverse fraudulent trades

---

## 4. Auction House

### 4.1 Auction Types

#### Standard Auction
- Seller sets starting bid and duration
- Highest bid wins when time expires
- Optional reserve price (hidden minimum)
- Optional Buy Now price (instant purchase)

#### Dutch Auction
- Seller sets high starting price
- Price decreases over time
- First bid at current price wins
- Creates urgency and FOMO

#### Blind Auction
- All bids are hidden
- Bidders submit sealed bids
- Highest bid revealed at end
- Creates uncertainty and strategic bidding

#### Group Auction
- Multiple identical items auctioned
- Multiple winners at different prices
- Good for selling bulk inventory

### 4.2 Auction Features

```typescript
interface Auction {
  id: string;
  sellerId: string;
  cosmeticId: string;

  auctionType: 'standard' | 'dutch' | 'blind' | 'group';

  // Pricing
  startingBid: number;
  currentBid?: number;
  reservePrice?: number;
  buyNowPrice?: number;
  bidIncrement: number;

  // Dutch auction specific
  priceDecrement?: number;
  decrementInterval?: number;  // Minutes
  floorPrice?: number;

  // Timing
  startTime: Date;
  endTime: Date;

  // Status
  status: 'scheduled' | 'active' | 'ended' | 'sold' | 'no_sale' | 'cancelled';
  winnerId?: string;
  winningBid?: number;

  // Metadata
  quantity: number;
  description?: string;
  featured: boolean;
}
```

### 4.3 Bidding Features

- **Proxy Bidding** - Set max bid, system bids incrementally
- **Bid Sniping Protection** - Extend auction 5 minutes if bid in final minute
- **Bid History** - View all bids on an auction
- **Outbid Notifications** - Instant notification when outbid
- **Watchlist** - Track auctions without bidding
- **Bid Limits** - Maximum active bids based on reputation
- **Bid Retraction** - Retract within 1 hour (with penalty)

### 4.4 Featured Auctions

- **Daily Featured** - 3 auctions highlighted on homepage
- **Ending Soon** - Auctions ending within 1 hour
- **Hot Auctions** - Most bids in last hour
- **New Listings** - Recently started auctions
- **Legendary+ Only** - High-end item auctions

---

## 5. Collection & Showcase System

### 5.1 Collection Tracking

```
┌─────────────────────────────────────────────────────────────────┐
│                    MY COLLECTION                                 │
├─────────────────────────────────────────────────────────────────┤
│  Overall Progress: 234/1,247 (18.8%)                            │
│  [████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 18.8%        │
├─────────────────────────────────────────────────────────────────┤
│  SKINS           42/156  [██████████░░░░░░░░░░░░░░░] 26.9%     │
│  OUTFITS         28/89   [█████████████░░░░░░░░░░░░] 31.5%     │
│  HEADWEAR        15/67   [████████░░░░░░░░░░░░░░░░░] 22.4%     │
│  ACCESSORIES     45/234  [█████████░░░░░░░░░░░░░░░░] 19.2%     │
│  AURAS           12/78   [██████░░░░░░░░░░░░░░░░░░░] 15.4%     │
│  EMOTES          22/112  [█████████░░░░░░░░░░░░░░░░] 19.6%     │
│  ...                                                             │
├─────────────────────────────────────────────────────────────────┤
│  COLLECTION VALUE: 847,500 credits                              │
│  RAREST ITEM: "Divine Phoenix Wings" (Divine)                   │
│  MOST RECENT: "Midnight Stalker Skin" (Epic)                    │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Collection Sets

Group related items into sets with bonus rewards:

```typescript
interface CollectionSet {
  id: string;
  name: string;
  description: string;
  theme: string;  // "Halloween 2024", "Warrior", "Cyberpunk", etc.

  items: string[];  // Cosmetic IDs in set

  // Rewards for partial/full completion
  rewards: {
    threshold: number;  // Percentage complete
    reward: {
      type: 'credits' | 'cosmetic' | 'title' | 'badge' | 'xp';
      value: string | number;
    };
  }[];

  // Metadata
  isLimited: boolean;        // Can no longer be completed
  releaseDate: Date;
  expirationDate?: Date;
}
```

**Example Sets:**
- **Warrior Collection** (12 items) - Complete for "Warrior" title
- **Beast Master** (8 companion items) - Complete for exclusive aura
- **Halloween 2024** (15 items) - Limited time, exclusive badge
- **Fitness Fanatic** (20 items) - Exercise-themed items
- **Rainbow Collection** (7 items) - One item of each rarity
- **First Edition** (100 items) - All launch items

### 5.3 Showcase Features

#### Profile Showcase
Dedicated section on user profile to display prized items:

- **3 Featured Items** - Pin most impressive items
- **Showcase Layout** - Choose grid/carousel/spotlight layout
- **Showcase Effects** - Animated backgrounds for showcase
- **Collection Highlights** - Show set completion badges
- **Wealth Display** - Show total collection value (optional)
- **Rarity Breakdown** - Visual of rarity distribution

#### Trophy Case
Special display for rare achievements:

- **Competition Trophies** - Tournament wins
- **Event Exclusives** - Seasonal items
- **First Edition Items** - Day-one purchases
- **Divine/Mythic Items** - Ultra-rare showcase
- **Achievement Items** - Non-tradeable accomplishments

### 5.4 Collection Milestones

| Milestone | Requirement | Reward |
|-----------|-------------|--------|
| Collector I | Own 10 items | 100 credits |
| Collector II | Own 50 items | 500 credits + "Collector" badge |
| Collector III | Own 100 items | 1,000 credits |
| Collector IV | Own 250 items | 2,500 credits + "Hoarder" title |
| Collector V | Own 500 items | 5,000 credits |
| Completionist | Own 75% of items | 10,000 credits + Exclusive frame |
| Set Master | Complete 5 sets | "Set Master" title |
| Rarity Hunter | Own 1 of each rarity | Rainbow badge |

---

## 6. Behavioral Incentive Integration

### 6.1 Exercise → Earning Connection

The core philosophy: **Better health habits = More earning potential = Better cosmetics**

```
┌─────────────────────────────────────────────────────────────────┐
│           HEALTHY BEHAVIOR EARNING MULTIPLIERS                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  BASE EARNING:     1x (normal credit earning rate)              │
│                                                                  │
│  WORKOUT STREAK:   +10% per day (max +70% at 7 days)            │
│  SLEEP SCORE:      +5% per 10 points above 70 (max +15%)        │
│  NUTRITION SCORE:  +5% per 10 points above 70 (max +15%)        │
│  HYDRATION:        +5% if daily goal met                        │
│  STEP COUNT:       +5% if daily goal met                        │
│                                                                  │
│  MAXIMUM MULTIPLIER: 2.1x (110% bonus)                          │
│                                                                  │
│  Your Current Multiplier: 1.65x                                 │
│  [████████████████████████████░░░░░░░░░░░] 65% of max           │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Workout-Gated Content

Certain cosmetics require minimum workout activity:

```typescript
interface WorkoutGatedCosmetic {
  cosmeticId: string;

  requirements: {
    // Workout volume requirements
    minTotalWorkouts?: number;
    minWeeklyWorkouts?: number;
    minWorkoutStreak?: number;

    // Performance requirements
    minTotalWeight?: number;      // Lifetime weight lifted
    minTotalReps?: number;        // Lifetime reps
    minTotalSets?: number;        // Lifetime sets

    // Time requirements
    minTotalMinutes?: number;     // Workout time

    // Specific achievements
    requiredAchievements?: string[];

    // Level requirements
    minLevel?: number;
    minArchetypeLevel?: number;
  };
}
```

**Example Requirements:**
| Item | Requirement |
|------|-------------|
| "Iron Will" Skin | Lift 100,000 lbs total |
| "Marathon" Aura | Log 100 workouts |
| "Beast Mode" Title | 30-day workout streak |
| "Elite Athlete" Frame | Reach level 50 |
| "Champion" Crown | Win 10 competitions |

### 6.3 Daily & Weekly Earning Activities

```
┌─────────────────────────────────────────────────────────────────┐
│              DAILY EARNING OPPORTUNITIES                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ☑ Complete a workout          +10 credits      [DONE]          │
│  ☑ Log nutrition               +5 credits       [DONE]          │
│  ☐ Hit step goal               +5 credits       [8,234/10,000]  │
│  ☐ Log sleep                   +5 credits       [NOT LOGGED]    │
│  ☐ Social interaction          +5 credits       [0/1]           │
│                                                                  │
│  BONUS: Complete all 5         +20 credits                      │
│                                                                  │
│  Daily Progress: 3/5 (15 credits earned, 20 remaining)          │
├─────────────────────────────────────────────────────────────────┤
│              WEEKLY CHALLENGES                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ☐ 5 workouts this week        +100 credits     [3/5]           │
│  ☐ Hit all daily goals 3x      +75 credits      [2/3]           │
│  ☐ Try new exercise            +25 credits      [NOT DONE]      │
│  ☐ Improve a personal record   +50 credits      [NOT DONE]      │
│                                                                  │
│  Weekly Progress: 0/4 (0 credits earned, 250 remaining)         │
└─────────────────────────────────────────────────────────────────┘
```

### 6.4 Health Metric Integration

Connect to health data sources for automatic tracking:

```typescript
interface HealthMetrics {
  userId: string;
  date: Date;

  // Exercise
  workoutsCompleted: number;
  workoutMinutes: number;
  steps: number;
  activeCalories: number;

  // Recovery
  sleepHours: number;
  sleepQuality: number;  // 0-100
  restingHeartRate: number;
  hrvScore: number;

  // Nutrition
  caloriesLogged: boolean;
  proteinGoalMet: boolean;
  waterIntake: number;  // ml
  nutritionScore: number;  // 0-100

  // Calculated
  dailyHealthScore: number;  // Combined score 0-100
  earningMultiplier: number;  // Calculated multiplier
}
```

### 6.5 Behavioral Reward Tiers

```
┌─────────────────────────────────────────────────────────────────┐
│              HEALTH TIER SYSTEM                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TIER 1: NOVICE         (0-30 avg health score)                 │
│  - Base earning rate                                             │
│  - Access to common items only                                   │
│                                                                  │
│  TIER 2: DEDICATED      (31-50 avg health score)                │
│  - +10% earning bonus                                            │
│  - Access to uncommon items                                      │
│  - 5% marketplace fee discount                                   │
│                                                                  │
│  TIER 3: COMMITTED      (51-70 avg health score)                │
│  - +25% earning bonus                                            │
│  - Access to rare items                                          │
│  - 10% marketplace fee discount                                  │
│  - Weekly mystery box                                            │
│                                                                  │
│  TIER 4: ELITE          (71-85 avg health score)                │
│  - +50% earning bonus                                            │
│  - Access to epic items                                          │
│  - 15% marketplace fee discount                                  │
│  - Weekly mystery box (better odds)                              │
│  - Early access to new items                                     │
│                                                                  │
│  TIER 5: LEGENDARY      (86-100 avg health score)               │
│  - +100% earning bonus                                           │
│  - Access to all items                                           │
│  - 20% marketplace fee discount                                  │
│  - Weekly premium mystery box                                    │
│  - Exclusive legendary-tier items                                │
│  - "Legend" badge and effects                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.6 Special Workout Rewards

**Exercise-Linked Mystery Boxes:**
```
┌─────────────────────────────────────────────────────────────────┐
│              WORKOUT REWARD BOXES                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  DAILY WORKOUT BOX                                               │
│  - Earned: Complete 1 workout                                    │
│  - Contents: 1 common-rare item OR 50-200 credits               │
│                                                                  │
│  WEEKLY FITNESS BOX                                              │
│  - Earned: Complete 5+ workouts in a week                        │
│  - Contents: 1 uncommon-epic item OR 200-500 credits            │
│                                                                  │
│  STREAK CELEBRATION BOX                                          │
│  - Earned: Every 7-day streak milestone                          │
│  - Contents: Rarity scales with streak length                    │
│  - 7 days: rare+ guaranteed                                      │
│  - 30 days: epic+ guaranteed                                     │
│  - 100 days: legendary+ guaranteed                               │
│                                                                  │
│  PERSONAL RECORD BOX                                             │
│  - Earned: Set a new PR on any exercise                          │
│  - Contents: 1 random item (rarity based on lift significance)  │
│                                                                  │
│  MONTHLY DEDICATION BOX                                          │
│  - Earned: Hit all daily goals for 25+ days                      │
│  - Contents: 1 guaranteed epic+ item + 500-1000 credits         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Social & Group Features

### 7.1 Gifting System

Enhanced gifting with social features:

```typescript
interface Gift {
  id: string;
  senderId: string;
  recipientId: string;

  // Gift contents
  cosmeticId?: string;       // Cosmetic item
  creditAmount?: number;     // Credit gift
  mysteryBoxId?: string;     // Gift a mystery box

  // Presentation
  wrappingStyle: 'standard' | 'birthday' | 'holiday' | 'congrats' | 'custom';
  message?: string;
  isAnonymous: boolean;
  scheduledDelivery?: Date;  // Future delivery

  // Status
  status: 'pending' | 'delivered' | 'opened' | 'returned';
  deliveredAt?: Date;
  openedAt?: Date;
}
```

**Gift Features:**
- **Gift Wrapping** - Choose presentation style
- **Gift Messages** - Personal notes with gifts
- **Anonymous Gifts** - Send secretly
- **Scheduled Delivery** - Set future delivery date
- **Gift Receipts** - Option for recipient to exchange
- **Re-Gifting** - Pass along unwanted gifts
- **Gift Notifications** - Animated notifications

### 7.2 Crew/Group Features

Enable crews to participate in the cosmetics economy:

```typescript
interface CrewMarketplace {
  crewId: string;

  // Treasury
  crewCredits: number;        // Shared credit pool
  treasuryPermissions: {
    withdraw: string[];       // User IDs who can withdraw
    deposit: boolean;         // All members can deposit
    maxWithdrawal: number;    // Per-transaction limit
  };

  // Crew cosmetics
  crewBanner: string;         // Cosmetic ID
  crewBadge: string;
  crewAura: string;           // Members can use crew aura
  crewTitle: string;          // "[CrewName] Member"

  // Shared inventory
  sharedInventory: string[];  // Cosmetics available to all members

  // Group activities
  weeklyChallenge?: {
    target: number;           // Combined workout goal
    reward: string;           // Cosmetic reward
    progress: number;
  };
}
```

**Crew Features:**
- **Crew Treasury** - Pool credits for group purchases
- **Crew Cosmetics** - Shared items all members can use
- **Crew Challenges** - Work together for exclusive rewards
- **Crew Leaderboards** - Compete with other crews
- **Crew Gifting** - Treasury-funded gifts to members
- **Crew Showcase** - Display crew's best items
- **Crew Trading** - Internal marketplace with no fees

### 7.3 Group Activities

#### Group Workouts
Workout together for bonus rewards:

```
┌─────────────────────────────────────────────────────────────────┐
│              GROUP WORKOUT BONUS                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Workout with:                                                   │
│  - 1 friend:     +10% credit bonus                              │
│  - 2-3 friends:  +20% credit bonus                              │
│  - 4-5 friends:  +30% credit bonus                              │
│  - 6+ friends:   +40% credit bonus                              │
│                                                                  │
│  BONUS POOL:                                                     │
│  - Group of 4 completing workout = 200 bonus credits split      │
│  - All members get random common+ item if all finish            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Group Challenges
Compete together for cosmetic prizes:

```typescript
interface GroupChallenge {
  id: string;
  type: 'crew' | 'friends' | 'public';

  // Challenge details
  name: string;
  description: string;
  goal: {
    metric: 'workouts' | 'weight' | 'reps' | 'minutes' | 'calories';
    target: number;
    timeframe: 'day' | 'week' | 'month';
  };

  // Participants
  participants: {
    userId: string;
    contribution: number;
    rank: number;
  }[];
  minParticipants: number;
  maxParticipants: number;

  // Rewards
  rewards: {
    position: number | 'all';
    reward: {
      type: 'credits' | 'cosmetic' | 'mystery_box';
      value: string | number;
    };
  }[];

  // Status
  status: 'recruiting' | 'active' | 'completed' | 'failed';
  startTime: Date;
  endTime: Date;
}
```

### 7.4 Social Marketplace Features

- **Friends' Listings** - Prioritize friends' items in search
- **Crew-Only Listings** - Items only visible to crew members
- **Social Feed** - See friends' marketplace activity
- **Trade Circles** - Trusted trading groups
- **Gift Chains** - Pay-it-forward gifting events
- **Bulk Group Purchases** - Pool credits for expensive items

### 7.5 Community Events

```
┌─────────────────────────────────────────────────────────────────┐
│              COMMUNITY EVENT: SUMMER SWEAT                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Duration: June 1 - August 31                                   │
│                                                                  │
│  COMMUNITY GOALS:                                                │
│  ☑ 1,000,000 community workouts     [1,234,567/1,000,000]       │
│  ☐ 10,000,000 lbs lifted           [8,567,234/10,000,000]       │
│  ☐ 500,000 users hit daily streak   [423,456/500,000]           │
│                                                                  │
│  REWARDS UNLOCKED:                                               │
│  ☑ Goal 1: Everyone gets "Summer 2024" badge                    │
│  ☐ Goal 2: 50% off all summer items                             │
│  ☐ Goal 3: Exclusive "Summer Champion" skin                     │
│                                                                  │
│  YOUR CONTRIBUTION:                                              │
│  - 47 workouts completed                                        │
│  - 23,456 lbs lifted                                            │
│  - 12 streak days contributed                                   │
│  - Personal Rank: 4,567 of 89,234 participants                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Rarity & Scarcity Mechanics

### 8.1 Scarcity Types

| Type | Description | Example |
|------|-------------|---------|
| **Limited Edition** | Fixed supply, never restocked | "Founder's Pack" (1,000 units) |
| **Seasonal** | Only available during season | "Halloween 2024" items |
| **Event Exclusive** | From specific events only | "Competition Winner" items |
| **Time-Limited** | Available for limited time | "Flash Sale" items |
| **Achievement-Locked** | Require achievement to buy | "100-Day Streak" items |
| **Level-Gated** | Require level to access | "Elite" tier items |
| **Crew Exclusive** | Only for crew members | Custom crew cosmetics |
| **Referral Exclusive** | Only from referrals | "Recruiter" items |

### 8.2 Supply Tracking

```typescript
interface ItemSupply {
  cosmeticId: string;

  // Supply limits
  maxSupply?: number;          // Total ever available (null = unlimited)
  currentSupply: number;       // Currently available
  circulatingSupply: number;   // Owned by users

  // Time limits
  availableFrom?: Date;
  availableUntil?: Date;

  // Purchase limits
  maxPerUser?: number;

  // Restocking
  restockEnabled: boolean;
  restockInterval?: string;    // "daily", "weekly", "never"
  restockAmount?: number;
}
```

### 8.3 Price Dynamics

Dynamic pricing based on supply and demand:

```typescript
interface PricingModel {
  cosmeticId: string;

  basePrice: number;

  // Supply-based modifiers
  scarcityMultiplier: {
    // Multiply price based on supply remaining
    above75: 1.0,   // 75%+ supply = normal price
    above50: 1.2,   // 50-75% = 20% markup
    above25: 1.5,   // 25-50% = 50% markup
    above10: 2.0,   // 10-25% = 100% markup
    below10: 3.0,   // <10% = 200% markup
  };

  // Demand-based modifiers
  demandMultiplier: {
    low: 0.9,       // Few views/wishlist
    normal: 1.0,
    high: 1.15,     // Many views/wishlist
    veryHigh: 1.3,  // Trending
  };

  // Time-based modifiers
  newReleaseBonus: 1.2;        // First 24 hours
  lastChanceBonus: 1.5;        // Last 24 hours before removal
}
```

### 8.4 Rarity Distribution in Mystery Boxes

```
┌─────────────────────────────────────────────────────────────────┐
│              MYSTERY BOX DROP RATES                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  STANDARD BOX (100 credits)                                      │
│  ├─ Common:     55%                                             │
│  ├─ Uncommon:   30%                                             │
│  ├─ Rare:       12%                                             │
│  ├─ Epic:       2.5%                                            │
│  ├─ Legendary:  0.45%                                           │
│  ├─ Mythic:     0.05%                                           │
│  └─ Divine:     0%                                              │
│                                                                  │
│  PREMIUM BOX (500 credits)                                       │
│  ├─ Common:     0%                                              │
│  ├─ Uncommon:   40%                                             │
│  ├─ Rare:       40%                                             │
│  ├─ Epic:       15%                                             │
│  ├─ Legendary:  4%                                              │
│  ├─ Mythic:     0.9%                                            │
│  └─ Divine:     0.1%                                            │
│                                                                  │
│  LEGENDARY BOX (2,000 credits)                                   │
│  ├─ Common:     0%                                              │
│  ├─ Uncommon:   0%                                              │
│  ├─ Rare:       30%                                             │
│  ├─ Epic:       50%                                             │
│  ├─ Legendary:  16%                                             │
│  ├─ Mythic:     3.5%                                            │
│  └─ Divine:     0.5%                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 8.5 Pity System

Guarantee rewards for consistent engagement:

```typescript
interface PitySystem {
  userId: string;
  boxType: string;

  // Counters (reset on drop)
  epicPityCounter: number;      // Resets when epic+ drops
  legendaryPityCounter: number; // Resets when legendary+ drops

  // Pity thresholds
  epicPityThreshold: 30;        // Guaranteed epic at 30 boxes
  legendaryPityThreshold: 100;  // Guaranteed legendary at 100 boxes

  // Soft pity (increased rates)
  softPityStart: 20;            // Start increasing odds at 20 boxes
}
```

---

## 9. Database Schema

### 9.1 Core Marketplace Tables

```sql
-- Marketplace Listings
CREATE TABLE marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  cosmetic_id UUID REFERENCES spirit_animal_cosmetics(id),
  user_cosmetic_id UUID REFERENCES user_spirit_cosmetics(id),

  -- Listing type
  listing_type VARCHAR(20) NOT NULL CHECK (listing_type IN ('buy_now', 'auction', 'offer_only', 'reserved')),

  -- Pricing
  price INTEGER,                    -- Buy now / starting price
  min_offer INTEGER,                -- Minimum acceptable offer
  reserve_price INTEGER,            -- Auction reserve
  buy_now_price INTEGER,            -- Auction buy now option
  bid_increment INTEGER DEFAULT 10,

  -- Auction specific
  current_bid INTEGER,
  current_bidder_id TEXT REFERENCES users(id),
  bid_count INTEGER DEFAULT 0,
  auction_end_time TIMESTAMPTZ,

  -- Options
  allow_offers BOOLEAN DEFAULT false,
  reserved_for_user_id TEXT REFERENCES users(id),

  -- Timing
  listed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  -- Metadata
  seller_note TEXT,
  quantity INTEGER DEFAULT 1,

  -- Stats
  view_count INTEGER DEFAULT 0,
  watchlist_count INTEGER DEFAULT 0,
  offer_count INTEGER DEFAULT 0,

  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'sold', 'expired', 'cancelled', 'reserved')),
  sold_at TIMESTAMPTZ,
  sold_to_id TEXT REFERENCES users(id),
  sold_price INTEGER,

  -- Indexes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for marketplace
CREATE INDEX idx_listings_seller ON marketplace_listings(seller_id);
CREATE INDEX idx_listings_cosmetic ON marketplace_listings(cosmetic_id);
CREATE INDEX idx_listings_status_type ON marketplace_listings(status, listing_type);
CREATE INDEX idx_listings_price ON marketplace_listings(price) WHERE status = 'active';
CREATE INDEX idx_listings_auction_end ON marketplace_listings(auction_end_time) WHERE listing_type = 'auction' AND status = 'active';
CREATE INDEX idx_listings_expires ON marketplace_listings(expires_at) WHERE status = 'active';


-- Auction Bids
CREATE TABLE auction_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  bidder_id TEXT REFERENCES users(id) ON DELETE CASCADE,

  bid_amount INTEGER NOT NULL,
  max_bid INTEGER,                  -- Proxy bid maximum

  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'outbid', 'won', 'retracted')),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(listing_id, bidder_id, bid_amount)
);

CREATE INDEX idx_bids_listing ON auction_bids(listing_id);
CREATE INDEX idx_bids_bidder ON auction_bids(bidder_id);


-- Marketplace Offers
CREATE TABLE marketplace_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  offerer_id TEXT REFERENCES users(id) ON DELETE CASCADE,

  offer_amount INTEGER NOT NULL,
  message TEXT,

  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'countered', 'withdrawn')),

  counter_amount INTEGER,           -- If seller countered
  counter_message TEXT,

  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '48 hours',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

CREATE INDEX idx_offers_listing ON marketplace_offers(listing_id);
CREATE INDEX idx_offers_offerer ON marketplace_offers(offerer_id);


-- Marketplace Watchlist
CREATE TABLE marketplace_watchlist (
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES marketplace_listings(id) ON DELETE CASCADE,

  price_alert INTEGER,              -- Notify if price drops below
  created_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (user_id, listing_id)
);


-- Marketplace Transactions
CREATE TABLE marketplace_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  listing_id UUID REFERENCES marketplace_listings(id),
  seller_id TEXT REFERENCES users(id),
  buyer_id TEXT REFERENCES users(id),

  cosmetic_id UUID REFERENCES spirit_animal_cosmetics(id),

  sale_price INTEGER NOT NULL,
  platform_fee INTEGER NOT NULL,    -- 5% fee
  seller_received INTEGER NOT NULL, -- After fee

  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('buy_now', 'auction', 'offer_accepted')),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mp_tx_seller ON marketplace_transactions(seller_id);
CREATE INDEX idx_mp_tx_buyer ON marketplace_transactions(buyer_id);
CREATE INDEX idx_mp_tx_cosmetic ON marketplace_transactions(cosmetic_id);


-- Trade Requests
CREATE TABLE trade_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiator_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  receiver_id TEXT REFERENCES users(id) ON DELETE CASCADE,

  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'countered', 'accepted', 'declined', 'expired', 'completed', 'cancelled')),

  -- Initiator offer
  initiator_items UUID[] DEFAULT '{}',     -- user_spirit_cosmetics IDs
  initiator_credits INTEGER DEFAULT 0,

  -- Receiver offer
  receiver_items UUID[] DEFAULT '{}',
  receiver_credits INTEGER DEFAULT 0,

  -- Metadata
  message TEXT,
  counter_count INTEGER DEFAULT 0,

  -- Value tracking
  initiator_estimated_value INTEGER,
  receiver_estimated_value INTEGER,

  -- Timing
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '48 hours',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_trades_initiator ON trade_requests(initiator_id);
CREATE INDEX idx_trades_receiver ON trade_requests(receiver_id);
CREATE INDEX idx_trades_status ON trade_requests(status);


-- Trade History (for audit)
CREATE TABLE trade_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID REFERENCES trade_requests(id),

  user1_id TEXT REFERENCES users(id),
  user2_id TEXT REFERENCES users(id),

  user1_items JSONB,     -- Snapshot of items traded
  user1_credits INTEGER,
  user2_items JSONB,
  user2_credits INTEGER,

  total_value INTEGER,

  completed_at TIMESTAMPTZ DEFAULT NOW()
);


-- Gifts
CREATE TABLE cosmetic_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  recipient_id TEXT REFERENCES users(id) ON DELETE CASCADE,

  -- Gift contents (one of these)
  cosmetic_id UUID REFERENCES spirit_animal_cosmetics(id),
  credit_amount INTEGER,
  mystery_box_id UUID,

  -- Presentation
  wrapping_style VARCHAR(20) DEFAULT 'standard',
  message TEXT,
  is_anonymous BOOLEAN DEFAULT false,

  -- Scheduling
  scheduled_delivery TIMESTAMPTZ,

  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'opened', 'returned')),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gifts_sender ON cosmetic_gifts(sender_id);
CREATE INDEX idx_gifts_recipient ON cosmetic_gifts(recipient_id);


-- Collection Sets
CREATE TABLE collection_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  theme VARCHAR(50),

  items UUID[] NOT NULL,            -- Cosmetic IDs in set

  -- Rewards
  rewards JSONB NOT NULL,           -- {threshold: number, reward: {...}}[]

  -- Availability
  is_limited BOOLEAN DEFAULT false,
  release_date DATE,
  expiration_date DATE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- User Collection Progress
CREATE TABLE user_collection_progress (
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  set_id UUID REFERENCES collection_sets(id) ON DELETE CASCADE,

  owned_items UUID[] DEFAULT '{}',
  completion_percent NUMERIC(5,2) DEFAULT 0,

  rewards_claimed JSONB DEFAULT '[]',  -- Thresholds already claimed

  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (user_id, set_id)
);


-- Mystery Boxes
CREATE TABLE mystery_boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  box_type VARCHAR(20) NOT NULL,    -- standard, premium, legendary, event

  price INTEGER NOT NULL,

  -- Drop rates
  drop_rates JSONB NOT NULL,        -- {rarity: probability}

  -- Contents pool
  item_pool UUID[] NOT NULL,        -- Possible cosmetic IDs

  -- Limits
  max_purchases_per_user INTEGER,
  max_purchases_per_day INTEGER,
  total_supply INTEGER,

  -- Availability
  available_from TIMESTAMPTZ,
  available_until TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- Mystery Box Openings
CREATE TABLE mystery_box_openings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  box_id UUID REFERENCES mystery_boxes(id),

  cosmetic_received_id UUID REFERENCES spirit_animal_cosmetics(id),
  rarity_received VARCHAR(20),

  credits_spent INTEGER,

  -- Pity tracking
  pity_counter_at_open INTEGER,
  was_pity_reward BOOLEAN DEFAULT false,

  opened_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_box_openings_user ON mystery_box_openings(user_id);


-- User Pity Counters
CREATE TABLE user_pity_counters (
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  box_type VARCHAR(20),

  epic_counter INTEGER DEFAULT 0,
  legendary_counter INTEGER DEFAULT 0,

  last_epic_at TIMESTAMPTZ,
  last_legendary_at TIMESTAMPTZ,

  updated_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (user_id, box_type)
);


-- Health Metrics for Earning Multipliers
CREATE TABLE daily_health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Exercise
  workouts_completed INTEGER DEFAULT 0,
  workout_minutes INTEGER DEFAULT 0,
  steps INTEGER DEFAULT 0,
  active_calories INTEGER DEFAULT 0,

  -- Recovery
  sleep_hours NUMERIC(4,2),
  sleep_quality INTEGER,            -- 0-100
  resting_heart_rate INTEGER,
  hrv_score INTEGER,

  -- Nutrition
  calories_logged BOOLEAN DEFAULT false,
  protein_goal_met BOOLEAN DEFAULT false,
  water_intake INTEGER,             -- ml
  nutrition_score INTEGER,          -- 0-100

  -- Calculated
  daily_health_score INTEGER,       -- 0-100
  earning_multiplier NUMERIC(3,2) DEFAULT 1.0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, date)
);

CREATE INDEX idx_health_metrics_user_date ON daily_health_metrics(user_id, date DESC);


-- User Health Tier
CREATE TABLE user_health_tier (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  current_tier INTEGER DEFAULT 1 CHECK (current_tier BETWEEN 1 AND 5),
  tier_name VARCHAR(20),

  avg_health_score NUMERIC(5,2),
  calculation_period_days INTEGER DEFAULT 30,

  earning_bonus_percent INTEGER DEFAULT 0,
  marketplace_fee_discount INTEGER DEFAULT 0,

  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  next_calculation_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 day'
);


-- Crew Treasury & Cosmetics
CREATE TABLE crew_economy (
  crew_id TEXT PRIMARY KEY REFERENCES crews(id) ON DELETE CASCADE,

  -- Treasury
  credit_balance INTEGER DEFAULT 0,
  lifetime_deposited INTEGER DEFAULT 0,
  lifetime_spent INTEGER DEFAULT 0,

  -- Permissions
  withdraw_user_ids TEXT[] DEFAULT '{}',
  max_withdrawal_amount INTEGER DEFAULT 1000,
  deposit_enabled BOOLEAN DEFAULT true,

  -- Crew cosmetics (owned by crew)
  crew_banner_id UUID REFERENCES spirit_animal_cosmetics(id),
  crew_badge_id UUID REFERENCES spirit_animal_cosmetics(id),
  crew_aura_id UUID REFERENCES spirit_animal_cosmetics(id),

  -- Shared inventory
  shared_inventory_ids UUID[] DEFAULT '{}',

  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- Crew Treasury Transactions
CREATE TABLE crew_treasury_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id TEXT REFERENCES crews(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id),

  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'purchase', 'gift', 'reward')),

  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,

  description TEXT,
  cosmetic_id UUID REFERENCES spirit_animal_cosmetics(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- Item Supply Tracking
CREATE TABLE item_supply (
  cosmetic_id UUID PRIMARY KEY REFERENCES spirit_animal_cosmetics(id),

  -- Supply limits
  max_supply INTEGER,               -- NULL = unlimited
  current_supply INTEGER DEFAULT 0, -- Available to purchase
  circulating_supply INTEGER DEFAULT 0,

  -- Time limits
  available_from TIMESTAMPTZ,
  available_until TIMESTAMPTZ,

  -- Purchase limits
  max_per_user INTEGER,

  -- Restocking
  restock_enabled BOOLEAN DEFAULT false,
  restock_interval VARCHAR(20),     -- daily, weekly, monthly
  restock_amount INTEGER,
  last_restock_at TIMESTAMPTZ,
  next_restock_at TIMESTAMPTZ,

  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- Price History (for charts)
CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cosmetic_id UUID REFERENCES spirit_animal_cosmetics(id) ON DELETE CASCADE,

  date DATE NOT NULL,

  -- Daily stats
  avg_price INTEGER,
  min_price INTEGER,
  max_price INTEGER,

  volume INTEGER,                   -- Number of sales
  total_value INTEGER,              -- Total credits traded

  -- Listing stats
  active_listings INTEGER,

  PRIMARY KEY (cosmetic_id, date)
);

CREATE INDEX idx_price_history_cosmetic_date ON price_history(cosmetic_id, date DESC);


-- User Marketplace Stats
CREATE TABLE user_marketplace_stats (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Selling
  total_sales INTEGER DEFAULT 0,
  total_revenue INTEGER DEFAULT 0,
  avg_sale_price NUMERIC(10,2),

  -- Buying
  total_purchases INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  avg_purchase_price NUMERIC(10,2),

  -- Trading
  total_trades INTEGER DEFAULT 0,
  trade_value_exchanged INTEGER DEFAULT 0,

  -- Reputation
  seller_rating NUMERIC(3,2),
  buyer_rating NUMERIC(3,2),
  total_ratings INTEGER DEFAULT 0,

  -- Activity
  active_listings INTEGER DEFAULT 0,
  watchlist_count INTEGER DEFAULT 0,

  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- Seller Ratings
CREATE TABLE seller_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES marketplace_transactions(id),

  rater_id TEXT REFERENCES users(id),
  seller_id TEXT REFERENCES users(id),

  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(transaction_id, rater_id)
);
```

### 9.2 Supporting Indexes

```sql
-- Composite indexes for common queries
CREATE INDEX idx_listings_active_price_rarity ON marketplace_listings(status, price)
  INCLUDE (cosmetic_id) WHERE status = 'active';

CREATE INDEX idx_listings_seller_active ON marketplace_listings(seller_id, status)
  WHERE status = 'active';

-- GIN index for array searches
CREATE INDEX idx_trade_initiator_items ON trade_requests USING GIN(initiator_items);
CREATE INDEX idx_trade_receiver_items ON trade_requests USING GIN(receiver_items);

-- Full text search on listing notes
CREATE INDEX idx_listings_seller_note ON marketplace_listings
  USING GIN(to_tsvector('english', seller_note));
```

---

## 10. API Endpoints

### 10.1 Marketplace Routes

```typescript
// === MARKETPLACE LISTINGS ===

// Browse marketplace
GET  /api/marketplace
  Query: {
    category?: string;
    rarity?: string;
    minPrice?: number;
    maxPrice?: number;
    listingType?: 'buy_now' | 'auction' | 'offer_only';
    sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'ending_soon' | 'popular';
    search?: string;
    cursor?: string;
    limit?: number;
  }
  Response: { listings: Listing[], nextCursor?: string, total: number }

// Get single listing
GET  /api/marketplace/listings/:id
  Response: { listing: ListingDetail, relatedListings: Listing[] }

// Create listing
POST /api/marketplace/listings
  Body: {
    cosmeticId: string;
    listingType: 'buy_now' | 'auction' | 'offer_only' | 'reserved';
    price?: number;
    minOffer?: number;
    reservePrice?: number;
    buyNowPrice?: number;
    bidIncrement?: number;
    duration: number;  // hours
    allowOffers?: boolean;
    reservedForUserId?: string;
    sellerNote?: string;
  }
  Response: { listing: Listing }

// Update listing
PATCH /api/marketplace/listings/:id
  Body: { price?: number; sellerNote?: string; allowOffers?: boolean }
  Response: { listing: Listing }

// Cancel listing
DELETE /api/marketplace/listings/:id
  Response: { success: boolean }

// Buy now
POST /api/marketplace/listings/:id/buy
  Response: { transaction: Transaction, cosmetic: UserCosmetic }

// Make offer
POST /api/marketplace/listings/:id/offer
  Body: { amount: number; message?: string }
  Response: { offer: Offer }

// Respond to offer
POST /api/marketplace/offers/:id/respond
  Body: { action: 'accept' | 'decline' | 'counter'; counterAmount?: number }
  Response: { offer: Offer }


// === AUCTIONS ===

// Place bid
POST /api/marketplace/listings/:id/bid
  Body: { amount: number; maxBid?: number }
  Response: { bid: Bid, listing: Listing }

// Get bid history
GET  /api/marketplace/listings/:id/bids
  Response: { bids: Bid[] }

// Retract bid (with penalty)
DELETE /api/marketplace/auctions/:id/bid
  Response: { success: boolean, penalty: number }


// === WATCHLIST ===

// Get watchlist
GET  /api/marketplace/watchlist
  Response: { items: WatchlistItem[] }

// Add to watchlist
POST /api/marketplace/watchlist
  Body: { listingId: string; priceAlert?: number }
  Response: { item: WatchlistItem }

// Remove from watchlist
DELETE /api/marketplace/watchlist/:listingId
  Response: { success: boolean }


// === SELLER DASHBOARD ===

// Get my listings
GET  /api/marketplace/my-listings
  Query: { status?: string }
  Response: { listings: Listing[], stats: SellerStats }

// Get my sales history
GET  /api/marketplace/my-sales
  Response: { transactions: Transaction[], totalRevenue: number }

// Get price suggestions
GET  /api/marketplace/price-suggestion/:cosmeticId
  Response: { suggestedPrice: number, recentSales: Sale[], activeListings: number }


// === MARKET DATA ===

// Get price history
GET  /api/marketplace/price-history/:cosmeticId
  Query: { period?: '7d' | '30d' | '90d' | 'all' }
  Response: { history: PricePoint[], stats: PriceStats }

// Get market overview
GET  /api/marketplace/overview
  Response: {
    hotItems: Listing[];
    recentSales: Transaction[];
    priceChanges: PriceChange[];
    volume24h: number;
  }
```

### 10.2 Trading Routes

```typescript
// === TRADING ===

// Get incoming trade requests
GET  /api/trades/incoming
  Response: { trades: TradeRequest[] }

// Get outgoing trade requests
GET  /api/trades/outgoing
  Response: { trades: TradeRequest[] }

// Get trade history
GET  /api/trades/history
  Response: { trades: TradeHistory[] }

// Create trade request
POST /api/trades
  Body: {
    receiverId: string;
    myItems: string[];     // cosmetic IDs
    myCredits: number;
    theirItems: string[];  // requested items
    theirCredits: number;
    message?: string;
  }
  Response: { trade: TradeRequest }

// Get trade details
GET  /api/trades/:id
  Response: { trade: TradeRequest, itemDetails: CosmeticDetail[] }

// Respond to trade
POST /api/trades/:id/respond
  Body: {
    action: 'accept' | 'decline' | 'counter';
    // Counter details if countering
    counterMyItems?: string[];
    counterMyCredits?: number;
    counterTheirItems?: string[];
    counterTheirCredits?: number;
  }
  Response: { trade: TradeRequest }

// Cancel trade
DELETE /api/trades/:id
  Response: { success: boolean }

// Get trade value estimate
POST /api/trades/estimate-value
  Body: { items: string[] }
  Response: { totalValue: number, itemValues: ItemValue[] }
```

### 10.3 Gift Routes

```typescript
// === GIFTS ===

// Get received gifts
GET  /api/gifts/received
  Response: { gifts: Gift[] }

// Get sent gifts
GET  /api/gifts/sent
  Response: { gifts: Gift[] }

// Send gift
POST /api/gifts
  Body: {
    recipientId: string;
    cosmeticId?: string;
    creditAmount?: number;
    mysteryBoxId?: string;
    wrappingStyle?: string;
    message?: string;
    isAnonymous?: boolean;
    scheduledDelivery?: string;  // ISO date
  }
  Response: { gift: Gift }

// Open gift
POST /api/gifts/:id/open
  Response: { gift: Gift, contents: GiftContents }

// Return gift
POST /api/gifts/:id/return
  Response: { success: boolean }
```

### 10.4 Collection Routes

```typescript
// === COLLECTIONS ===

// Get my collection stats
GET  /api/collection/stats
  Response: {
    totalOwned: number;
    totalValue: number;
    rarityBreakdown: RarityCount[];
    categoryBreakdown: CategoryCount[];
    recentAcquisitions: UserCosmetic[];
  }

// Get collection sets
GET  /api/collection/sets
  Response: { sets: CollectionSetWithProgress[] }

// Get set details
GET  /api/collection/sets/:id
  Response: { set: CollectionSet, progress: SetProgress, items: CosmeticWithOwnership[] }

// Claim set reward
POST /api/collection/sets/:id/claim
  Body: { threshold: number }
  Response: { reward: Reward }

// Get showcase
GET  /api/collection/showcase/:userId
  Response: { showcase: ShowcaseConfig, featuredItems: UserCosmetic[] }

// Update showcase
PUT  /api/collection/showcase
  Body: { featuredItems: string[]; layout: string; showcaseEffect?: string }
  Response: { showcase: ShowcaseConfig }
```

### 10.5 Mystery Box Routes

```typescript
// === MYSTERY BOXES ===

// Get available boxes
GET  /api/mystery-boxes
  Response: { boxes: MysteryBox[] }

// Get box details
GET  /api/mystery-boxes/:id
  Response: { box: MysteryBox, dropRates: DropRate[], recentDrops: RecentDrop[] }

// Open box
POST /api/mystery-boxes/:id/open
  Body: { quantity?: number }
  Response: {
    results: {
      cosmetic: Cosmetic;
      rarity: string;
      wasPityReward: boolean;
    }[];
    newPityCounters: PityCounters;
  }

// Get my pity counters
GET  /api/mystery-boxes/pity
  Response: { counters: PityCounter[] }

// Get opening history
GET  /api/mystery-boxes/history
  Response: { openings: BoxOpening[] }
```

### 10.6 Health & Earning Routes

```typescript
// === HEALTH METRICS ===

// Log daily health
POST /api/health/daily
  Body: {
    workoutsCompleted?: number;
    workoutMinutes?: number;
    steps?: number;
    sleepHours?: number;
    sleepQuality?: number;
    caloriesLogged?: boolean;
    proteinGoalMet?: boolean;
    waterIntake?: number;
    nutritionScore?: number;
  }
  Response: { metrics: DailyHealthMetrics, multiplier: number }

// Get earning multiplier
GET  /api/health/multiplier
  Response: {
    currentMultiplier: number;
    breakdown: MultiplierBreakdown;
    healthTier: HealthTier;
  }

// Get health tier
GET  /api/health/tier
  Response: { tier: HealthTier, progress: TierProgress }

// Get daily earning opportunities
GET  /api/health/daily-tasks
  Response: { tasks: DailyTask[], bonus: number }

// Get weekly challenges
GET  /api/health/weekly-challenges
  Response: { challenges: WeeklyChallenge[] }
```

### 10.7 Crew Economy Routes

```typescript
// === CREW ECONOMY ===

// Get crew treasury
GET  /api/crews/:id/treasury
  Response: { balance: number, transactions: TreasuryTransaction[], permissions: Permissions }

// Deposit to treasury
POST /api/crews/:id/treasury/deposit
  Body: { amount: number }
  Response: { transaction: TreasuryTransaction, newBalance: number }

// Withdraw from treasury (with permission)
POST /api/crews/:id/treasury/withdraw
  Body: { amount: number; reason: string }
  Response: { transaction: TreasuryTransaction, newBalance: number }

// Get crew cosmetics
GET  /api/crews/:id/cosmetics
  Response: { crewCosmetics: CrewCosmetics, sharedInventory: UserCosmetic[] }

// Purchase crew cosmetic
POST /api/crews/:id/cosmetics/purchase
  Body: { cosmeticId: string; fromTreasury: boolean }
  Response: { cosmetic: UserCosmetic }

// Share item with crew
POST /api/crews/:id/inventory/share
  Body: { cosmeticId: string }
  Response: { success: boolean }
```

---

## 11. Frontend Pages & Components

### 11.1 New Pages Required

| Page | Route | Description |
|------|-------|-------------|
| Marketplace Hub | `/marketplace` | Main marketplace landing |
| Browse Listings | `/marketplace/browse` | Search and filter listings |
| Listing Detail | `/marketplace/listing/:id` | Single listing view |
| Create Listing | `/marketplace/sell` | Create new listing |
| My Listings | `/marketplace/my-listings` | Seller dashboard |
| Auction House | `/marketplace/auctions` | Auction-specific view |
| Trading Hub | `/trading` | P2P trading interface |
| Trade Request | `/trading/:id` | Single trade view |
| My Trades | `/trading/my-trades` | Trade history |
| Collection | `/collection` | Collection overview |
| Collection Set | `/collection/sets/:id` | Set details |
| Showcase Editor | `/collection/showcase` | Edit profile showcase |
| Mystery Boxes | `/mystery-boxes` | Box opening interface |
| Gifts | `/gifts` | Gift management |
| Health Dashboard | `/health` | Health metrics & multipliers |
| Daily Tasks | `/health/tasks` | Daily earning tasks |
| Crew Treasury | `/crews/:id/treasury` | Crew economy |

### 11.2 Component Hierarchy

```
src/
├── pages/
│   ├── marketplace/
│   │   ├── MarketplaceHub.tsx       # Landing page with categories
│   │   ├── BrowseListings.tsx       # Search and browse
│   │   ├── ListingDetail.tsx        # Single listing
│   │   ├── CreateListing.tsx        # Sell item form
│   │   ├── MyListings.tsx           # Seller dashboard
│   │   ├── AuctionHouse.tsx         # Auction view
│   │   └── PriceHistory.tsx         # Item price charts
│   │
│   ├── trading/
│   │   ├── TradingHub.tsx           # Trade requests overview
│   │   ├── TradeDetail.tsx          # Single trade view
│   │   ├── CreateTrade.tsx          # New trade form
│   │   └── TradeHistory.tsx         # Past trades
│   │
│   ├── collection/
│   │   ├── CollectionOverview.tsx   # Collection stats
│   │   ├── CollectionSets.tsx       # All sets
│   │   ├── SetDetail.tsx            # Single set
│   │   └── ShowcaseEditor.tsx       # Edit showcase
│   │
│   ├── mystery-boxes/
│   │   ├── MysteryBoxes.tsx         # All boxes
│   │   ├── BoxOpening.tsx           # Opening animation
│   │   └── OpeningHistory.tsx       # Past openings
│   │
│   ├── gifts/
│   │   ├── GiftCenter.tsx           # Send/receive gifts
│   │   ├── SendGift.tsx             # Send form
│   │   └── GiftOpening.tsx          # Open gift animation
│   │
│   └── health/
│       ├── HealthDashboard.tsx      # Metrics overview
│       ├── DailyTasks.tsx           # Earning tasks
│       ├── WeeklyChallenges.tsx     # Challenges
│       └── HealthTier.tsx           # Tier progress
│
├── components/
│   ├── marketplace/
│   │   ├── ListingCard.tsx          # Single listing display
│   │   ├── ListingGrid.tsx          # Grid of listings
│   │   ├── SearchFilters.tsx        # Filter sidebar
│   │   ├── PriceInput.tsx           # Price input with validation
│   │   ├── BidHistory.tsx           # Auction bid list
│   │   ├── OfferPanel.tsx           # Make/view offers
│   │   ├── SellerInfo.tsx           # Seller profile card
│   │   ├── RarityBadge.tsx          # Rarity indicator
│   │   └── WatchlistButton.tsx      # Add to watchlist
│   │
│   ├── trading/
│   │   ├── TradePanel.tsx           # Side of trade
│   │   ├── TradeItemSelector.tsx    # Pick items
│   │   ├── TradeValueIndicator.tsx  # Show trade value
│   │   ├── TradeRequestCard.tsx     # Trade summary
│   │   └── CounterOfferForm.tsx     # Counter offer
│   │
│   ├── collection/
│   │   ├── CollectionProgress.tsx   # Progress bar
│   │   ├── SetCard.tsx              # Set preview
│   │   ├── ItemGrid.tsx             # Items in collection
│   │   ├── ShowcaseDisplay.tsx      # Showcase viewer
│   │   └── RarityDistribution.tsx   # Rarity chart
│   │
│   ├── cosmetics/
│   │   ├── CosmeticCard.tsx         # Cosmetic display
│   │   ├── CosmeticPreview.tsx      # 3D/animated preview
│   │   ├── CosmeticDetail.tsx       # Full detail modal
│   │   ├── EquipButton.tsx          # Equip to slot
│   │   └── CosmeticBadges.tsx       # Rarity, limited, etc.
│   │
│   ├── mystery-box/
│   │   ├── BoxCard.tsx              # Box preview
│   │   ├── DropRates.tsx            # Rates display
│   │   ├── OpeningAnimation.tsx     # Box opening effect
│   │   ├── RevealCard.tsx           # Item reveal
│   │   └── PityDisplay.tsx          # Pity counter
│   │
│   ├── gifts/
│   │   ├── GiftCard.tsx             # Gift preview
│   │   ├── GiftWrapSelector.tsx     # Pick wrapping
│   │   ├── GiftOpenAnimation.tsx    # Open gift effect
│   │   └── GiftMessage.tsx          # Message display
│   │
│   └── health/
│       ├── MultiplierDisplay.tsx    # Current multiplier
│       ├── HealthTierBadge.tsx      # Tier indicator
│       ├── TaskCheckbox.tsx         # Daily task item
│       ├── StreakDisplay.tsx        # Current streak
│       └── EarningBreakdown.tsx     # Multiplier sources
```

### 11.3 Key UI Patterns

#### Listing Card
```
┌─────────────────────────────────────┐
│ [Preview Image]                     │
│ ⭐ LEGENDARY                        │
├─────────────────────────────────────┤
│ Midnight Phoenix Wings              │
│                                     │
│ ✨ 12,500 credits         [BUY NOW]│
│                                     │
│ 👁 234 views  ❤ 45 watching        │
│ 📦 12 listings available            │
└─────────────────────────────────────┘
```

#### Trade Interface
```
┌─────────────────┬─────────────────┐
│   YOUR OFFER    │   THEIR OFFER   │
├─────────────────┼─────────────────┤
│                 │                 │
│  [+ Add Item]   │  [+ Request]    │
│                 │                 │
│  [Item] [Item]  │  [Item]         │
│                 │                 │
│  + 500 💎       │  + 0 💎         │
│                 │                 │
├─────────────────┴─────────────────┤
│  Value: 3,200   │  Value: 4,500   │
│       ⚠️ -1,300 difference         │
├─────────────────────────────────────┤
│ [SEND REQUEST]  [CANCEL]           │
└─────────────────────────────────────┘
```

#### Mystery Box Opening
```
┌─────────────────────────────────────┐
│                                     │
│         [Box Animation]             │
│                                     │
│           ✨ OPENING ✨             │
│                                     │
├─────────────────────────────────────┤
│                                     │
│     🌟 LEGENDARY DROP! 🌟           │
│                                     │
│     [Item Preview Animation]        │
│                                     │
│     "Celestial Dragon Skin"         │
│                                     │
│     [CLAIM]  [OPEN ANOTHER]         │
└─────────────────────────────────────┘
```

---

## 12. Gamification & Progression

### 12.1 Marketplace Achievements

| Achievement | Requirement | Reward |
|-------------|-------------|--------|
| First Sale | Sell 1 item | "Entrepreneur" badge |
| Dealmaker | Complete 10 trades | 500 credits |
| Auction Master | Win 10 auctions | "Bidder" title |
| Collector | Own 100 items | "Collector" frame |
| Generous | Send 10 gifts | "Generous" badge |
| Lucky | Open legendary+ from box | "Lucky" effect |
| Wealthy | Reach 100k total value | "Wealthy" title |
| Trendsetter | Own 5 limited items | "Trendsetter" badge |
| Completionist | Complete 3 sets | Exclusive skin |
| Market Whale | Spend 50k in marketplace | Diamond badge |

### 12.2 Seller Levels

```
LEVEL 1: Newcomer      (0-10 sales)
  - 7% marketplace fee
  - 3 active listings max

LEVEL 2: Seller        (11-50 sales)
  - 6% marketplace fee
  - 10 active listings max
  - Seller badge

LEVEL 3: Merchant      (51-200 sales)
  - 5% marketplace fee
  - 25 active listings max
  - Featured listing eligibility

LEVEL 4: Dealer        (201-500 sales)
  - 4% marketplace fee
  - 50 active listings max
  - Priority in search results

LEVEL 5: Tycoon        (501+ sales)
  - 3% marketplace fee
  - Unlimited listings
  - Verified Seller badge
  - Access to bulk tools
```

### 12.3 Trading Reputation

```
REPUTATION FACTORS:
  + Completed trades on time
  + Positive ratings
  + Account age
  + Verified email/phone
  + Consistent activity

  - Cancelled trades
  - Scam reports
  - Disputes lost
  - Inactive periods

REPUTATION TIERS:
  ⭐ New Trader (0-10 reputation)
  ⭐⭐ Trusted (11-50 reputation)
  ⭐⭐⭐ Reliable (51-100 reputation)
  ⭐⭐⭐⭐ Veteran (101-250 reputation)
  ⭐⭐⭐⭐⭐ Elite (251+ reputation)
```

### 12.4 Seasonal Battle Pass

```
┌─────────────────────────────────────────────────────────────────┐
│              SEASON 1: SUMMER SHOWDOWN                          │
│              June 1 - August 31, 2024                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  LEVEL PROGRESS: 47/100  [████████████░░░░░░░░░░░░░░] 47%       │
│  XP: 23,456 / 50,000 to next level                              │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  FREE TRACK              │  PREMIUM TRACK (500 credits)         │
├─────────────────────────────────────────────────────────────────┤
│  L45: 100 credits  ✓     │  L45: "Beach" Skin                   │
│  L46: Common Box         │  L46: "Surfer" Emote  ←YOU ARE HERE │
│  L47: "Summer" Badge ✓   │  L47: 500 credits                    │
│  L48: Rare Box           │  L48: "Sunset" Aura                  │
│  L49: 200 credits        │  L49: "Champion" Frame               │
│  L50: "Summer 24" Title  │  L50: "LEGENDARY Summer" Skin        │
│                          │                                       │
│  ...                     │  L100: "Divine Beach God" (Divine)   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 13. Anti-Abuse & Economy Protection

### 13.1 Trading Safeguards

```typescript
interface TradingSafeguards {
  // Value protection
  maxValueDifference: 0.5;        // Max 50% value difference allowed
  highValueThreshold: 10000;      // Extra verification above this

  // Rate limits
  maxTradesPerDay: 20;
  maxOffersPerDay: 50;
  maxActiveTradesPerUser: 10;

  // Cooldowns
  newItemTradeCooldown: '24h';    // Can't trade newly acquired items
  newUserTradeCooldown: '7d';     // New users can't trade for 7 days

  // Verification
  highValueTradeVerification: true;  // 2FA for high value
  emailNotifications: true;
}
```

### 13.2 Marketplace Protections

```typescript
interface MarketplaceProtections {
  // Listing limits
  maxActiveListings: {
    newSeller: 3;
    level1: 10;
    level2: 25;
    level3: 50;
    level4: 100;
    level5: 'unlimited';
  };

  // Price guards
  minListingPrice: 10;
  maxPriceMultiplier: 10;         // Can't list for >10x average
  priceManipulationDetection: true;

  // Sniping protection
  auctionExtensionOnLateBid: '5m';

  // Self-trading prevention
  selfPurchasePrevention: true;
  altAccountDetection: true;
}
```

### 13.3 Mystery Box Fairness

```typescript
interface MysteryBoxFairness {
  // Transparency
  publishDropRates: true;
  recentDropsVisible: true;

  // Pity system
  guaranteedEpicAt: 30;
  guaranteedLegendaryAt: 100;
  softPityStart: 20;

  // Limits
  maxDailyPurchases: 50;
  maxLifetimePurchases: undefined; // No limit

  // RNG verification
  serverSideRNG: true;
  seedLogging: true;
}
```

### 13.4 Fraud Detection

```typescript
interface FraudDetection {
  flags: {
    rapidTrading: {
      threshold: '10 trades in 1 hour';
      action: 'review';
    };
    priceManipulation: {
      threshold: 'buy low sell high pattern';
      action: 'flag';
    };
    washTrading: {
      threshold: 'circular trades between accounts';
      action: 'suspend';
    };
    creditFarming: {
      threshold: 'unusual earning patterns';
      action: 'review';
    };
  };

  automatedActions: {
    lowSeverity: 'flag for review';
    mediumSeverity: 'temporary trade ban';
    highSeverity: 'account suspension';
  };
}
```

### 13.5 Economy Balancing Levers

```typescript
interface EconomyControls {
  // Credit sinks
  marketplaceFee: 0.05;           // 5% fee on sales
  mysteryBoxes: true;             // Credit sink
  premiumCosmetics: true;         // High-value items

  // Credit faucets
  workoutRewards: true;
  dailyTasks: true;
  achievements: true;
  events: true;

  // Emergency controls
  tradingCircuitBreaker: {
    trigger: 'volume spike >200%';
    action: 'pause trading for 1 hour';
  };
  inflationControl: {
    monitor: 'average item price';
    action: 'adjust drop rates';
  };
}
```

---

## 14. Implementation Phases

### Phase 1: Foundation (Weeks 1-4)

**Backend:**
- [ ] Database migrations for all new tables
- [ ] Core marketplace listing CRUD
- [ ] Basic auction system
- [ ] P2P trading system
- [ ] Gift system enhancements

**Frontend:**
- [ ] Marketplace browse page
- [ ] Listing detail page
- [ ] Create listing flow
- [ ] Basic trading interface

### Phase 2: Enhanced Features (Weeks 5-8)

**Backend:**
- [ ] Offer system
- [ ] Watchlist & price alerts
- [ ] Collection tracking
- [ ] Mystery box system
- [ ] Health metrics integration

**Frontend:**
- [ ] Auction house page
- [ ] Offer management
- [ ] Collection overview
- [ ] Mystery box opening experience
- [ ] Health dashboard

### Phase 3: Social Features (Weeks 9-12)

**Backend:**
- [ ] Crew treasury system
- [ ] Shared crew inventory
- [ ] Group challenges
- [ ] Enhanced gifting

**Frontend:**
- [ ] Crew economy pages
- [ ] Group activity interfaces
- [ ] Enhanced gift sending
- [ ] Social feed integration

### Phase 4: Gamification (Weeks 13-16)

**Backend:**
- [ ] Seller levels & reputation
- [ ] Marketplace achievements
- [ ] Seasonal battle pass
- [ ] Collection sets & rewards

**Frontend:**
- [ ] Achievement displays
- [ ] Battle pass interface
- [ ] Set completion tracking
- [ ] Profile showcase editor

### Phase 5: Polish & Optimization (Weeks 17-20)

**Backend:**
- [ ] Performance optimization
- [ ] Anti-abuse enhancements
- [ ] Analytics & monitoring
- [ ] Economy balancing

**Frontend:**
- [ ] Animation polish
- [ ] Mobile optimization
- [ ] Accessibility improvements
- [ ] Tutorial/onboarding

---

## Success Metrics

### Engagement Metrics
- Daily Active Traders (DAT)
- Average trades per user per week
- Mystery box opening rate
- Collection completion rate
- Gift sending frequency

### Economy Health Metrics
- Credit velocity (credits moving per day)
- Average item prices over time
- Marketplace fee revenue
- Credit sink vs faucet ratio

### Behavioral Metrics
- Correlation: marketplace engagement vs workout frequency
- Health score improvement for active traders
- Daily task completion rates
- Streak maintenance rates

### Revenue Metrics
- Premium battle pass adoption
- Credit purchase conversion
- Subscription retention for active traders

---

## Appendix A: Example Cosmetic Items

See `docs/COSMETICS-CATALOG.md` for the full item catalog.

## Appendix B: Economy Simulation

See `docs/ECONOMY-SIMULATION.md` for detailed economic modeling.

## Appendix C: UI/UX Mockups

See `docs/design/MARKETPLACE-MOCKUPS.md` for visual designs.
