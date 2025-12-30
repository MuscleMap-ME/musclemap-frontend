# MuscleMap Messaging & Economy System

A comprehensive social messaging platform with micro-transaction economy, skins store, and location bulletin boards.

## Features

### 💬 Messaging System
- **Direct Messages** - 1:1 conversations
- **Group Chats** - Multi-user conversations  
- **Message Categories** - Inbox, Starred, Archived, Custom folders
- **Message Reactions** - React to messages with emojis
- **User Blocking** - Block unwanted contacts
- **Text-Message Paradigm** - Fluid, instant communication

### 💰 Credit Economy
- **Credit Wallet** - Balance, transactions, history
- **Message Costs** - 0.1 credits per recipient per message
- **Credit Purchases** - Buy credits with real money (1 credit = $0.01)
- **Credit Transfers** - Send credits to other users
- **Tipping** - Tip users for helpful content
- **VIP Tiers** - Bronze → Silver → Gold → Platinum → Diamond

### 🎨 Skins Store
- **40+ Skins** - Dashboard themes, avatar frames, badges, effects
- **5 Rarities** - Common, Uncommon, Rare, Epic, Legendary
- **Unlock System** - Premium skins unlock as you generate credits
- **Equip System** - Customize your profile appearance

### 📍 Location Bulletin Boards
- **Tips & Reviews** - Share location-specific info
- **Voting System** - Upvote/downvote posts
- **Equipment Crowdsourcing** - Report gym equipment at locations
- **Confirmation System** - Verify equipment reports
- **23 Equipment Types** - Pull-up bars, rings, benches, etc.

### 📊 Admin Analytics
- **Economy Overview** - Credits in circulation, revenue, activity
- **VIP Leaders** - Track top economy players
- **Daily Stats** - Message counts, spending, transfers
- **Messaging Stats** - Conversations, blocks, activity
- **Location Stats** - Posts, equipment reports

## Installation

```bash
cd /var/www/musclemap.me
bash install.sh
```

Then copy route files:

```bash
# Backend routes
cp routes/messaging.js server/routes/
cp routes/economy.js server/routes/
cp routes/skins.js server/routes/
cp routes/bulletin.js server/routes/
cp routes/admin-analytics.js server/routes/

# Frontend pages
cp frontend/Messages.jsx src/pages/
cp frontend/Wallet.jsx src/pages/
cp frontend/SkinsStore.jsx src/pages/
```

Add routes to `server/index.js`:

```javascript
import messagingRouter from './routes/messaging.js';
import economyRouter from './routes/economy.js';
import skinsRouter from './routes/skins.js';
import bulletinRouter from './routes/bulletin.js';
import adminAnalyticsRouter from './routes/admin-analytics.js';

app.use('/api/messaging', messagingRouter);
app.use('/api/economy', economyRouter);
app.use('/api/skins', skinsRouter);
app.use('/api/bulletin', bulletinRouter);
app.use('/api/admin/analytics', adminAnalyticsRouter);
```

Add routes to `src/App.jsx`:

```jsx
import Messages from './pages/Messages';
import Wallet from './pages/Wallet';
import SkinsStore from './pages/SkinsStore';

<Route path="/messages" element={<Messages />} />
<Route path="/wallet" element={<Wallet />} />
<Route path="/skins" element={<SkinsStore />} />
<Route path="/locations/:locationId/bulletin" element={<LocationBulletin />} />
```

## API Endpoints

### Messaging
- `GET /api/messaging/conversations` - List conversations
- `POST /api/messaging/conversations` - Create conversation
- `GET /api/messaging/conversations/:id/messages` - Get messages
- `POST /api/messaging/conversations/:id/messages` - Send message (costs credits)
- `PATCH /api/messaging/conversations/:id/category` - Update category
- `POST /api/messaging/conversations/:id/leave` - Leave conversation
- `GET /api/messaging/blocks` - List blocked users
- `POST /api/messaging/blocks` - Block user
- `DELETE /api/messaging/blocks/:userId` - Unblock user

### Economy
- `GET /api/economy/wallet` - Get wallet & ranking
- `GET /api/economy/transactions` - Transaction history
- `GET /api/economy/pricing` - Credit pricing tiers
- `POST /api/economy/purchase` - Initiate purchase
- `POST /api/economy/transfer` - Send credits
- `POST /api/economy/tip` - Tip a user

### Skins
- `GET /api/skins` - List all skins
- `GET /api/skins/owned` - User's owned skins
- `GET /api/skins/equipped` - Currently equipped skins
- `GET /api/skins/unlockable` - Skins user can unlock
- `POST /api/skins/:id/purchase` - Buy a skin
- `POST /api/skins/:id/equip` - Equip a skin
- `POST /api/skins/:id/unequip` - Unequip a skin

### Bulletin Boards
- `GET /api/bulletin/:locationId/posts` - Get location posts
- `POST /api/bulletin/:locationId/posts` - Create post (costs credits)
- `POST /api/bulletin/:locationId/posts/:postId/vote` - Vote on post
- `GET /api/bulletin/:locationId/equipment` - Get equipment list
- `POST /api/bulletin/:locationId/equipment` - Report equipment
- `POST /api/bulletin/:locationId/equipment/:id/confirm` - Confirm/dispute equipment

### Admin Analytics
- `GET /api/admin/analytics/economy/overview` - Economy stats
- `GET /api/admin/analytics/economy/leaders` - Top economy players
- `GET /api/admin/analytics/economy/users/:userId` - User economy profile
- `GET /api/admin/analytics/messaging/stats` - Messaging stats
- `GET /api/admin/analytics/locations/stats` - Location stats
- `POST /api/admin/analytics/economy/recalculate-tiers` - Recalculate VIP tiers

## Database Tables

### Messaging
- `conversations` - Conversation metadata
- `conversation_participants` - Who's in each conversation
- `messages` - Individual messages
- `message_reactions` - Emoji reactions
- `message_categories` - User-defined folders
- `user_blocks` - Blocked users

### Economy
- `credit_wallets` - User balances
- `credit_transactions` - Transaction ledger
- `credit_purchases` - Real money purchases
- `credit_transfers` - User-to-user transfers
- `economy_rankings` - VIP tiers & stats
- `economy_daily_stats` - Daily analytics

### Skins
- `skins` - Available skins catalog
- `user_skins` - User ownership & equipped status

### Bulletin Boards
- `location_posts` - User posts
- `location_post_votes` - Upvotes/downvotes
- `location_equipment` - Reported equipment
- `equipment_confirmations` - Verification records

## Credit Costs

| Action | Cost |
|--------|------|
| Send message (per recipient) | 0.1 credits |
| Post to bulletin board | 0.1 credits |
| Skins | 10 - 3000 credits |

## VIP Tiers

| Tier | Credits Generated |
|------|------------------|
| Bronze | 0 |
| Silver | 100 |
| Gold | 500 |
| Platinum | 2,000 |
| Diamond | 10,000 |

## Skin Rarities

| Rarity | Price Range |
|--------|-------------|
| Common | 10-50 credits |
| Uncommon | 100-200 credits |
| Rare | 250-500 credits |
| Epic | 600-1200 credits |
| Legendary | 1500-3000 credits |

---

Built for MuscleMap 💪
