# MuscleMap Route Map

This document provides a complete map of all routes in the MuscleMap application, organized by domain.

**Last Updated:** 2026-01-19

---

## Frontend Routes

### Public Routes (No Authentication Required)

| Path | Component | Description |
|------|-----------|-------------|
| `/` | Landing | Home/marketing page |
| `/login` | Login | User authentication |
| `/signup` | Signup | User registration |
| `/design-system` | DesignSystem | Design tokens preview |
| `/ui-showcase` | UIShowcase | Component library |
| `/features` | Features | Feature overview |
| `/technology` | Technology | Tech stack docs |
| `/science` | Science | Scientific backing |
| `/design` | Design | Design philosophy |
| `/docs` | Docs | Documentation hub |
| `/docs/plugins` | PluginGuide | Plugin dev guide |
| `/docs/:docId` | Docs | Dynamic doc pages |
| `/privacy` | Privacy | Privacy policy |
| `/skills` | Skills | Skill tree system |
| `/skills/:treeId` | Skills | Specific skill tree |
| `/martial-arts` | MartialArts | Martial arts system |
| `/martial-arts/:disciplineId` | MartialArts | Specific discipline |
| `/issues` | Issues | Public issue tracker |
| `/issues/:id` | IssueDetail | Issue details |
| `/updates` | DevUpdates | Development updates |
| `/roadmap` | Roadmap | Product roadmap |
| `/live` | LiveActivityMonitor | Real-time activity |
| `/community/bulletin` | CommunityBulletinBoard | Community announcements |
| `/contribute` | ContributeIdeas | Feature suggestions |

### Protected Routes (Authentication Required)

#### Core Experience
| Path | Component | Description |
|------|-----------|-------------|
| `/dashboard` | Dashboard | Main user hub |
| `/onboarding` | Onboarding | Initial setup flow |
| `/workout` | Workout | Active workout tracker |
| `/journey` | Journey | Character progression |
| `/progression` | Progression | Level/rank progress |

#### Profile & Settings
| Path | Component | Description |
|------|-----------|-------------|
| `/profile` | Profile | User profile |
| `/settings` | Settings | Account settings |

#### Fitness & Health
| Path | Component | Description |
|------|-----------|-------------|
| `/exercises` | Exercises | Exercise database |
| `/stats` | Stats | Workout statistics |
| `/personal-records` | PersonalRecords | 1RM tracking |
| `/progress-photos` | ProgressPhotos | Photo gallery |
| `/health` | Health | Health dashboard |
| `/wellness` | *redirect* | Legacy alias → `/health` |
| `/recovery` | Recovery | Recovery metrics |
| `/goals` | Goals | Goal tracking |
| `/limitations` | Limitations | Injury tracking |
| `/pt-tests` | PTTests | Physical tests |
| `/career-readiness` | CareerReadiness | Career assessment |
| `/leaderboard` | Leaderboard | Global leaderboards |

#### Career System
| Path | Component | Description |
|------|-----------|-------------|
| `/career` | CareerPage | Career hub |
| `/career/goals/:goalId` | CareerGoalPage | Career goal details |
| `/career/standards/:standardId` | CareerStandardPage | Career standard details |

#### Community & Social
| Path | Component | Description |
|------|-----------|-------------|
| `/community` | CommunityDashboard | Community hub |
| `/competitions` | Competitions | Challenges |
| `/locations` | Locations | Hangouts |
| `/highfives` | HighFives | Social validation |
| `/messages` | Messages | Direct messaging |
| `/crews` | Crews | Team management |
| `/rivals` | Rivals | Rival tracking |

#### Economy & Commerce
| Path | Component | Description |
|------|-----------|-------------|
| `/credits` | Credits | Credit balance |
| `/wallet` | Wallet | Transactions |
| `/skins` | SkinsStore | Cosmetics shop |
| `/marketplace` | Marketplace | Item trading |
| `/trading` | Trading | P2P trading |
| `/collection` | Collection | User inventory |
| `/mystery-boxes` | MysteryBoxes | Loot boxes |
| `/trainers` | Trainers | Trainer marketplace |

