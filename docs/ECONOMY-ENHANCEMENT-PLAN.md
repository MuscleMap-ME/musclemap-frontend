# MuscleMap Economy Enhancement Plan

**Created:** January 14, 2026
**Version:** 1.0
**Status:** Planning

---

## Executive Summary

This plan transforms MuscleMap's economy into a vibrant, engaging system where:
1. **Credits are VISIBLE and CELEBRATED** - Users always know what they earn and why
2. **Earning is FUN and FREQUENT** - Multiple small rewards keep engagement high
3. **Spending is MEANINGFUL** - Credits unlock real value in profiles, social interactions, and community power
4. **Virtual Hangouts become HOME** - Geo-based peer groups create belonging
5. **Real Money Integration** - Seamless fiat-to-credit conversion via Stripe/PayPal

**Core Equation:** 1 penny = 1 credit = 1 Exercise Unit (EU/TU)

**Minimum Purchase:** $1.00 = 100 credits

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Earning Credits - Make It Rain](#2-earning-credits---make-it-rain)
3. [Spending Credits - The Fun Part](#3-spending-credits---the-fun-part)
4. [Virtual Hangouts - Your Home Base](#4-virtual-hangouts---your-home-base)
5. [Real Money Integration](#5-real-money-integration)
6. [Credit Visibility & Celebration](#6-credit-visibility--celebration)
7. [Database Schema Changes](#7-database-schema-changes)
8. [Implementation Phases](#8-implementation-phases)
9. [Anti-Abuse & Balance](#9-anti-abuse--balance)
10. [Success Metrics](#10-success-metrics)

---

## 1. Current State Analysis

### What We Have

| Feature | Status | Notes |
|---------|--------|-------|
| Credit Balances | Implemented | Atomic transactions, idempotency |
| Credit Ledger | Implemented | Full audit trail |
| Wealth Tiers | Implemented | 7 tiers (Broke → Obsidian) |
| Earning Rules | Implemented | Configurable via `earning_rules` table |
| P2P Transfers | Implemented | With rate limiting |
| Store Items | Partially | Schema exists, limited items |
| Training Buddy | Implemented | 8 species, cosmetics system |
| Virtual Hangouts | Basic | Theme-based, not geo-based |
| Stripe Integration | Basic | Purchases table exists |

### What's Missing

1. **Visibility** - Users don't see credit rewards in real-time
2. **Celebration** - No dopamine hit when earning credits
3. **Spending Variety** - Limited ways to spend credits
4. **Geo-Based Hangouts** - Current hangouts are theme-based only
5. **Real Money Flow** - Stripe/PayPal not fully integrated
6. **Social Spending** - Can't use credits for social power

---

## 2. Earning Credits - Make It Rain

### Philosophy: Frequent Small Rewards > Rare Large Rewards

Users should earn credits **multiple times per session**. Every positive action should have a small reward. This creates a constant dopamine loop that reinforces good behavior.

### 2.1 Workout Earnings (Primary Source)

| Action | Credits | XP | Frequency Limit |
|--------|---------|-----|-----------------|
| Complete any workout | 10 | 20 | 3/day |
| Per rep completed | 0.1 | 0.2 | No limit |
| Per set completed | 1 | 2 | No limit |
| Volume bonus (5000+ TU) | 25 | 50 | 1/day |
| Volume bonus (10000+ TU) | 50 | 100 | 1/day |
| New exercise tried | 5 | 10 | 5/day |
| Personal Record (PR) | 100 | 200 | 1/exercise/day |
| Perfect form (video verified) | 50 | 100 | 3/day |

**Example Workout Earnings:**
```
Workout: Push Day (45 min)
├── Workout completion     +10 credits
├── 120 reps × 0.1         +12 credits
├── 15 sets × 1            +15 credits
├── Volume bonus (6200 TU) +25 credits
├── 1 PR on bench press    +100 credits
└── TOTAL                  +162 credits
```

### 2.2 Goal Achievements

| Achievement | Credits | XP |
|-------------|---------|-----|
| Set a new goal | 5 | 10 |
| 25% goal progress | 25 | 50 |
| 50% goal progress | 50 | 100 |
| 75% goal progress | 75 | 150 |
| Goal completed (Easy) | 100 | 200 |
| Goal completed (Medium) | 200 | 400 |
| Goal completed (Hard) | 500 | 1000 |
| Goal completed (Epic) | 1000 | 2000 |

### 2.3 Consistency & Streaks

| Streak | Credits | XP | Badge |
|--------|---------|-----|-------|
| 3-day streak | 25 | 50 | Spark |
| 7-day streak | 75 | 150 | Flame |
| 14-day streak | 200 | 400 | Fire |
| 30-day streak | 500 | 1000 | Inferno |
| 60-day streak | 1000 | 2000 | Phoenix |
| 100-day streak | 2500 | 5000 | Eternal Flame |
| 365-day streak | 10000 | 20000 | Legend |

**Streak Protection:** Users can spend 50 credits to protect their streak for 1 day (freeze).

### 2.4 Leaderboard Placements

| Placement | Daily | Weekly | Monthly | All-Time |
|-----------|-------|--------|---------|----------|
| 1st Place | 50 | 200 | 500 | 2000 |
| 2nd Place | 30 | 120 | 300 | 1200 |
| 3rd Place | 20 | 80 | 200 | 800 |
| Top 10 | 10 | 40 | 100 | 400 |
| Top 25 | 5 | 20 | 50 | 200 |
| Top 100 | 2 | 10 | 25 | 100 |

**Hangout Leaderboards:** Same structure but for local hangout rankings.

### 2.5 Social & Community Earnings

| Action | Credits | XP | Limit |
|--------|---------|-----|-------|
| First login of the day | 5 | 10 | 1/day |
| Give a High Five | 1 | 2 | 50/day |
| Receive a High Five | 2 | 4 | Unlimited |
| Post to activity feed | 3 | 5 | 10/day |
| Receive a comment | 2 | 4 | Unlimited |
| Receive a prop/like | 1 | 2 | Unlimited |
| Answer a question | 10 | 20 | 10/day |
| Helpful answer (marked) | 25 | 50 | Unlimited |
| Mentor a session | 50 | 100 | 5/day |
| Host a hangout event | 100 | 200 | 2/day |
| Refer a new user | 500 | 1000 | Unlimited |
| Referred user reaches level 5 | 500 | 1000 | Unlimited |

### 2.6 Archetype & Journey Progress

| Milestone | Credits | XP |
|-----------|---------|-----|
| Complete archetype quiz | 25 | 50 |
| Select an archetype | 50 | 100 |
| Advance archetype level | 100 × level | 200 × level |
| Journey milestone | 150 | 300 |
| Chapter completion | 400 | 800 |
| Journey completion | 2000 | 4000 |
| Unlock new skill tier | 200 | 400 |
| Master a skill (max level) | 1000 | 2000 |

### 2.7 Skill & Martial Arts

| Achievement | Credits | XP |
|-------------|---------|-----|
| Learn new technique | 25 | 50 |
| Technique to Intermediate | 100 | 200 |
| Technique to Advanced | 250 | 500 |
| Technique to Expert | 500 | 1000 |
| Technique to Elite | 1000 | 2000 |
| Belt/rank advancement | 500 | 1000 |
| Compete in sparring | 50 | 100 |
| Win sparring match | 100 | 200 |

### 2.8 Special & Seasonal Earnings

| Event | Credits | XP |
|-------|---------|-----|
| Daily challenge completed | 25 | 50 |
| Weekly challenge completed | 100 | 200 |
| Monthly challenge completed | 500 | 1000 |
| Community challenge winner | 1000 | 2000 |
| Holiday event participation | 100 | 200 |
| Beta feature testing | 250 | 500 |
| Bug report (verified) | 100-500 | 200-1000 |
| Feature suggestion (implemented) | 1000 | 2000 |
| Content creation (approved) | 500 | 1000 |

### 2.9 "Excuse to Give Credits" Events

Random/semi-random rewards to keep things exciting:

| Event | Credits | Frequency |
|-------|---------|-----------|
| **Lucky Rep** - Random rep gives bonus | 10 | ~1% of reps |
| **Golden Set** - Random set gives bonus | 25 | ~2% of sets |
| **Jackpot Workout** - Random workout bonus | 100 | ~1% of workouts |
| **Mystery Box** - Random daily reward | 5-500 | 1/day (lottery) |
| **Comeback Bonus** - Return after 3+ days | 50 | After absence |
| **Birthday Bonus** | 500 | 1/year |
| **Anniversary Bonus** - Account creation | 1000 | 1/year |
| **Weather Warrior** - Workout in bad weather | 25 | Weather API check |
| **Early Bird** - Workout before 6 AM | 15 | 1/day |
| **Night Owl** - Workout after 10 PM | 15 | 1/day |
| **Weekend Warrior** - Weekend workout | 10 | 2/week |

---

## 3. Spending Credits - The Fun Part

### Philosophy: Credits = Power + Personality + Prestige

Users should WANT to spend credits because it gives them:
1. **Power** - Ability to do more in the community
2. **Personality** - Express themselves uniquely
3. **Prestige** - Show off their dedication

### 3.1 Profile Enhancements

#### Profile Frames & Borders

| Item | Cost | Rarity | Description |
|------|------|--------|-------------|
| Bronze Frame | 100 | Common | Simple bronze border |
| Silver Frame | 250 | Common | Elegant silver border |
| Gold Frame | 500 | Uncommon | Prestigious gold border |
| Platinum Frame | 1000 | Rare | Shimmering platinum |
| Diamond Frame | 2500 | Epic | Sparkling diamonds |
| Obsidian Frame | 5000 | Legendary | Dark mysterious aura |
| Animated Fire | 1500 | Rare | Burning flame effect |
| Animated Lightning | 1500 | Rare | Electric crackling |
| Animated Water | 1500 | Rare | Flowing water effect |
| Holographic | 3000 | Epic | Rainbow shimmer |
| Archetype-specific | 2000 | Rare | Unique per archetype |

#### Profile Badges & Flair

| Item | Cost | Description |
|------|------|-------------|
| Custom Title | 500 | Display custom title under name |
| Verified Athlete | 1000 | Blue checkmark (requires proof) |
| Certified Trainer | 2000 | Gold star badge |
| OG Member | N/A | Free for early adopters |
| Founder Badge | N/A | Early supporter badge |
| Beta Tester | N/A | Tested beta features |
| Bug Hunter | 500 | Found and reported bugs |
| Community Hero | 1000 | Helped many users |
| Streak Master | 750 | 100+ day streak |
| Volume King/Queen | 1000 | Top 1% volume |
| Iron Will | 500 | Never missed a Monday |

#### Profile Themes & Colors

| Item | Cost | Description |
|------|------|-------------|
| Custom Banner Color | 200 | Choose profile banner color |
| Custom Accent Color | 200 | Choose UI accent color |
| Dark Theme Unlock | 0 | Free for all |
| Neon Theme | 500 | Bright neon accents |
| Minimalist Theme | 300 | Clean, simple look |
| Archetype Theme | 750 | Colors match archetype |
| Seasonal Theme | 400 | Holiday/seasonal look |
| Custom Background | 1000 | Upload custom background |

### 3.2 Training Buddy Cosmetics

#### Buddy Skins

| Tier | Cost Range | Examples |
|------|------------|----------|
| Common | 100-250 | Basic color variants |
| Uncommon | 250-500 | Patterns, textures |
| Rare | 500-1000 | Unique designs, effects |
| Epic | 1000-2500 | Animated, special effects |
| Legendary | 2500-5000 | Ultra-rare, limited edition |

#### Buddy Accessories

| Category | Cost Range | Examples |
|----------|------------|----------|
| Auras | 200-1500 | Fire, ice, lightning, holy |
| Armor | 300-2000 | Leather, chain, plate, mythic |
| Wings | 500-3000 | Feathered, dragon, angelic |
| Weapons/Tools | 200-1500 | Dumbbells, swords, staffs |
| Hats | 100-500 | Caps, crowns, helmets |
| Trails | 300-1000 | Particle trails when moving |

#### Buddy Emotes & Voices

| Item | Cost | Description |
|------|------|-------------|
| Emote Pack (5) | 250 | Custom celebration emotes |
| Voice Pack | 500 | Different voice for buddy |
| Victory Dance | 300 | Special animation on PR |
| Entrance Animation | 400 | Dramatic workout start |
| Rest Timer Animation | 200 | Special rest period action |

### 3.3 Social Power Credits

These give users POWER in the community:

#### High Fives & Props

| Item | Cost | Effect |
|------|------|--------|
| Super High Five | 5 | Larger animation, notifies user |
| Mega High Five | 25 | Huge animation, public feed mention |
| Standing Ovation | 100 | Spectacular effect, achievement |
| Golden Props | 10 | Special gold "like" icon |
| Fire Props | 10 | Fire effect on post |
| Explosion Props | 25 | Explosive effect |

#### Tipping & Gifting

| Action | Cost | Notes |
|--------|------|-------|
| Tip a user | 1+ | Direct credit transfer |
| Gift store item | Item cost + 10% | Send cosmetic to friend |
| Sponsor a streak freeze | 50 | Pay for someone's freeze |
| Boost a post | 100 | Promote in feed algorithm |
| Feature a recipe | 200 | Pin to community recipes |

#### Community Actions

| Action | Cost | Effect |
|--------|------|--------|
| Create Competition | 100 | Start a new competition |
| Create Challenge | 50 | Start a challenge |
| Boost Competition Prize Pool | 50+ | Add to winner's rewards |
| Create Hangout Event | 25 | Schedule a group event |
| Feature Event | 100 | Pin to hangout calendar |
| Create Poll | 10 | Community poll |
| Pin Post to Hangout | 50 | Pin important content |

### 3.4 Virtual Hangout Customization

| Item | Cost | Description |
|------|------|-------------|
| Hangout Theme Pack | 500 | Custom colors/style for your view |
| Personal Banner | 300 | Your banner in hangout |
| Custom Entrance | 200 | Special animation when entering |
| VIP Badge in Hangout | 750 | Stand out in member list |
| Reserved Spot | 1000 | Always visible in hangout |
| Shoutout Board Post | 50 | Pin message to bulletin |
| Artifact Contribution | 100 | Add resource to hangout |

### 3.5 Utility & Power-Ups

| Item | Cost | Effect | Duration |
|------|------|--------|----------|
| Streak Freeze | 50 | Protect streak for 1 day | Single use |
| Double XP Boost | 100 | 2× buddy XP | 24 hours |
| Credit Boost | 200 | 1.5× credit earnings | 24 hours |
| Visibility Boost | 150 | Appear higher in searches | 7 days |
| Analytics Unlock | 500 | Advanced workout analytics | 30 days |
| Export Data | 100 | Export all your data | Single use |
| Priority Support | 250 | Fast-track support ticket | Single use |
| Ad-Free Experience | 0 | Free (no ads in app) | Forever |

### 3.6 Exclusive Content & Features

| Item | Cost | Description |
|------|------|-------------|
| Premium Workout Plans | 200-500 | Expert-designed programs |
| Archetype Deep Dive | 300 | Extended archetype content |
| Nutrition Plans | 200-400 | Diet guides by archetype |
| Video Tutorials | 100-300 | Pro technique videos |
| Live Q&A Access | 500 | Join expert Q&A sessions |
| Early Feature Access | 1000 | Beta test new features |

### 3.7 Prestige Items (Wealth Display)

For high-wealth users who want to show off:

| Item | Cost | Description |
|------|------|-------------|
| Diamond Name Color | 5000 | Name sparkles in chat |
| Obsidian Aura | 10000 | Dark aura on profile |
| Crown Badge | 25000 | Crown icon by name |
| Legend Status | 50000 | "Legend" title, unique perks |
| Hall of Fame Entry | 100000 | Permanent recognition |
| Custom Emoji | 50000 | Personal emoji in hangouts |
| Statue in Hangout | 100000 | Virtual statue display |

---

## 4. Virtual Hangouts - Your Home Base

### 4.1 Philosophy: Hangouts = Belonging

Every user should have a "home" in MuscleMap - a place where they see familiar faces, compete with peers, and feel part of a community.

### 4.2 Geo-Based Peer Matching

**Primary Hangout:** Based on geographic location
**Secondary Hangout:** Based on archetype/interests

#### How It Works

```
User Location: San Francisco, CA
├── Primary Hangout: "SF Bay Iron Tribe"
│   ├── Members: 50-200 users within 25 miles
│   ├── Sorted by: Distance from user
│   ├── Updates: Real-time as users move
│   └── Leaderboards: Local rankings
│
├── Secondary Hangout: "Warriors of the West Coast"
│   ├── Members: Same archetype in region
│   └── Wider geographic area
│
└── Theme Hangouts: (Optional)
    ├── "The Iron Forge" (Powerlifters)
    ├── "Firehouse" (First Responders)
    └── etc.
```

#### Distance Tiers

| Tier | Distance | Label | Priority |
|------|----------|-------|----------|
| Neighbors | < 5 miles | "Your Block" | Highest |
| Local | 5-15 miles | "Your Area" | High |
| Regional | 15-50 miles | "Your Region" | Medium |
| Extended | 50-100 miles | "Your Zone" | Low |

### 4.3 Hangout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  🏠 SF Bay Iron Tribe                    47 members online     │
│  ═══════════════════════════════════════════════════════════   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📍 YOUR PEERS (sorted by distance)                      │   │
│  │                                                          │   │
│  │  ⚡ Mike_Lifts (0.3 mi) - Working out NOW               │   │
│  │  🔥 Sarah_Strong (0.8 mi) - 15 day streak               │   │
│  │  💪 Iron_John (1.2 mi) - Just hit PR!                   │   │
│  │  🏆 Bay_Beast (2.1 mi) - #1 This Week                   │   │
│  │  ✨ FitnessFiona (3.5 mi) - New Member                  │   │
│  │                                                          │   │
│  │  [See all 47 members →]                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ 📊 LOCAL     │ │ 🏆 THIS     │ │ 📅 EVENTS   │            │
│  │ LEADERBOARD  │ │ WEEK'S BEST │ │ NEAR YOU    │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📋 BULLETIN BOARD                              [+ Post] │   │
│  │                                                          │   │
│  │  📌 Group workout Saturday 10 AM at Marina Green!       │   │
│  │      - Iron_John (15 attending)                          │   │
│  │                                                          │   │
│  │  🔥 Who's doing leg day tomorrow? Need a spotter        │   │
│  │      - Bay_Beast (8 replies)                             │   │
│  │                                                          │   │
│  │  💡 Best gym in SOMA? Just moved here                   │   │
│  │      - NewGuy_SF (12 replies)                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🎯 LOCAL CHALLENGES                                     │   │
│  │                                                          │   │
│  │  "SF January Challenge" - Most TU this month            │   │
│  │  Prize Pool: 5,000 credits | 23 participants            │   │
│  │  Your Rank: #7 | Leader: Bay_Beast (45,230 TU)          │   │
│  │  [Join Challenge]                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.4 Hangout Features

#### Activity Feed
- See nearby users' workouts in real-time
- "Mike is working out 0.3 miles away!"
- Opportunity for spontaneous meetups

#### Local Leaderboards
- Daily/Weekly/Monthly rankings
- Distance-adjusted (closer = higher weight)
- Category-specific (strength, volume, consistency)

#### Events & Meetups
- Schedule real-world group workouts
- Gym recommendations
- Running routes
- Competition meetups

#### Bulletin Board
- Pin important messages (costs credits)
- Community Q&A
- Local gym reviews
- Equipment for sale/trade

#### Challenges
- Local competitions
- Prize pools from participants
- Platform bonus credits for winners

#### Resources (Artifacts)
- Local gym database
- Running routes
- Outdoor workout spots
- Healthy restaurant recommendations

### 4.5 Hangout Credit Economy

| Action | Cost/Reward |
|--------|-------------|
| Join hangout | Free |
| Post to bulletin | Free (3/day) |
| Pin post | 50 credits |
| Create event | 25 credits |
| Feature event | 100 credits |
| Create challenge | 100 credits |
| Add to prize pool | Variable |
| Win weekly challenge | 200 credits |
| Most helpful member (voted) | 100 credits/week |
| Recruit new member | 50 credits |

### 4.6 Privacy Controls

Users can control their hangout visibility:

| Setting | Options |
|---------|---------|
| Show distance | Exact / Approximate / Hidden |
| Show in member list | Yes / Workout only / No |
| Real-time location | Share / Don't share |
| Workout broadcasts | Public / Hangout / Friends / Private |

---

## 5. Real Money Integration

### 5.1 Core Equation

```
1 USD cent = 1 credit = 1 Exercise Unit (TU)
```

This means:
- $1.00 = 100 credits
- $5.00 = 500 credits
- $10.00 = 1,000 credits
- $50.00 = 5,000 credits
- $100.00 = 10,000 credits

### 5.2 Credit Packages

| Package | Price | Credits | Bonus | Total |
|---------|-------|---------|-------|-------|
| Starter | $1.00 | 100 | 0 | 100 |
| Basic | $5.00 | 500 | 25 (5%) | 525 |
| Standard | $10.00 | 1,000 | 100 (10%) | 1,100 |
| Plus | $25.00 | 2,500 | 375 (15%) | 2,875 |
| Premium | $50.00 | 5,000 | 1,000 (20%) | 6,000 |
| Elite | $100.00 | 10,000 | 2,500 (25%) | 12,500 |
| Ultimate | $200.00 | 20,000 | 6,000 (30%) | 26,000 |

### 5.3 Payment Methods

#### Stripe Integration (Primary)

- Credit/Debit Cards (Visa, MC, Amex, Discover)
- Apple Pay (Web + Mobile)
- Google Pay (Web + Mobile)
- Link (Stripe's one-click checkout)

```typescript
// Stripe Checkout Session
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  payment_method_types: ['card', 'link'],
  line_items: [{
    price_data: {
      currency: 'usd',
      product_data: {
        name: `${credits} MuscleMap Credits`,
        description: `Plus ${bonus} bonus credits!`,
      },
      unit_amount: priceInCents,
    },
    quantity: 1,
  }],
  success_url: `${baseUrl}/wallet/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${baseUrl}/wallet`,
  metadata: {
    userId,
    credits,
    bonus,
  },
});
```

#### PayPal Integration (Secondary)

- PayPal Balance
- PayPal Credit
- Venmo (US)
- Pay Later options

```typescript
// PayPal Order
const order = await paypal.orders.create({
  intent: 'CAPTURE',
  purchase_units: [{
    amount: {
      currency_code: 'USD',
      value: priceInDollars,
    },
    description: `${credits} MuscleMap Credits`,
    custom_id: JSON visitorId,
  }],
});
```

#### Strike Integration (Bitcoin/Lightning)

For crypto-friendly users:

- Bitcoin (on-chain)
- Lightning Network (instant)
- No KYC for small amounts

### 5.4 Subscription Option

Optional monthly subscription for credit discount:

| Tier | Price/Month | Credits/Month | Effective Rate | Perks |
|------|-------------|---------------|----------------|-------|
| Bronze | $4.99 | 600 | $0.83/100 | 5% store discount |
| Silver | $9.99 | 1,400 | $0.71/100 | 10% store discount, priority support |
| Gold | $19.99 | 3,200 | $0.62/100 | 15% store discount, early access |
| Platinum | $49.99 | 9,000 | $0.55/100 | 20% store discount, exclusive items |

### 5.5 Wallet UI

```
┌─────────────────────────────────────────────────────────────────┐
│  💰 YOUR WALLET                                                 │
│  ═══════════════════════════════════════════════════════════   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │         💎 12,450 CREDITS                               │   │
│  │                                                          │   │
│  │         Wealth Tier: GOLD 🥇                            │   │
│  │         7,550 to Platinum                                │   │
│  │         [████████████░░░░░░░░] 62%                      │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ADD CREDITS                                             │   │
│  │                                                          │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│  │  │  $5     │ │  $10    │ │  $25    │ │  $50    │       │   │
│  │  │ 525 cr  │ │ 1,100cr │ │ 2,875cr │ │ 6,000cr │       │   │
│  │  │  +5%    │ │  +10%   │ │  +15%   │ │  +20%   │       │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │   │
│  │                                                          │   │
│  │  Custom Amount: [________] USD    [Buy Credits]          │   │
│  │                                                          │   │
│  │  Payment: 💳 Card  |  🅿️ PayPal  |  ⚡ Lightning        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  RECENT TRANSACTIONS                                     │   │
│  │                                                          │   │
│  │  + 162 cr  Workout completed          Today 2:30 PM     │   │
│  │  - 500 cr  Diamond Frame              Today 1:15 PM     │   │
│  │  + 100 cr  Weekly leaderboard #3      Yesterday         │   │
│  │  + 75 cr   7-day streak bonus         Yesterday         │   │
│  │  + 1,100cr Purchase ($10)             Jan 12            │   │
│  │                                                          │   │
│  │  [View Full History →]                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.6 Refund Policy

- **Within 7 days:** Full refund if credits unspent
- **Partial refund:** Refund unspent credits only
- **No refunds:** On spent credits or after 30 days
- **Abuse prevention:** Max 2 refunds per account

---

## 6. Credit Visibility & Celebration

### 6.1 Philosophy: Every Earn = Dopamine Hit

Users should FEEL every credit they earn. This requires:
1. Visual feedback
2. Sound effects (optional)
3. Animations
4. Running totals
5. Comparisons ("You earned 50% more than yesterday!")

### 6.2 Real-Time Earnings Display

#### During Workout

```
┌─────────────────────────────────────────────────────────────────┐
│  WORKOUT IN PROGRESS                                            │
│                                                                 │
│  Current Exercise: Bench Press                                  │
│  Set 3 of 4 | 185 lbs × 8 reps                                 │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  💰 CREDITS EARNED THIS WORKOUT                          │   │
│  │                                                          │   │
│  │     ╔════════════════════════════════════════╗          │   │
│  │     ║           + 47 credits                 ║          │   │
│  │     ╚════════════════════════════════════════╝          │   │
│  │                                                          │   │
│  │  ├── 24 reps × 0.1 = +2.4 cr                            │   │
│  │  ├── 3 sets × 1 = +3 cr                                 │   │
│  │  └── Workout in progress... +10 at completion           │   │
│  │                                                          │   │
│  │  🎯 Hit a PR for +100 bonus!                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Workout Summary

```
┌─────────────────────────────────────────────────────────────────┐
│  🎉 WORKOUT COMPLETE!                                           │
│  ═══════════════════════════════════════════════════════════   │
│                                                                 │
│  Push Day | 45 minutes | 6,200 TU                              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │         💰 YOU EARNED                                   │   │
│  │                                                          │   │
│  │    ╔═══════════════════════════════════════════╗        │   │
│  │    ║                                           ║        │   │
│  │    ║          ⭐ 162 CREDITS ⭐               ║        │   │
│  │    ║                                           ║        │   │
│  │    ╚═══════════════════════════════════════════╝        │   │
│  │                                                          │   │
│  │    ┌────────────────────────────────────────────┐       │   │
│  │    │ Workout completion       +10               │       │   │
│  │    │ 120 reps completed       +12               │       │   │
│  │    │ 15 sets completed        +15               │       │   │
│  │    │ Volume bonus (6200 TU)   +25               │       │   │
│  │    │ 🏆 NEW PR: Bench Press   +100              │       │   │
│  │    ├────────────────────────────────────────────┤       │   │
│  │    │ TOTAL                    162 credits       │       │   │
│  │    └────────────────────────────────────────────┘       │   │
│  │                                                          │   │
│  │    New Balance: 12,612 credits (+1.3%)                  │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Share Workout]  [View Stats]  [Continue]                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Credit Animations

#### Floating Credits

When earning credits, show floating "+X" animations:
- Small earns (1-10): Small, quick fade
- Medium earns (11-50): Medium size, particle trail
- Large earns (51-100): Large, golden glow
- Huge earns (100+): Full celebration with confetti

#### Sound Effects (Optional)

- Coin clink for small earns
- Cash register for medium earns
- Jackpot sound for large earns
- Users can customize or disable

### 6.4 Credit Notifications

#### Push Notifications

```
🎉 MuscleMap: You earned 162 credits from your workout!
   New balance: 12,612 credits | Tap to view breakdown
```

```
🏆 MuscleMap: 7-day streak! +75 credits bonus
   Keep it up for the 14-day reward (+200 credits)
```

```
📈 MuscleMap: You placed #3 on the weekly leaderboard!
   +120 credits earned. Only 230 TU behind #2!
```

#### In-App Toasts

Every credit earn triggers a brief toast:
```
┌──────────────────────────────────┐
│ +10 💰 Workout Complete          │
└──────────────────────────────────┘
```

### 6.5 Credit Dashboard Widget

```
┌─────────────────────────────────────────────────────────────────┐
│  💰 TODAY'S EARNINGS                                            │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                                                            │ │
│  │   + 247 credits today                                     │ │
│  │   ██████████████████░░░░░░░░░░░░ 82% of daily average     │ │
│  │                                                            │ │
│  │   🔥 Workout:     +162 cr                                 │ │
│  │   🤝 Social:      +35 cr                                  │ │
│  │   🎯 Challenges:  +50 cr                                  │ │
│  │                                                            │ │
│  │   Tip: Complete a goal for +100 bonus!                    │ │
│  │                                                            │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.6 Weekly Summary Email

```
Subject: Your MuscleMap Week: 847 Credits Earned! 🎉

Hey [Name],

What a week! Here's your credit breakdown:

═══════════════════════════════════════════════
💰 TOTAL EARNED: 847 credits
   That's 23% more than last week!
═══════════════════════════════════════════════

BREAKDOWN:
├── Workouts (4):           +412 credits
├── Streak bonus (7-day):   +75 credits
├── Leaderboard (#5):       +40 credits
├── Social activity:        +120 credits
├── Goal progress (50%):    +50 credits
└── Daily bonuses:          +150 credits

SPENT: 500 credits
├── Gold Profile Frame:     500 credits

NEW BALANCE: 11,959 credits
WEALTH TIER: Gold (62% to Platinum)

═══════════════════════════════════════════════

🎯 NEXT WEEK'S OPPORTUNITIES:
• Complete 2 more workouts for +50 bonus
• Reach 14-day streak for +200 bonus
• Climb to Top 3 for +80 more credits

Keep crushing it!
- The MuscleMap Team
```

---

## 7. Database Schema Changes

### 7.1 New Tables

```sql
-- Migration: 068_economy_enhancements.ts

-- ============================================
-- GEO-BASED HANGOUTS
-- ============================================

-- User location for hangout matching
CREATE TABLE user_locations (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Location data
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  accuracy_meters INTEGER,

  -- Derived location (for privacy)
  city VARCHAR(100),
  state_province VARCHAR(100),
  country VARCHAR(100),
  postal_code VARCHAR(20),
  timezone VARCHAR(50),

  -- Privacy settings
  share_exact BOOLEAN DEFAULT false,  -- Show exact distance or approximate
  share_city BOOLEAN DEFAULT true,     -- Show city name

  -- Timestamps
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Geospatial index
  location GEOGRAPHY(POINT, 4326)
);

-- Create spatial index for distance queries
CREATE INDEX idx_user_locations_geo ON user_locations USING GIST(location);
CREATE INDEX idx_user_locations_city ON user_locations(city, state_province);

-- Geo-based hangouts
CREATE TABLE geo_hangouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Location definition
  name VARCHAR(255) NOT NULL,
  center_latitude DECIMAL(10, 8) NOT NULL,
  center_longitude DECIMAL(11, 8) NOT NULL,
  radius_miles INTEGER NOT NULL DEFAULT 25,

  -- Location metadata
  city VARCHAR(100),
  state_province VARCHAR(100),
  country VARCHAR(100),

  -- Stats
  member_count INTEGER DEFAULT 0,
  active_today INTEGER DEFAULT 0,

  -- Spatial
  area GEOGRAPHY(POLYGON, 4326),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_geo_hangouts_area ON geo_hangouts USING GIST(area);

-- User hangout membership (auto-assigned based on location)
CREATE TABLE user_hangout_memberships (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hangout_id UUID NOT NULL REFERENCES geo_hangouts(id) ON DELETE CASCADE,

  -- Membership type
  is_primary BOOLEAN DEFAULT false,  -- Main hangout (closest)
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Distance from user to hangout center
  distance_miles DECIMAL(6, 2),

  PRIMARY KEY (user_id, hangout_id)
);

CREATE INDEX idx_user_hangout_primary ON user_hangout_memberships(user_id) WHERE is_primary = true;

-- ============================================
-- CREDIT PACKAGES & PURCHASES
-- ============================================

-- Available credit packages
CREATE TABLE credit_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name VARCHAR(100) NOT NULL,
  price_cents INTEGER NOT NULL,
  credits INTEGER NOT NULL,
  bonus_credits INTEGER DEFAULT 0,
  bonus_percent DECIMAL(5, 2) DEFAULT 0,

  -- Display
  popular BOOLEAN DEFAULT false,
  best_value BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,

  -- Availability
  enabled BOOLEAN DEFAULT true,
  min_purchase INTEGER DEFAULT 1,  -- Min quantity
  max_purchase INTEGER DEFAULT 10, -- Max quantity

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default packages
INSERT INTO credit_packages (name, price_cents, credits, bonus_credits, bonus_percent, display_order, popular, best_value)
VALUES
  ('Starter', 100, 100, 0, 0, 1, false, false),
  ('Basic', 500, 500, 25, 5, 2, false, false),
  ('Standard', 1000, 1000, 100, 10, 3, true, false),
  ('Plus', 2500, 2500, 375, 15, 4, false, false),
  ('Premium', 5000, 5000, 1000, 20, 5, false, true),
  ('Elite', 10000, 10000, 2500, 25, 6, false, false),
  ('Ultimate', 20000, 20000, 6000, 30, 7, false, false);

-- Enhanced purchases table
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES credit_packages(id);
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50);
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS bonus_credits INTEGER DEFAULT 0;

-- ============================================
-- STORE CATEGORIES & ENHANCED ITEMS
-- ============================================

-- Store categories
CREATE TABLE store_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),

  -- Hierarchy
  parent_id UUID REFERENCES store_categories(id),

  -- Display
  display_order INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default categories
INSERT INTO store_categories (name, slug, description, icon, display_order)
VALUES
  ('Profile', 'profile', 'Customize your profile appearance', 'user', 1),
  ('Frames & Borders', 'frames', 'Profile frame decorations', 'frame', 2),
  ('Badges & Flair', 'badges', 'Show off your achievements', 'award', 3),
  ('Buddy Cosmetics', 'buddy', 'Customize your training buddy', 'pet', 4),
  ('Social Power', 'social', 'Enhanced social interactions', 'heart', 5),
  ('Utilities', 'utilities', 'Helpful tools and boosts', 'tool', 6),
  ('Hangout Items', 'hangout', 'Stand out in your hangout', 'home', 7),
  ('Prestige', 'prestige', 'Show your dedication', 'crown', 8);

-- Enhanced store items
ALTER TABLE store_items ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES store_categories(id);
ALTER TABLE store_items ADD COLUMN IF NOT EXISTS preview_url VARCHAR(500);
ALTER TABLE store_items ADD COLUMN IF NOT EXISTS animation_type VARCHAR(50);
ALTER TABLE store_items ADD COLUMN IF NOT EXISTS duration_days INTEGER;  -- NULL = permanent
ALTER TABLE store_items ADD COLUMN IF NOT EXISTS stackable BOOLEAN DEFAULT false;
ALTER TABLE store_items ADD COLUMN IF NOT EXISTS max_quantity INTEGER DEFAULT 1;
ALTER TABLE store_items ADD COLUMN IF NOT EXISTS sale_price_credits INTEGER;
ALTER TABLE store_items ADD COLUMN IF NOT EXISTS sale_ends_at TIMESTAMPTZ;

-- ============================================
-- CREDIT VISIBILITY & NOTIFICATIONS
-- ============================================

-- Credit earn events (for real-time display)
CREATE TABLE credit_earn_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Event details
  amount INTEGER NOT NULL,
  source VARCHAR(100) NOT NULL,  -- workout, streak, leaderboard, social, etc.
  source_id UUID,                 -- Reference to workout_id, etc.
  description VARCHAR(255),

  -- Display
  animation_type VARCHAR(50) DEFAULT 'normal',  -- normal, golden, celebration
  shown BOOLEAN DEFAULT false,  -- Has user seen this?

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fetching unseen events
CREATE INDEX idx_credit_earn_events_unseen ON credit_earn_events(user_id, created_at DESC) WHERE shown = false;
-- Auto-delete old events after 7 days
CREATE INDEX idx_credit_earn_events_cleanup ON credit_earn_events(created_at);

-- ============================================
-- RANDOM BONUS EVENTS
-- ============================================

-- Lucky/random reward configuration
CREATE TABLE bonus_event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Probability (0-1)
  probability DECIMAL(10, 8) NOT NULL,

  -- Reward
  min_credits INTEGER NOT NULL,
  max_credits INTEGER NOT NULL,

  -- Conditions
  trigger_on VARCHAR(50) NOT NULL,  -- rep, set, workout, login, etc.

  -- Limits
  max_per_day INTEGER DEFAULT 1,
  max_per_week INTEGER DEFAULT 7,

  enabled BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert random bonus events
INSERT INTO bonus_event_types (code, name, description, probability, min_credits, max_credits, trigger_on, max_per_day)
VALUES
  ('lucky_rep', 'Lucky Rep', 'Random rep gives bonus credits', 0.01, 5, 15, 'rep', 3),
  ('golden_set', 'Golden Set', 'Random set gives bonus credits', 0.02, 15, 35, 'set', 2),
  ('jackpot_workout', 'Jackpot Workout', 'Surprise workout bonus', 0.01, 50, 150, 'workout', 1),
  ('mystery_box', 'Mystery Box', 'Daily random reward', 1.0, 5, 500, 'daily_login', 1);

-- User bonus event history
CREATE TABLE user_bonus_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type_id UUID NOT NULL REFERENCES bonus_event_types(id),

  credits_awarded INTEGER NOT NULL,
  trigger_source_id UUID,  -- workout_id, etc.

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_bonus_events_user_date ON user_bonus_events(user_id, created_at DESC);

-- ============================================
-- HANGOUT CHALLENGES & PRIZE POOLS
-- ============================================

-- Hangout challenges
CREATE TABLE hangout_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hangout_id UUID NOT NULL REFERENCES geo_hangouts(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Type
  challenge_type VARCHAR(50) NOT NULL,  -- total_tu, streak, workouts, etc.
  metric_key VARCHAR(100),

  -- Duration
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,

  -- Prize pool
  base_prize INTEGER DEFAULT 0,  -- Platform contribution
  contributed_prize INTEGER DEFAULT 0,  -- User contributions

  -- Entry
  entry_fee INTEGER DEFAULT 0,  -- Credits to join (adds to pool)
  max_participants INTEGER,

  -- Status
  status VARCHAR(20) DEFAULT 'upcoming',  -- upcoming, active, completed

  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hangout_challenges_hangout ON hangout_challenges(hangout_id, starts_at DESC);
CREATE INDEX idx_hangout_challenges_active ON hangout_challenges(status, ends_at) WHERE status = 'active';

-- Challenge participants
CREATE TABLE hangout_challenge_participants (
  challenge_id UUID NOT NULL REFERENCES hangout_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Progress
  current_value DECIMAL(15, 2) DEFAULT 0,
  rank INTEGER,

  -- Payment
  entry_paid INTEGER DEFAULT 0,
  additional_contribution INTEGER DEFAULT 0,

  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (challenge_id, user_id)
);

-- Challenge prize distribution
CREATE TABLE hangout_challenge_prizes (
  challenge_id UUID NOT NULL REFERENCES hangout_challenges(id) ON DELETE CASCADE,
  place INTEGER NOT NULL,  -- 1st, 2nd, 3rd, etc.

  prize_amount INTEGER NOT NULL,
  prize_percent DECIMAL(5, 2),  -- Percent of pool

  winner_id UUID REFERENCES users(id),
  paid_at TIMESTAMPTZ,

  PRIMARY KEY (challenge_id, place)
);

-- ============================================
-- VIEWS FOR CONVENIENCE
-- ============================================

-- User credit summary view
CREATE OR REPLACE VIEW user_credit_summary AS
SELECT
  u.id AS user_id,
  u.username,
  cb.balance,
  cb.lifetime_earned,
  cb.lifetime_spent,
  u.wealth_tier,
  COALESCE(today.earned_today, 0) AS earned_today,
  COALESCE(week.earned_this_week, 0) AS earned_this_week
FROM users u
LEFT JOIN credit_balances cb ON cb.user_id = u.id
LEFT JOIN LATERAL (
  SELECT SUM(amount) AS earned_today
  FROM credit_ledger cl
  WHERE cl.user_id = u.id
    AND cl.amount > 0
    AND cl.created_at >= CURRENT_DATE
) today ON true
LEFT JOIN LATERAL (
  SELECT SUM(amount) AS earned_this_week
  FROM credit_ledger cl
  WHERE cl.user_id = u.id
    AND cl.amount > 0
    AND cl.created_at >= DATE_TRUNC('week', CURRENT_DATE)
) week ON true;

-- Hangout member view with distance
CREATE OR REPLACE VIEW hangout_members_with_distance AS
SELECT
  uhm.hangout_id,
  uhm.user_id,
  u.username,
  u.display_name,
  u.wealth_tier,
  ul.city,
  uhm.distance_miles,
  uhm.is_primary,
  CASE
    WHEN uhm.distance_miles < 5 THEN 'neighbor'
    WHEN uhm.distance_miles < 15 THEN 'local'
    WHEN uhm.distance_miles < 50 THEN 'regional'
    ELSE 'extended'
  END AS distance_tier
FROM user_hangout_memberships uhm
JOIN users u ON u.id = uhm.user_id
LEFT JOIN user_locations ul ON ul.user_id = uhm.user_id
ORDER BY uhm.distance_miles ASC;
```

### 7.2 Enhanced Earning Rules

```sql
-- Add new earning rules for economy enhancements
INSERT INTO earning_rules (code, name, category, credits_base, xp_base, max_per_day, cooldown_minutes, enabled)
VALUES
  -- Per-rep/set earnings
  ('rep_complete', 'Rep Completed', 'workout', 0.1, 0.2, NULL, NULL, true),
  ('set_complete', 'Set Completed', 'workout', 1, 2, NULL, NULL, true),
  ('new_exercise', 'New Exercise Tried', 'workout', 5, 10, 5, NULL, true),

  -- Volume bonuses
  ('volume_5000', 'Volume Bonus (5000 TU)', 'workout', 25, 50, 1, NULL, true),
  ('volume_10000', 'Volume Bonus (10000 TU)', 'workout', 50, 100, 1, NULL, true),

  -- Goal progress
  ('goal_25', 'Goal 25% Progress', 'goal', 25, 50, NULL, NULL, true),
  ('goal_50', 'Goal 50% Progress', 'goal', 50, 100, NULL, NULL, true),
  ('goal_75', 'Goal 75% Progress', 'goal', 75, 150, NULL, NULL, true),

  -- Social
  ('high_five_give', 'Give High Five', 'social', 1, 2, 50, NULL, true),
  ('high_five_receive', 'Receive High Five', 'social', 2, 4, NULL, NULL, true),
  ('post_feed', 'Post to Feed', 'social', 3, 5, 10, NULL, true),
  ('comment_receive', 'Receive Comment', 'social', 2, 4, NULL, NULL, true),
  ('prop_receive', 'Receive Prop', 'social', 1, 2, NULL, NULL, true),
  ('answer_question', 'Answer Question', 'social', 10, 20, 10, NULL, true),
  ('helpful_answer', 'Helpful Answer', 'social', 25, 50, NULL, NULL, true),

  -- Hangout
  ('hangout_event_host', 'Host Hangout Event', 'social', 100, 200, 2, NULL, true),
  ('hangout_challenge_win', 'Win Hangout Challenge', 'leaderboard', 200, 400, NULL, NULL, true),

  -- Random bonuses
  ('lucky_rep', 'Lucky Rep Bonus', 'special', 10, 20, 3, NULL, true),
  ('golden_set', 'Golden Set Bonus', 'special', 25, 50, 2, NULL, true),
  ('jackpot_workout', 'Jackpot Workout', 'special', 100, 200, 1, NULL, true),
  ('mystery_box', 'Daily Mystery Box', 'special', 50, 100, 1, NULL, true),

  -- Time-based
  ('comeback_bonus', 'Comeback Bonus', 'special', 50, 100, 1, 4320, true),  -- 3 day cooldown
  ('early_bird', 'Early Bird Workout', 'special', 15, 30, 1, NULL, true),
  ('night_owl', 'Night Owl Workout', 'special', 15, 30, 1, NULL, true),
  ('weekend_warrior', 'Weekend Workout', 'special', 10, 20, 2, NULL, true),

  -- Referral
  ('referral_signup', 'Referral Sign Up', 'special', 500, 1000, NULL, NULL, true),
  ('referral_level5', 'Referral Reaches Level 5', 'special', 500, 1000, NULL, NULL, true)
ON CONFLICT (code) DO UPDATE SET
  credits_base = EXCLUDED.credits_base,
  xp_base = EXCLUDED.xp_base,
  max_per_day = EXCLUDED.max_per_day,
  enabled = EXCLUDED.enabled;
```

### 7.3 Indexes for Performance

```sql
-- Credit earn events - for real-time display
CREATE INDEX idx_credit_earn_events_user_unseen
ON credit_earn_events(user_id, created_at DESC)
WHERE shown = false;

-- Geo queries - for hangout matching
CREATE INDEX idx_user_locations_geo_active
ON user_locations USING GIST(location)
WHERE latitude IS NOT NULL;

-- Hangout challenges - for active challenges
CREATE INDEX idx_hangout_challenges_active_ends
ON hangout_challenges(ends_at)
WHERE status = 'active';

-- Store items - for browsing
CREATE INDEX idx_store_items_category_enabled
ON store_items(category_id, display_order)
WHERE enabled = true;

-- Purchases - for user history
CREATE INDEX idx_purchases_user_keyset
ON purchases(user_id, created_at DESC, id DESC);
```

---

## 8. Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
**Goal:** Core earning visibility and celebration

**Backend:**
- [ ] Create `credit_earn_events` table and service
- [ ] Add per-rep/per-set earning hooks
- [ ] Implement real-time credit event streaming (WebSocket)
- [ ] Add new earning rules to database
- [ ] Create credit summary view

**Frontend:**
- [ ] Credit earn toast component with animations
- [ ] During-workout credit counter
- [ ] Workout summary credit breakdown
- [ ] Credit dashboard widget
- [ ] Sound effects (optional toggle)

**Testing:**
- [ ] E2E test for credit earning flow
- [ ] Performance test for high-frequency earns

### Phase 2: Spending Expansion (Weeks 3-4)
**Goal:** More ways to spend credits

**Backend:**
- [ ] Store categories system
- [ ] Enhanced store items with categories
- [ ] Profile frame/badge system
- [ ] Duration-based items (boosts)
- [ ] Gift/tip endpoints

**Frontend:**
- [ ] Store redesign with categories
- [ ] Profile customization page
- [ ] Frame/badge preview
- [ ] Gift flow UI
- [ ] Boost activation UI

### Phase 3: Geo Hangouts (Weeks 5-6)
**Goal:** Location-based community

**Backend:**
- [ ] PostGIS extension setup
- [ ] User location service
- [ ] Geo hangout auto-creation
- [ ] Distance-based member sorting
- [ ] Hangout matching algorithm

**Frontend:**
- [ ] Location permission flow
- [ ] Geo hangout home view
- [ ] Distance-sorted member list
- [ ] Local leaderboard
- [ ] Privacy controls

### Phase 4: Real Money (Weeks 7-8)
**Goal:** Fiat currency integration

**Backend:**
- [ ] Stripe Checkout integration
- [ ] PayPal integration
- [ ] Credit package system
- [ ] Purchase webhooks
- [ ] Refund handling

**Frontend:**
- [ ] Wallet page redesign
- [ ] Credit package selection
- [ ] Payment method selection
- [ ] Purchase confirmation
- [ ] Transaction history

### Phase 5: Challenges & Social (Weeks 9-10)
**Goal:** Competitive spending

**Backend:**
- [ ] Hangout challenges system
- [ ] Prize pool management
- [ ] Super High Five / props system
- [ ] Post boosting
- [ ] Streak protection purchases

**Frontend:**
- [ ] Challenge creation flow
- [ ] Prize pool contribution
- [ ] Challenge leaderboard
- [ ] Enhanced props animations
- [ ] Streak freeze purchase

### Phase 6: Polish & Launch (Weeks 11-12)
**Goal:** Production ready

- [ ] Performance optimization
- [ ] Mobile app integration
- [ ] Email notifications for credits
- [ ] Weekly summary emails
- [ ] Admin dashboard for economy
- [ ] Abuse monitoring alerts
- [ ] Documentation
- [ ] Launch announcement

---

## 9. Anti-Abuse & Balance

### 9.1 Rate Limiting

| Action | Limit | Period |
|--------|-------|--------|
| Credit earns from reps | 1000 | Per day |
| Credit earns from sets | 200 | Per day |
| High fives given | 50 | Per day |
| Posts to feed | 10 | Per day |
| Challenge entries | 10 | Per day |
| Gift transactions | 20 | Per day |

### 9.2 Fraud Detection

- **Velocity checks:** Unusual earning patterns
- **Device fingerprinting:** Multiple accounts
- **IP analysis:** VPN/proxy detection
- **Behavioral analysis:** Bot-like activity
- **Transaction patterns:** Circular transfers

### 9.3 Economy Monitoring

Daily automated checks:
- Credit inflation rate
- Average earn/spend ratio
- Wealth distribution (Gini coefficient)
- Popular items analysis
- Suspicious account flags

### 9.4 Balance Levers

If economy needs adjustment:
- Modify earning rule amounts
- Adjust item prices
- Add limited-time sales
- Introduce credit sinks (new items)
- Seasonal events

---

## 10. Success Metrics

### 10.1 Engagement Metrics

| Metric | Week 1 | Month 1 | Month 3 |
|--------|--------|---------|---------|
| Users viewing credit earn | 50% | 70% | 80% |
| Users spending credits | 20% | 40% | 60% |
| Credits earned/user/day | 50 | 100 | 150 |
| Store visits/user/week | 1 | 3 | 5 |

### 10.2 Revenue Metrics

| Metric | Month 1 | Month 3 | Month 6 |
|--------|---------|---------|---------|
| Users who purchased | 1% | 3% | 5% |
| Avg purchase size | $5 | $8 | $12 |
| Monthly revenue | $500 | $3,000 | $15,000 |
| ARPU (paying) | $10 | $15 | $20 |

### 10.3 Hangout Metrics

| Metric | Month 1 | Month 3 | Month 6 |
|--------|---------|---------|---------|
| Users with geo enabled | 30% | 50% | 70% |
| Hangout participation | 20% | 40% | 60% |
| Local challenges created | 50 | 500 | 2,000 |
| Real-world meetups | 10 | 100 | 500 |

### 10.4 Economy Health

| Metric | Healthy Range |
|--------|---------------|
| Daily inflation rate | < 2% |
| Earn/spend ratio | 0.8-1.2 |
| Wealth Gini coefficient | < 0.6 |
| Active spenders | > 30% |
| Credit velocity | 0.5-2.0 turns/month |

---

## Appendix A: API Endpoints

```typescript
// Credit visibility
GET    /me/credits/summary          // Balance, tier, today's earnings
GET    /me/credits/events           // Unseen earn events (for animation)
POST   /me/credits/events/mark-seen // Mark events as seen
GET    /me/credits/history          // Full transaction history

// Store
GET    /store/categories            // All categories
GET    /store/items                 // Items with filtering
GET    /store/items/:sku            // Single item details
POST   /store/purchase              // Buy item
POST   /store/gift                  // Gift item to user

// Wallet & Payments
GET    /me/wallet                   // Wallet summary
GET    /wallet/packages             // Available credit packages
POST   /wallet/checkout/stripe      // Create Stripe session
POST   /wallet/checkout/paypal      // Create PayPal order
POST   /wallet/webhook/stripe       // Stripe webhook
POST   /wallet/webhook/paypal       // PayPal webhook

// Geo Hangouts
GET    /hangouts/geo/my             // User's primary hangout
GET    /hangouts/geo/:id            // Hangout details
GET    /hangouts/geo/:id/members    // Members sorted by distance
POST   /me/location                 // Update user location
GET    /hangouts/geo/:id/challenges // Hangout challenges
POST   /hangouts/geo/:id/challenges // Create challenge
POST   /hangouts/challenges/:id/join // Join challenge

// Social spending
POST   /social/high-five/super      // Send super high five (costs credits)
POST   /social/props/special        // Send special props
POST   /social/tip                  // Tip a user
POST   /feed/posts/:id/boost        // Boost a post

// Utility spending
POST   /me/streak/freeze            // Purchase streak freeze
POST   /me/boosts/activate          // Activate a boost
```

---

## Appendix B: Credit Flow Diagrams

### Earning Flow
```
User Action (rep, set, workout)
     │
     ▼
┌─────────────────┐
│ Earning Service │
└────────┬────────┘
         │
         ├──► Check earning rules
         │
         ├──► Check daily limits
         │
         ├──► Calculate amount
         │
         ├──► Random bonus check
         │
         ▼
┌─────────────────┐
│ Economy Service │
└────────┬────────┘
         │
         ├──► Add credits (atomic)
         │
         ├──► Create ledger entry
         │
         ├──► Create earn event
         │
         ▼
┌─────────────────┐
│ WebSocket Push  │
└────────┬────────┘
         │
         ▼
    Client Animation
```

### Spending Flow
```
User Purchase Request
     │
     ▼
┌─────────────────┐
│  Store Service  │
└────────┬────────┘
         │
         ├──► Validate item exists
         │
         ├──► Check affordability
         │
         ├──► Check requirements
         │
         ▼
┌─────────────────┐
│ Economy Service │
└────────┬────────┘
         │
         ├──► Charge credits (atomic)
         │
         ├──► Create ledger entry
         │
         ├──► Add to inventory
         │
         ▼
    Purchase Complete
```

---

*End of Plan Document*

**Next Steps:**
1. Review with stakeholders
2. Prioritize phases
3. Begin Phase 1 implementation
4. Set up economy monitoring dashboard