#### Nutrition
| Path | Component | Description |
|------|-----------|-------------|
| `/nutrition` | Nutrition | Nutrition dashboard |
| `/nutrition/settings` | NutritionSettings | Preferences |
| `/nutrition/recipes` | Recipes | Recipe library |
| `/nutrition/recipes/:recipeId` | Recipes | Recipe details |
| `/nutrition/plans` | MealPlans | Meal plans |
| `/nutrition/plans/:planId` | MealPlans | Plan details |
| `/nutrition/plans/:planId/shopping-list` | ShoppingList | Shopping list |
| `/nutrition/history` | NutritionHistory | History |

#### Achievements
| Path | Component | Description |
|------|-----------|-------------|
| `/achievements` | Achievements | Achievement list |
| `/achievements/verify/:achievementId` | AchievementVerification | Submit proof |
| `/achievements/my-verifications` | MyVerifications | User verifications |
| `/verifications/:verificationId/witness` | WitnessAttestation | Witness another user |

#### Issues
| Path | Component | Description |
|------|-----------|-------------|
| `/issues/new` | NewIssue | Report issue |
| `/my-issues` | MyIssues | User's issues |

#### Exploration
| Path | Component | Description |
|------|-----------|-------------|
| `/adventure-map` | AdventureMapPage | Quest map |
| `/explore` | MapExplore | Navigation map |

#### Plugins
| Path | Component | Description |
|------|-----------|-------------|
| `/plugins` | PluginMarketplace | Plugin marketplace |
| `/plugins/settings` | PluginSettings | Plugin config |

### Admin Routes (Admin Only)

| Path | Component | Description |
|------|-----------|-------------|
| `/admin` | *redirect* | Shortcut → `/admin-control` |
| `/admin-control` | AdminControl | General admin panel |
| `/admin/issues` | AdminIssues | Issue moderation |
| `/admin/monitoring` | AdminMonitoring | System monitoring |
| `/admin/metrics` | AdminMetrics | Performance KPIs |
| `/admin/disputes` | AdminDisputes | Dispute resolution |
| `/admin/fraud` | AdminFraud | Fraud detection |
| `/empire` | EmpireControl | Master admin |
| `/empire/scorecard` | TestScorecard | Test results |
| `/empire/deploy` | DeploymentControl | Deployment management |
| `/dev/anatomy-viewer` | AnatomyViewer | 3D anatomy tool |

---

## API Routes

### Base URL: `/api`

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | User registration |
| POST | `/auth/login` | User login |
| POST | `/auth/refresh` | Refresh JWT |
| POST | `/auth/logout` | Logout |
| GET | `/auth/me` | Current user profile |
| GET | `/auth/me/capabilities` | User permissions |

### Economy (`/api/economy/*`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/economy/pricing` | Get pricing tiers |
| GET | `/economy/balance` | Get simple balance |
| GET | `/economy/wallet` | Alias for balance |
| GET | `/economy/history` | Transaction history |
| GET | `/economy/transactions` | Alias for history |
| GET | `/economy/actions` | Credit action definitions |
| POST | `/economy/charge` | Charge credits |

### Credits & Wallet (`/api/credits/*`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/credits/wallet` | Detailed wallet info |
| GET | `/credits/me/credits/summary` | Comprehensive credit summary |
| GET | `/credits/wallet/transactions` | Transaction history (keyset pagination) |
| POST | `/credits/wallet/transfer` | Transfer credits |
| GET | `/credits/wallet/transfers` | Transfer history |
| GET | `/credits/wallet/earnings` | Earning history |

### Store (`/api/credits/store/*`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/credits/store/categories` | Store categories |
| GET | `/credits/store/items` | Store items |
| GET | `/credits/store/featured` | Featured items |
| GET | `/credits/store/items/:sku` | Single item |
| POST | `/credits/store/purchase` | Purchase item |
| GET | `/credits/store/inventory` | User inventory |
| GET | `/credits/store/owns/:sku` | Check ownership |

### Training Buddy (`/api/credits/buddy/*`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/credits/buddy` | Get buddy |
| POST | `/credits/buddy` | Create buddy |
| PUT | `/credits/buddy/species` | Change species |
| PUT | `/credits/buddy/nickname` | Set nickname |
| POST | `/credits/buddy/equip` | Equip cosmetic |
| POST | `/credits/buddy/unequip` | Unequip cosmetic |
| PUT | `/credits/buddy/settings` | Update settings |
| GET | `/credits/buddy/evolution/:species` | Evolution path |
| GET | `/credits/buddy/leaderboard` | Buddy leaderboard |

### Workouts (`/api/workouts/*`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/workouts` | Get workouts |
| POST | `/workouts` | Create workout |
| GET | `/workouts/:id` | Get workout |
| PUT | `/workouts/:id` | Update workout |
| DELETE | `/workouts/:id` | Delete workout |
| POST | `/workouts/complete` | Complete workout |
| GET | `/workouts/:id/exercises` | Get exercises |
| GET | `/workouts/stats` | Workout stats |
| GET | `/workouts/recent` | Recent workouts |

### Stats (`/api/stats/*`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats/me` | User stats |
| GET | `/stats/:userId` | User stats by ID |
| GET | `/stats/leaderboards` | All leaderboards |
| GET | `/stats/leaderboards/:type` | Specific leaderboard |
| GET | `/stats/percentile` | User percentile |
| GET | `/stats/history` | Stats history |
| GET | `/stats/muscle-stats` | Muscle statistics |

### Community (`/api/community/*`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/community/feed` | Activity feed |
| GET | `/community/stats` | Community stats |
| GET | `/community/presence` | Active users |
| GET | `/community/percentile` | User percentile |
| GET | `/community/public-stats` | Public stats |

### Communities (`/api/communities/*`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/communities` | List communities |
| POST | `/communities` | Create community |
| GET | `/communities/:id` | Get community |
| PUT | `/communities/:id` | Update community |
| DELETE | `/communities/:id` | Delete community |
| POST | `/communities/:id/join` | Join community |
| POST | `/communities/:id/leave` | Leave community |
| GET | `/communities/:id/members` | List members |
| GET | `/communities/:id/posts` | Get posts |
| POST | `/communities/:id/posts` | Create post |

### Messaging (`/api/messaging/*`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/messaging/conversations` | Get conversations |
| POST | `/messaging/conversations` | Create conversation |
| GET | `/messaging/conversations/:id` | Get conversation |
| GET | `/messaging/conversations/:id/messages` | Get messages |
| POST | `/messaging/conversations/:id/messages` | Send message |
| DELETE | `/messaging/messages/:id` | Delete message |
| POST | `/messaging/block/:userId` | Block user |
| DELETE | `/messaging/block/:userId` | Unblock user |
| GET | `/messaging/blocked` | Blocked users |

### Goals (`/api/goals/*`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/goals` | Get goals |
| POST | `/goals` | Create goal |
| GET | `/goals/:id` | Get goal |
| PUT | `/goals/:id` | Update goal |
| DELETE | `/goals/:id` | Delete goal |
| POST | `/goals/:id/progress` | Log progress |
| GET | `/goals/:id/history` | Progress history |
| POST | `/goals/:id/claim` | Claim reward |
| GET | `/goal-suggestions` | Get suggestions |

### Nutrition (`/api/nutrition/*`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/nutrition` | Dashboard |
| GET | `/nutrition/goals` | Goals |
| PUT | `/nutrition/goals` | Update goals |
| GET | `/nutrition/preferences` | Preferences |
| POST | `/nutrition/preferences` | Update preferences |
| POST | `/nutrition/enable` | Enable tracking |
| POST | `/nutrition/disable` | Disable tracking |
| GET | `/nutrition/history` | History |
| GET | `/meals/:date` | Meals by date |
| POST | `/meals` | Log meal |
| PUT | `/meals/:id` | Update meal |
| DELETE | `/meals/:id` | Delete meal |
| GET | `/hydration/:date` | Hydration |
| POST | `/hydration` | Log hydration |
| GET | `/recipes` | Recipes |
| GET | `/recipes/:id` | Recipe details |
| POST | `/recipes` | Create recipe |
| PUT | `/recipes/:id` | Update recipe |
| DELETE | `/recipes/:id` | Delete recipe |
| POST | `/recipes/:id/save` | Save recipe |
| POST | `/recipes/:id/unsave` | Unsave recipe |
| POST | `/recipes/:id/rate` | Rate recipe |
| GET | `/recipes/popular` | Popular recipes |
| POST | `/macros/calculate` | Calculate macros |
| GET | `/meal-plans` | Meal plans |
| GET | `/meal-plans/:id` | Plan details |
| POST | `/meal-plans` | Create plan |
| POST | `/meal-plans/:id/activate` | Activate plan |
| POST | `/meal-plans/:id/deactivate` | Deactivate plan |
| DELETE | `/meal-plans/:id` | Delete plan |
| POST | `/meal-plans/generate` | Generate plan |
| GET | `/meal-plans/active` | Active plan |

### Admin Routes (`/api/admin/*`)

See `docs/ADMIN-API.md` for comprehensive admin route documentation.

**Key admin endpoint categories:**
- `/admin/credits/*` - Credit adjustments, reversals
- `/admin/wallet/*` - Wallet freeze/unfreeze
- `/admin/fraud-flags/*` - Fraud detection
- `/admin/trust/*` - Trust tier management
- `/admin/escrow/*` - Escrow management
- `/admin/disputes/*` - Dispute resolution
- `/admin/economy/metrics` - Economy dashboard
- `/admin/server/*` - Server control
- `/admin/database/*` - DB management
- `/admin/scheduler/*` - Scheduled jobs
- `/admin/logs/*` - Log analysis
- `/admin/security/*` - Security audit
- `/admin/backup/*` - Backup management
- `/admin/features/*` - Feature flags
- `/admin/metrics/*` - Real-time metrics
- `/admin/analytics/*` - User analytics
- `/admin/alerts/*` - Alert configuration

---

## GraphQL

**Endpoint:** `POST /api/graphql`

See `apps/api/src/graphql/schema.ts` for the complete GraphQL schema.

---

## Route Naming Conventions

### Frontend
- **Paths are kebab-case**: `/personal-records`, `/progress-photos`
- **Dynamic params use camelCase**: `/:goalId`, `/:standardId`
- **Admin routes under `/admin/*`** with dedicated pages
- **Empire routes under `/empire/*`** for master admin

### API
- **Resource names are plural**: `/workouts`, `/goals`, `/communities`
- **Singular for user-specific resource**: `/buddy` (user has one)
- **Actions are verbs**: `/join`, `/leave`, `/complete`
- **Admin routes under `/admin/*`**
- **Keyset pagination preferred over offset**

---

## Deprecated Routes

| Old Path | New Path | Notes |
|----------|----------|-------|
| `/wellness` | `/health` | Redirect in place |
| `/api/credits/balance` | `/api/economy/balance` | Removed duplicate |

---

## Adding New Routes

### Frontend
1. Create page component in `src/pages/`
2. Add lazy import in `src/App.tsx`
3. Add Route element with appropriate wrapper (ProtectedRoute, AdminRoute)
4. Update this document

### API
1. Create route file in `apps/api/src/http/routes/`
2. Register in `apps/api/src/http/server.ts`
3. Add to appropriate prefix
4. Update this document
