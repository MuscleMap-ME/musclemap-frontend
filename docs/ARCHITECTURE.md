# MuscleMap Architecture

> Auto-generated on 2026-01-19

## Overview

MuscleMap is a cross-platform fitness tracking application with real-time muscle visualization. The architecture follows a modular, layered approach with clear separation of concerns.

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend Web** | React + Vite + TailwindCSS | Single-page application |
| **Frontend Mobile** | React Native + Expo | iOS & Android apps |
| **API Server** | Fastify + TypeScript | REST/GraphQL API |
| **Database** | PostgreSQL | Primary data store |
| **Cache** | Redis (optional) | Session/query caching |
| **Reverse Proxy** | Caddy | HTTPS termination |

## Directory Structure

```
musclemap.me/
├── apps/
│   ├── api/
│   └── mobile/
├── assets/
│   └── anatomy/
├── config/
│   ├── roadmap-overrides.yaml
│   └── route-atlas-overrides.yaml
├── data/
│   ├── reference/
│   ├── musclemap.db
│   ├── musclemap.db-shm
│   └── musclemap.db-wal
├── docs/
│   ├── analysis/
│   ├── archive/
│   ├── business/
│   ├── images/
│   ├── latex/
│   ├── legacy-system/
│   ├── plans/
│   ├── public/
│   ├── specs/
│   ├── API_REFERENCE.md
│   ├── APPLE-WATCH-IMPLEMENTATION.md
│   ├── ARCHETYPE-GRAPHICS-UPGRADE-PLAN.md
│   ├── ARCHITECTURE.md
│   ├── BIOMETRICS.md
│   ├── CHATGPT-GRAPHICS-GENERATION-PROMPT.md
│   ├── CODING-STYLE-GUIDE.md
│   ├── CODING-STYLE-IMPLEMENTATION-PLAN.md
│   ├── COMPETITOR-FEATURE-ANALYSIS.md
│   ├── COMPREHENSIVE-AUDIT-PLAN.md
│   ├── CONTRIBUTING.md
│   ├── CREDITS_ECONOMY.md
│   ├── CROSS-PLATFORM-COMPATIBILITY-PLAN.md
│   ├── DATA_FLOW.md
│   ├── DATA_MODEL.md
│   ├── DATABASE-OPTIMIZATION-PLAN.md
│   ├── ECONOMY-ENHANCEMENT-PLAN.md
│   ├── ENDPOINT-HEALTH-REPORT.md
│   ├── ENGAGEMENT-SYSTEM-PLAN.md
│   ├── EXTENSIBILITY.md
│   ├── FEATURE-GAP-ANALYSIS.md
│   ├── FEATURES.md
│   ├── FULL_REFACTOR_PLAN.md
│   ├── ICONS.md
│   ├── IMPLEMENTATION_PLAN_REMAINING.md
│   ├── IMPLEMENTATION_PLANS.md
│   ├── IMPLEMENTATION-PLAN-4-FEATURES.md
│   ├── INTELLIGENT-EXERCISE-PRESCRIPTION-PLAN.md
│   ├── KNOWN-BUGS.md
│   ├── LOW-BANDWIDTH-OPTIMIZATION-PLAN.md
│   ├── MARKETPLACE-TRADING-SYSTEM-PLAN.md
│   ├── mascot_system.md
│   ├── MASCOT-POWERS-PLAN.md
│   ├── MASTER-IMPLEMENTATION-PLAN.md
│   ├── MISSING-FEATURES-IMPLEMENTATION-PLAN.md
│   ├── NATIVE_EXTENSIONS.md
│   ├── NUTRITION-SYSTEM-PLAN.md
│   ├── PLUGIN-DEVELOPMENT.md
│   ├── PLUGINS.md
│   ├── PRIVACY_POLICY.md
│   ├── RANKING_LEADERBOARD_SYSTEM_PLAN.md
│   ├── REFACTOR_PLAN.md
│   ├── ROUTE-CLEANUP-PLAN.md
│   ├── ROUTE-MAP.md
│   ├── SCALING-ARCHITECTURE-PLAN.md
│   ├── SCRIPT-RESTRUCTURE-PLAN.md
│   ├── SECURITY.md
│   ├── SPA-UX-IMPROVEMENTS-PLAN.md
│   ├── SPIRIT-ANIMAL-SYSTEM.md
│   ├── STAGE-1-ARCHITECTURE-ANALYSIS.md
│   ├── STAGE-2-USER-PERSONAS.md
│   ├── STAGE-3-TEST-HARNESS.md
│   ├── STAGE-4-5-6-SIMULATION-ANALYSIS-PLAN.md
│   ├── STATE-MANAGEMENT.md
│   ├── SYSTEM-ARCHITECTURE.md
│   ├── TOUCHSCREEN_UX_AUDIT.md
│   ├── TOUCHSCREEN_UX_BEFORE_AFTER.md
│   ├── TOUCHSCREEN_UX_IMPLEMENTATION.md
│   ├── UI-UX-ENHANCEMENT-PLAN.md
│   ├── UNFINISHED-WORK-COMPLETION-PLAN.md
│   ├── USER_GUIDE.md
│   ├── VISUAL_ARCHITECTURE_MAPS.md
│   ├── WEBHOOK-DEPLOY-SETUP.md
│   └── XP-VELOCITY-LIMITS.md
├── docs-plain/
│   ├── api-reference/
│   ├── checklists/
│   ├── concepts/
│   ├── developer-guide/
│   ├── features/
│   ├── machine-readable/
│   ├── reference/
│   ├── user-guide/
│   ├── QUICK-START.md
│   └── README.md
├── e2e/
│   └── login.spec.ts
├── markdown/
│   ├── FINAL_AUDIT_REPORT.md
│   ├── MONETIZATION.md
│   ├── README.md
│   └── ROADMAP.md
├── native/
│   ├── lib/
│   ├── src/
│   ├── index.js
│   ├── index.js.map
│   ├── index.ts
│   ├── Makefile
│   ├── package.json
│   └── tsconfig.json
├── packages/
│   ├── client/
│   ├── contracts/
│   ├── core/
│   ├── plugin-sdk/
│   ├── shared/
│   └── ui/
├── plugins/
│   ├── admin-tools/
│   ├── examples/
│   └── leaderboard/
├── public/
│   ├── atlases/
│   ├── docs/
│   ├── docs-files/
│   ├── docs-plain/
│   ├── fonts/
│   ├── illustrations/
│   ├── images/
│   ├── mascot/
│   ├── models/
│   ├── analytics-preview.html
│   ├── components-preview.html
│   ├── favicon.ico
│   ├── founding.html
│   ├── icon-128.png
│   ├── icon-128.webp
│   ├── icon-144.png
│   ├── icon-144.webp
│   ├── icon-152.png
│   ├── icon-152.webp
│   ├── icon-192.png
│   ├── icon-192.webp
│   ├── icon-384.png
│   ├── icon-384.webp
│   ├── icon-48.png
│   ├── icon-48.webp
│   ├── icon-512-maskable.png
│   ├── icon-512-maskable.webp
│   ├── icon-512.png
│   ├── icon-512.webp
│   ├── icon-72.png
│   ├── icon-72.webp
│   ├── icon-96.png
│   ├── icon-96.webp
│   ├── index.html
│   ├── logo-180.avif
│   ├── logo-180.png
│   ├── logo-180.webp
│   ├── logo-32.png
│   ├── logo-32.webp
│   ├── logo-80.avif
│   ├── logo-80.png
│   ├── logo-80.webp
│   ├── logo-optimized.png
│   ├── logo-optimized.webp
│   ├── logo.avif
│   ├── logo.png
│   ├── logo.svg
│   ├── logo.webp
│   ├── manifest.json
│   ├── offline.html
│   ├── privacy-policy.md
│   ├── robots.txt
│   ├── sitemap.xml
│   ├── sw.js
│   ├── ui-preview.html
│   └── ui-static.html
├── scripts/
│   ├── archive/
│   ├── bug-hunter/
│   ├── caddy/
│   ├── lib/
│   ├── systemd/
│   ├── test-harness/
│   ├── utils/
│   ├── approved-commands.log
│   ├── approved-commands.txt
│   ├── backfill-ranks.ts
│   ├── build-fast.sh
│   ├── build-safe.sh
│   ├── build-vendors.sh
│   ├── build-with-vendors.sh
│   ├── cache-manager.mjs
│   ├── check-duplicate-routes.sh
│   ├── competitive-analysis.sh
│   ├── compress-assets.sh
│   ├── deploy-branch.sh
│   ├── deploy.sh
│   ├── docs-plain-index.html
│   ├── e2e-user-journey.ts
│   ├── esbuild-cache-server.mjs
│   ├── frontend-health-check.ts
│   ├── generate-docs.cjs
│   ├── generate-icons.cjs
│   ├── logs.sh
│   ├── maintain.sh
│   ├── merge-all.sh
│   ├── mm
│   ├── musclemap-start.sh
│   ├── musclemap-stop.sh
│   ├── pre-deploy-check.sh
│   ├── prebundle-vendors.mjs
│   ├── prepare-app-store.cjs
│   ├── production-deploy.sh
│   ├── publish-app.sh
│   ├── README.md
│   ├── repo-cleanup.sh
│   ├── reset-devbox.sh
│   ├── run-approved-command.sh
│   ├── smart-build.mjs
│   ├── test.sh
│   ├── tidy-root-js.sh
│   ├── warning-tracker.sh
│   ├── webhook-deploy.sh
│   └── webhook-listener.js
├── src/
│   ├── components/
│   ├── config/
│   ├── contexts/
│   ├── fixtures/
│   ├── graphql/
│   ├── hooks/
│   ├── layouts/
│   ├── lib/
│   ├── locales/
│   ├── mocks/
│   ├── pages/
│   ├── plugins/
│   ├── services/
│   ├── store/
│   ├── styles/
│   ├── tests/
│   ├── utils/
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── audit_legacy_posix.sh
├── CLAUDE-CODE-ANATOMY-ASSETS-PROMPT.md
├── CLAUDE.md
├── cron-jobs.js
├── deploy.sh
├── ecosystem.config.cjs
├── eslint.config.js
├── index.html
├── LICENSE
├── lighthouserc.json
├── musclemap_exercises.json
├── new-path-exercises.json
├── package.json
├── playwright.config.ts
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── postcss.config.js
├── README.md
├── tailwind.config.js
├── vite-bundle-cache.js
├── vite-prebundled-vendors.js
├── vite-rollup-cache.js
├── vite-transform-cache.js
└── vite.config.js

```

## Packages

| Package | Description |
|---------|-------------|
| `@musclemap/client` | Shared client-side business logic for MuscleMap |
| `@musclemap/contracts` | Shared GraphQL schema and types for MuscleMap |
| `@musclemap/core` | Shared domain types and utilities for MuscleMap |
| `@musclemap/plugin-sdk` | SDK for building MuscleMap plugins |
| `@musclemap/shared` | Shared utilities and constants for MuscleMap apps |
| `@musclemap/ui` | Shared cross-platform UI components for MuscleMap |

## Frontend Pages (84 total)

| Page | Protected | Description |
|------|-----------|-------------|
| Achievements | No | Achievements page |
| AchievementVerification | No | AchievementVerification page |
| AdminControl | No | AdminControl page |
| AdminDisputes | Yes | Admin Disputes Dashboard  Admin interface for managing economy disputes |
| AdminFraud | No | AdminFraud page |
| AdminIssues | Yes | Admin Issues Page  Admin dashboard for managing issues: - View all issues (including private) - Change status, priority, assignee - Bulk actions - Create dev updates - Manage roadmap / |
| AdminMetrics | Yes | Admin Metrics Dashboard  Beautiful visual dashboard for Prometheus metrics with: - Real-time gauges for connections and health - Time-series charts for request latency - Status indicators with animations - Auto-refresh every 10 seconds / |
| AdminMonitoring | Yes | Admin Monitoring Dashboard  Comprehensive system monitoring with: - Live API test runner - User journey viewer - Error tracking - System health metrics / |
| AdventureMap | Yes | AdventureMap Page  Fullscreen adventure map page with HUD |
| Buddy | No | Buddy page |
| CareerGoalPage | Yes | Career Goal Detail Page - MuscleMap  Shows full readiness dashboard for a specific career goal |
| CareerPage | Yes | Career Page - MuscleMap Career Readiness Hub  Main landing page for career physical standards tracking |
| CareerReadiness | Yes | Career Readiness Page - MuscleMap Liquid Glass Design  Career physical standards tracking for military, first responders, and law enforcement |
| CareerStandardPage | Yes | Career Standard Detail Page - MuscleMap  Shows detailed information about a specific physical fitness standard |
| Collection | No | Collection page |
| CommandCenter | No | Command Center  A beautiful, hierarchical interface for executing server commands |
| CommunityBulletinBoard | No | Community Bulletin Board  A central hub for community contributions, plugin showcases, code snippets, ideas, and collaboration |
| CommunityDashboard | Yes | CommunityDashboard Page  Comprehensive community dashboard with: - Real-time activity feed - Geographic map view - Statistics dashboard - Monitoring panel (for mods/admins) - Privacy settings / |
| Competitions | No | Competitions page |
| ContributeIdeas | No | Contribute Ideas Page  A page showcasing ways to contribute to MuscleMap, with project improvement ideas and suggestions |
| Credits | No | Credits page |
| Crews | Yes | Crews Page  Crew management and Crew Wars tournament system for web |
| Dashboard | Yes | Dashboard - MuscleMap Liquid Glass Design  A comprehensive, modern dashboard using the liquid glass design system inspired by visionOS and iOS 18 spatial computing aesthetics |
| DeploymentControl | No | Deployment Control Center  A sophisticated web management portal for deployment operations |
| Design | No | Design Page  Showcases MuscleMap's design system with links to the interactive design system page |
| DesignSystem | No | Design System Showcase  Demonstrates the MuscleMap Liquid Glass design system components |
| DevUpdates | No | Dev Updates Page  Development updates, announcements, and changelog: - Release notes - Bug fixes - Feature announcements / |
| Docs | No | Docs page |
| EmpireControl | Yes | Empire Control - Master Admin Panel  The ultimate control center for the MuscleMap empire, integrating: - System metrics and monitoring dashboards - Community management and messaging - Owner avatar with unlimited powers - User and resource management - Slack integration - Real-time activity feeds / |
| Exercises | No | Exercises page |
| Features | No | Features Page  Showcases MuscleMap features with VGA-style graphics, charts, and bars |
| Goals | Yes | Goals Page - MuscleMap Liquid Glass Design  Goal-based training with targets, progress tracking, and milestones |
| Health | Yes | Health Page  Wearables integration and health data dashboard for web |
| HighFives | No | HighFives page |
| IssueDetail | Yes | Issue Detail Page  Single issue view with: - Full issue details - Comments thread - Voting and subscription - Status history / |
| Issues | Yes | Issues Page  Bug and issue tracker with: - Issue listing with filters - Search functionality - Voting system - Status badges / |
| Journey | No | Journey page |
| Landing | No | Landing page |
| Leaderboard | No | Leaderboard page |
| Limitations | Yes | Limitations Page - MuscleMap Liquid Glass Design  Manage physical limitations, disabilities, and exercise modifications |
| LiveActivityMonitor | No | LiveActivityMonitor Page  Real-time activity visualization dashboard |
| Locations | No | Locations page |
| Login | Yes | Login page |
| MapExplore | No | MapExplore Page  Full-page interactive map navigation with three visualization modes |
| Marketplace | No | Marketplace page |
| MartialArts | No | MartialArts page |
| MealPlans | No | Meal Plans Page  Create and manage meal plans / |
| Messages | No | Messages page |
| MyIssues | Yes | My Issues Page  User's submitted issues: - View status of reported issues - Track responses / |
| MysteryBoxes | No | MysteryBoxes page |
| MyVerifications | No | MyVerifications page |
| NewIssue | No | New Issue Page  Create a new bug report, feature request, or other issue: - Form with validation - Auto-capture browser/device info - Screenshot upload - Label selection / |
| Nutrition | No | Nutrition Page  Full nutrition tracking dashboard / |
| NutritionHistory | No | Nutrition History Page  View historical nutrition data and trends / |
| NutritionSettings | No | Nutrition Settings Page  Configure nutrition tracking preferences and goals / |
| Onboarding | Yes | Handle archetype selection from ArchetypeSelector The selector already calls the API, so we just update state and move to step 2 / |
| PersonalRecords | No | Personal Records Page  Track and visualize personal records (PRs) including: - 1RM estimates for all exercises - PR history and progression charts - Exercise-specific records - Overall strength progression / |
| PluginGuide | No | Plugin Development Guide  A visual, step-by-step guide for creating MuscleMap plugins with interactive diagrams and code examples |
| PluginMarketplace | No | PluginMarketplace - Browse and install community plugins  Features: - Browse available plugins - Search and filter - Install/uninstall plugins - View plugin details / |
| PluginSettings | No | PluginSettings - Manage installed plugins  Features: - View installed plugins - Enable/disable plugins - Configure plugin settings - Uninstall plugins - View plugin permissions / |
| Privacy | No | Privacy Policy Page  Required for App Store submission |
| Profile | No | Profile page |
| Progress-photos | No | Progress Photos Page  Complete progress photo tracking with: - Photo capture with positioning guides - Before/after comparison slider - Timeline gallery with thumbnails - Body part categorization - Image compression before upload - Local-only storage option (privacy mode) / |
| Progression | No | Progression page |
| PTTests | Yes | PT Tests Page - MuscleMap Liquid Glass Design  Physical fitness tests for military, first responders, and occupational training |
| Recipes | No | Recipes Page  Browse, create, and manage recipes / |
| Recovery | Yes | Recovery Page  Sleep tracking and recovery scoring system |
| Rivals | Yes | Rivals Page  1v1 rivalry competition system for web |
| Roadmap | No | Roadmap Page  Public roadmap showing: - Planned features - In progress work - Completed features - Voting on priorities / |
| Science | No | Science Page  Explains the science behind MuscleMap's Training Units and muscle activation system |
| Settings | No | Settings page |
| ShoppingList | No | Shopping List Page  Displays aggregated shopping list from a meal plan / |
| Signup | Yes | Signup page |
| Skills | No | Skills page |
| SkinsStore | No | SkinsStore page |
| Stats | Yes | Stats Page  Character stats display with radar chart visualization and leaderboards |
| Technology | No | Technology Stack Page  Showcases MuscleMap's technology architecture with VGA-style graphics |
| TestScorecard | Yes | Test Scorecard Dashboard  Empire dashboard component for viewing API test results, including: - Overall score with grade (A+/A/B/C/D/F) - Category breakdown (core, edge, security, performance) - Failed tests list with details - Recommendations - Historical trend chart / |
| Trading | No | Trading page |
| TrainerDashboard | No | TrainerDashboard page |
| Trainers | Yes | Trainers Page  Browse trainers, manage trainer profile, create/manage classes |
| Wallet | No | Wallet page |
| WitnessAttestation | No | WitnessAttestation page |
| Workout | No | Workout page |

## Components (298 total)

Components are organized by feature:

### AdaptiveImage.tsx
- `AdaptiveImage`

### ErrorBoundary.tsx
- `ErrorBoundary`

### Logo.tsx
- `Logo`

### PrefetchLink.tsx
- `PrefetchLink`

### SEO.tsx
- `SEO`

### SessionRecoveryModal.tsx
- `SessionRecoveryModal`

### Toast
- `ToastProvider`

### admin
- `AlertsPanel`
- `BackupPanel`
- `DatabasePanel`
- `DeployPanel`
- `EnvPanel`
- `FeatureFlagsPanel`
- `LogsPanel`
- `MarkdownEditor`
- `MetricsPanel`
- `SchedulerPanel`
- `SecurityPanel`
- `ServerControl`
- `UserAnalyticsPanel`

### adventure-map
- `AdventureMapCanvas`
- `LocationNode`
- `MapCharacter`
- `MapPath`
- `MapRegion`
- `AdventureHUD`
- `CompanionWidget`
- `CreditsWidget`
- `MinimapWidget`
- `StatsBar`
- `AdventureMapFullscreen`
- `AdventureMapWidget`

### ai-coach
- `AICoach`
- `ChatMessage`
- `CoachAvatar`
- `QuickActions`

### analytics
- `InsightCard`
- `MiniChart`
- `WeeklyHeatmap`

### anatomy
- `AnatomyModel`

### animated
- `AnimatedNumber`

### animations
- `AnimatedNumber`

### archetypes
- `ArchetypeCard`
- `ArchetypeDetail`
- `ArchetypeGrid`
- `ArchetypeSelector`
- `CategoryGrid`

### atlas
- `AtlasCanvas`
- `AtlasControls`
- `AtlasLegend`
- `AtlasSearch`
- `AtlasTooltip`
- `RouteNode`
- `AtlasProvider`
- `ArchitectureAtlas`
- `DashboardAtlas`
- `DocsAtlas`
- `RoadmapAtlas`
- `RouteAtlas`

### career
- `AssessmentLogger`
- `CareerGoalWizard`
- `CareerStandardCard`
- `CareerStandardsList`
- `EventBreakdown`
- `ReadinessDashboard`
- `ReadinessTrendChart`

### celebrations
- `AchievementBurst`
- `Confetti`
- `LevelUpCelebration`
- `LevelUpEffect`
- `StreakFire`
- `StreakFlame`
- `SuccessBurst`
- `useCelebration`

### challenges
- `ChallengeCard`
- `ChallengeProgress`
- `ChallengeReward`
- `ChallengeTimer`
- `DailyChallenges`

### command
- `CommandItem`
- `CommandPalette`
- `useCommandPalette`

### community
- `ActivityFeed`
- `CommunityMap`
- `MonitorPanel`
- `PrivacySettings`
- `StatsDashboard`

### credits
- `BonusEventPopup`
- `CreditBalanceWidget`
- `CreditEarnStream`
- `CreditEarnToast`
- `CreditPackageStore`
- `EarningSummary`
- `WorkoutCreditsCounter`

### d3
- `D3Container`
- `BarChartD3`
- `ForceGraph`
- `MuscleMapD3`
- `ParticleField`
- `PieChartD3`
- `RadarChartD3`
- `RouteAtlasD3`
- `WorldMapD3`

### discovery
- `FeatureCard`
- `FeatureDiscovery`

### empty
- `EmptyState`
- `AchievementIllustration`
- `CommunityIllustration`
- `DataIllustration`
- `ErrorIllustration`
- `ExercisesIllustration`
- `GenericIllustration`
- `GoalsIllustration`
- `MessagesIllustration`
- `SearchIllustration`
- `StatsIllustration`
- `SuccessIllustration`
- `WorkoutIllustration`
- `index`
- `shared`

### engagement
- `ActiveEvents`
- `DailyLoginReward`
- `StreakDisplay`

### feedback
- `BugReportForm`
- `EmptyState`
- `EmptyStateIllustrations`
- `FeatureSuggestionForm`
- `FeedbackCenter`
- `FeedbackHub`
- `FeedbackModal`
- `GitHubStatsWidget`
- `OpenSourceBanner`
- `OpenSourceHero`

### gamification
- `ChallengeCard`
- `DailyChallenges`
- `DailyQuests`
- `LevelUpModal`
- `LootDrop`
- `LootReward`
- `XPProgress`

### glass
- `ActionCard`
- `ButtonEffects`
- `GlassButton`
- `GlassMobileNav`
- `GlassNav`
- `GlassProgress`
- `GlassSidebar`
- `GlassSurface`
- `MeshBackground`
- `MuscleActivationCard`
- `SwipeableCard`

### hangouts
- `GeoHangoutCard`
- `HangoutChallengeCard`
- `HangoutMembersList`

### help
- `HelpProvider`
- `HelpTooltip`

### icons
- `Avatar`
- `FitnessIcons`
- `Icon`

### illustrations
- `BodyMuscleMap`
- `ExerciseIllustration`
- `MuscleDetailPopover`
- `MuscleMapPages`
- `MuscleMapSpecialized`
- `MuscleMapStorybook`
- `MuscleMapUI`
- `MuscleMapUIShowcase`

### inputs
- `Stepper`

### landing
- `InteractiveDemo`
- `LiveCommunityStats`
- `MuscleHeroAnimation`
- `MuscleTrackingDemo`
- `RPGProgressionDemo`
- `WorkoutLogDemo`

### live
- `ActivityMapAnonymous`
- `FilterPanel`
- `HierarchyNavigator`
- `LiveActivityFeed`
- `StatsPanel`
- `TrendingExercises`

### loot
- `LootChest`
- `LootDrop`
- `LootReveal`

### map-menu
- `MapMenu`
- `Legend`
- `MapMenuSkeleton`
- `NodeTooltip`
- `QualityIndicator`
- `SearchOverlay`
- `ViewSelector`

### mascot
- `Cockatrice`
- `Cockatrice3D`
- `CockatriceErrorReporter`
- `CockatriceHeraldic`
- `CockatriceToast`
- `CompanionCharacter`
- `CompanionContext`
- `CompanionDock`
- `CompanionPanel`
- `CompanionProgress`
- `CompanionReaction`
- `GlobalMascot2D`
- `GlobalMascot3D`
- `GlobalMascotAbout`
- `GlobalMascotHero`
- `GlobalMascotLoader`

### messaging
- `ConversationList`
- `MessageThread`
- `NewConversation`

### muscle-explorer
- `MuscleControls`
- `MuscleDetail`
- `MuscleExplorer`
- `MuscleHistory`
- `MuscleInfo`
- `MuscleInfoPanel`
- `MuscleModel`
- `MuscleRegion`
- `MuscleStats`

### muscle-viewer
- `MuscleActivationBadge`
- `MuscleHeatmap`
- `MuscleViewer`
- `MuscleViewer2D`
- `MuscleViewer3D`
- `MuscleViewerSkeleton`

### navigation
- `BreadcrumbItem`
- `Breadcrumbs`

### nutrition
- `BarcodeScanner`
- `NutritionDashboardCard`
- `QuickLogModal`

### offline
- `ConflictResolver`
- `OfflineIndicator`
- `SyncStatus`

### onboarding
- `SpotlightTour`

### profile
- `WealthTierBadge`

### progress
- `ProgressIndicator`

### progress-photos
- `PhotoCompare`
- `PhotoGallery`
- `PhotoGuide`

### ranks
- `RankBadge`
- `VeteranBadge`

### search
- `CommandPalette`

### settings
- `EquipmentSelector`
- `JourneyManagement`
- `RestTimerSettings`
- `UnitToggle`

### skeletons
- `AtlasSkeleton`
- `CardSkeleton`
- `ChartSkeleton`
- `JourneySkeleton`
- `ListSkeleton`
- `ProfileSkeleton`
- `SkeletonBase`
- `SkeletonCard`
- `SkeletonStats`
- `TableSkeleton`
- `WorkoutSkeleton`

### sleep-hygiene
- `SleepHygieneDashboardCard`

### social
- `ActivityFeed`
- `HangoutCard`

### stats
- `VolumeChart`

### tips
- `ContextualTip`
- `ContextualTipProvider`
- `DailyTip`
- `ExerciseTip`
- `MilestoneCard`
- `MilestoneProgress`
- `TipCard`
- `WorkoutComplete`

### tour
- `SpotlightTour`
- `TourStep`

### transitions
- `AdaptiveAnimatePresence`
- `AnimatePresenceLite`
- `PageTransition`
- `SharedElement`
- `TransitionLink`
- `TransitionProvider`

### video
- `VideoPlayer`
- `VideoThumbnail`

### virtual
- `Managed3DContainer`
- `VirtualList`

### workout
- `FloatingRestTimer`
- `RIRSelector`
- `RPESelector`
- `RPETrendsChart`
- `RestTimerControl`
- `RestTimerSettings`
- `SetLogger`
- `SupersetGroup`

### workout-mode
- `ExerciseDisplay`
- `ExerciseVideo`
- `MusclePreview`
- `QuickControls`
- `RestTimer`
- `SetLogger`
- `SupersetMode`
- `WorkoutMode`
- `WorkoutProgress`

### xr
- `XRButton`

## API Endpoints (1054 total)

| Method | Path | Handler |
|--------|------|---------|
| GET | `/` | admin-beta-testers |
| GET | `/__routes` | misc |
| POST | `/1rm` | one-rep-max |
| DELETE | `/1rm/:entryId` | one-rep-max |
| GET | `/1rm/best` | one-rep-max |
| POST | `/1rm/calculate` | one-rep-max |
| GET | `/1rm/classification` | one-rep-max |
| GET | `/1rm/compound-total` | one-rep-max |
| GET | `/1rm/exercise/:exerciseId` | one-rep-max |
| GET | `/1rm/exercise/:exerciseId/pr` | one-rep-max |
| GET | `/1rm/formulas` | one-rep-max |
| GET | `/1rm/leaderboard/:exerciseId` | one-rep-max |
| GET | `/1rm/progression/:exerciseId` | one-rep-max |
| GET | `/1rm/rep-table` | one-rep-max |
| POST | `/1rm/reverse-calculate` | one-rep-max |
| POST | `/1rm/scores` | one-rep-max |
| GET | `/1rm/summary` | one-rep-max |
| GET | `/achievements/categories` | achievements |
| GET | `/achievements/definitions` | achievements |
| GET | `/achievements/definitions/:key` | achievements |
| GET | `/achievements/verification-required` | verifications |
| GET | `/admin-control/audit` | admin-control |
| GET | `/admin-control/audit/credits` | admin-control |
| POST | `/admin-control/credits/adjust` | admin-control |
| POST | `/admin-control/emergency/:action` | admin-control |
| GET | `/admin-control/emergency/status` | admin-control |
| GET | `/admin-control/groups` | admin-control |
| GET | `/admin-control/pipelines` | admin-control |
| GET | `/admin-control/scripts` | admin-control |
| GET | `/admin-control/system-status` | admin-control |
| GET | `/admin-control/users` | admin-control |
| POST | `/admin-control/users/:userId/:action` | admin-control |
| POST | `/admin/abuse-check/:userId` | credits |
| GET | `/admin/alerts/channels` | admin-alerts |
| POST | `/admin/alerts/channels` | admin-alerts |
| GET | `/admin/alerts/history` | admin-alerts |
| GET | `/admin/alerts/rules` | admin-alerts |
| POST | `/admin/alerts/rules` | admin-alerts |
| GET | `/admin/analytics/cohorts` | admin-analytics |
| GET | `/admin/analytics/dashboard` | admin-analytics |
| GET | `/admin/analytics/features` | admin-analytics |
| POST | `/admin/analytics/recalculate` | admin-analytics |
| GET | `/admin/analytics/segments` | admin-analytics |
| GET | `/admin/analytics/segments/:id/members` | admin-analytics |
| GET | `/admin/analytics/users/:id` | admin-analytics |
| GET | `/admin/analytics/users/:id/timeline` | admin-analytics |
| GET | `/admin/analytics/users/new` | admin-analytics |
| POST | `/admin/backup/create` | admin-backup |
| GET | `/admin/backup/list` | admin-backup |
| GET | `/admin/backup/schedule` | admin-backup |
| PUT | `/admin/backup/schedule` | admin-backup |
| GET | `/admin/backup/status` | admin-backup |
| GET | `/admin/bugs` | admin-bugs |
| POST | `/admin/bugs/auto-fix` | admin-bugs |
| POST | `/admin/bugs/bulk` | admin-bugs |
| GET | `/admin/bugs/queue-status` | admin-bugs |
| GET | `/admin/bugs/stats` | admin-bugs |
| POST | `/admin/bugs/sync` | admin-bugs |
| GET | `/admin/bugs/timeline` | admin-bugs |
| POST | `/admin/credits/adjust` | credits |
| GET | `/admin/credits/audit` | credits |
| POST | `/admin/credits/reverse` | credits |
| GET | `/admin/database/connections` | admin-database |
| GET | `/admin/database/health` | admin-database |
| GET | `/admin/database/indexes` | admin-database |
| GET | `/admin/database/locks` | admin-database |
| POST | `/admin/database/query` | admin-database |
| GET | `/admin/database/slow-queries` | admin-database |
| GET | `/admin/database/stats` | admin-database |
| GET | `/admin/database/tables` | admin-database |
| POST | `/admin/database/vacuum` | admin-database |
| GET | `/admin/deploy/:deploymentId` | admin-deploy |
| GET | `/admin/deploy/branches` | admin-deploy |
| POST | `/admin/deploy/cancel/:deploymentId` | admin-deploy |
| GET | `/admin/deploy/history` | admin-deploy |
| GET | `/admin/deploy/preview/:branch` | admin-deploy |
| POST | `/admin/deploy/rollback/:deploymentId` | admin-deploy |
| GET | `/admin/deploy/status` | admin-deploy |
| GET | `/admin/deploy/stream` | admin-deploy |
| POST | `/admin/deploy/trigger` | admin-deploy |
| GET | `/admin/disputes` | credits |
| POST | `/admin/disputes/:disputeId/messages` | credits |
| POST | `/admin/disputes/:disputeId/resolve` | credits |
| PATCH | `/admin/disputes/:disputeId/status` | credits |
| GET | `/admin/docs/file` | admin-docs |
| POST | `/admin/docs/file` | admin-docs |
| PUT | `/admin/docs/file` | admin-docs |
| DELETE | `/admin/docs/file` | admin-docs |
| POST | `/admin/docs/folder` | admin-docs |
| GET | `/admin/docs/list` | admin-docs |
| GET | `/admin/docs/search` | admin-docs |
| GET | `/admin/docs/stats` | admin-docs |
| GET | `/admin/economy/metrics` | credits |
| GET | `/admin/env/audit` | admin-env |
| GET | `/admin/env/compare` | admin-env |
| GET | `/admin/env/export` | admin-env |
| POST | `/admin/env/validate` | admin-env |
| GET | `/admin/env/variables` | admin-env |
| GET | `/admin/escrow` | credits |
| POST | `/admin/escrow/:escrowId/refund` | credits |
| POST | `/admin/escrow/:escrowId/release` | credits |
| GET | `/admin/features/flags` | admin-features |
| POST | `/admin/features/flags` | admin-features |
| GET | `/admin/feedback` | admin-feedback |
| GET | `/admin/feedback/recent-activity` | admin-feedback |
| GET | `/admin/feedback/stats` | admin-feedback |
| GET | `/admin/fraud-flags` | credits |
| POST | `/admin/fraud-flags` | credits |
| POST | `/admin/fraud-flags/:flagId/review` | credits |
| POST | `/admin/leaderboard-rewards/trigger` | credits |
| GET | `/admin/logs/aggregations` | admin-logs |
| GET | `/admin/logs/errors` | admin-logs |
| POST | `/admin/logs/export` | admin-logs |
| GET | `/admin/logs/patterns` | admin-logs |
| GET | `/admin/logs/search` | admin-logs |
| GET | `/admin/logs/stats` | admin-logs |
| GET | `/admin/logs/stream` | admin-logs |
| GET | `/admin/logs/tail` | admin-logs |
| GET | `/admin/metrics/endpoints` | admin-metrics |
| GET | `/admin/metrics/history` | admin-metrics |
| GET | `/admin/metrics/realtime` | admin-metrics |
| POST | `/admin/metrics/reset` | admin-metrics |
| GET | `/admin/metrics/stream` | admin-metrics |
| GET | `/admin/metrics/users` | admin-metrics |
| GET | `/admin/metrics/websockets` | admin-metrics |
| GET | `/admin/rate-limit-status/:userId` | credits |
| GET | `/admin/rate-limits` | credits |
| PUT | `/admin/rate-limits/:action` | credits |
| GET | `/admin/scheduler/commands` | admin-scheduler |
| GET | `/admin/scheduler/history` | admin-scheduler |
| GET | `/admin/scheduler/jobs` | admin-scheduler |
| POST | `/admin/scheduler/jobs` | admin-scheduler |
| POST | `/admin/scheduler/reload` | admin-scheduler |
| POST | `/admin/scheduler/start` | admin-scheduler |
| GET | `/admin/scheduler/stats` | admin-scheduler |
| GET | `/admin/scheduler/status` | admin-scheduler |
| POST | `/admin/scheduler/stop` | admin-scheduler |
| POST | `/admin/scheduler/validate-cron` | admin-scheduler |
| GET | `/admin/security/audit-log` | admin-security |
| GET | `/admin/security/blocklist` | admin-security |
| POST | `/admin/security/blocklist` | admin-security |
| GET | `/admin/security/login-attempts` | admin-security |
| GET | `/admin/security/rate-limits` | admin-security |
| PUT | `/admin/security/rate-limits` | admin-security |
| GET | `/admin/security/scan` | admin-security |
| GET | `/admin/security/sessions` | admin-security |
| GET | `/admin/server/git` | admin-server |
| POST | `/admin/server/git/pull` | admin-server |
| GET | `/admin/server/logs` | admin-server |
| GET | `/admin/server/logs/stream` | admin-server |
| POST | `/admin/server/process` | admin-server |
| POST | `/admin/server/script` | admin-server |
| GET | `/admin/server/scripts` | admin-server |
| GET | `/admin/server/status` | admin-server |
| POST | `/admin/store/grant` | credits |
| POST | `/admin/store/revoke` | credits |
| GET | `/admin/test-scorecard` | test-scorecard |
| POST | `/admin/test-scorecard` | test-scorecard |
| DELETE | `/admin/test-scorecard/:id` | test-scorecard |
| GET | `/admin/test-scorecard/history` | test-scorecard |
| PUT | `/admin/trainers/:userId/status` | trainers |
| GET | `/admin/trust/:userId` | credits |
| POST | `/admin/trust/:userId/override` | credits |
| DELETE | `/admin/trust/:userId/override` | credits |
| GET | `/admin/wallet/:userId` | credits |
| POST | `/admin/wallet/freeze` | credits |
| POST | `/admin/wallet/unfreeze` | credits |
| GET | `/alternatives/low-impact` | misc |
| GET | `/alternatives/seated` | misc |
| POST | `/api/admin/commands/cancel/:id` | admin-commands |
| POST | `/api/admin/commands/execute` | admin-commands |
| GET | `/api/admin/commands/execution/:id` | admin-commands |
| GET | `/api/admin/commands/hierarchy` | admin-commands |
| GET | `/api/admin/commands/history` | admin-commands |
| GET | `/api/admin/commands/search` | admin-commands |
| GET | `/api/admin/commands/stream/:id` | admin-commands |
| GET | `/archetype/suggested-communities` | archetype-communities |
| GET | `/archetypes` | journey |
| GET | `/archetypes/:id/levels` | journey |
| GET | `/archetypes/by-category/:categoryId` | journey |
| GET | `/archetypes/categories` | journey |
| GET | `/archetypes/communities` | archetype-communities |
| POST | `/archetypes/select` | journey |
| POST | `/auth/login` | auth |
| GET | `/auth/me` | auth |
| GET | `/auth/me/capabilities` | auth |
| POST | `/auth/register` | auth |
| POST | `/billing/checkout` | billing |
| POST | `/billing/credits/checkout` | billing |
| POST | `/billing/portal` | billing |
| GET | `/body-measurements` | body-measurements |
| POST | `/body-measurements` | body-measurements |
| GET | `/body-measurements/:id` | body-measurements |
| PUT | `/body-measurements/:id` | body-measurements |
| DELETE | `/body-measurements/:id` | body-measurements |
| GET | `/body-measurements/comparison` | body-measurements |
| GET | `/body-measurements/history/:field` | body-measurements |
| GET | `/body-measurements/latest` | body-measurements |
| GET | `/body-regions` | rehabilitation |
| GET | `/bonus-events/history` | economyEnhanced |
| GET | `/bonus-events/types` | economyEnhanced |
| GET | `/buddy` | credits |
| POST | `/buddy` | credits |
| POST | `/buddy/equip` | credits |
| GET | `/buddy/evolution/:species` | credits |
| GET | `/buddy/leaderboard` | credits |
| GET | `/buddy/matches` | social |
| PUT | `/buddy/nickname` | credits |
| GET | `/buddy/pairs` | social |
| GET | `/buddy/preferences` | social |
| PUT | `/buddy/preferences` | social |
| GET | `/buddy/requests` | social |
| PUT | `/buddy/settings` | credits |
| PUT | `/buddy/species` | credits |
| POST | `/buddy/unequip` | credits |
| POST | `/bulletin/comments/:commentId/vote` | bulletin |
| GET | `/bulletin/posts/:postId` | bulletin |
| GET | `/bulletin/posts/:postId/comments` | bulletin |
| POST | `/bulletin/posts/:postId/comments` | bulletin |
| POST | `/bulletin/posts/:postId/hide` | bulletin |
| POST | `/bulletin/posts/:postId/pin` | bulletin |
| POST | `/bulletin/posts/:postId/unhide` | bulletin |
| POST | `/bulletin/posts/:postId/unpin` | bulletin |
| POST | `/bulletin/posts/:postId/vote` | bulletin |
| GET | `/career/goals` | career |
| POST | `/career/goals` | career |
| GET | `/career/goals/:goalId/exercises` | career |
| PUT | `/career/goals/:id` | career |
| DELETE | `/career/goals/:id` | career |
| GET | `/career/readiness` | career |
| GET | `/career/readiness/:goalId` | career |
| POST | `/career/readiness/:goalId/refresh` | career |
| GET | `/career/recertifications` | career |
| POST | `/career/recertifications` | career |
| GET | `/career/standards` | career |
| GET | `/career/standards/:id` | career |
| GET | `/career/standards/categories` | career |
| GET | `/career/team/:hangoutId` | career |
| POST | `/career/team/:hangoutId/enable` | career |
| POST | `/career/team/:hangoutId/opt-in` | career |
| GET | `/challenges/daily` | challenges |
| POST | `/challenges/daily/claim/:id` | challenges |
| GET | `/challenges/history` | challenges |
| POST | `/challenges/progress` | challenges |
| GET | `/challenges/types` | challenges |
| GET | `/challenges/weekly` | challenges |
| POST | `/challenges/weekly/claim` | challenges |
| POST | `/checkout/stripe` | economyEnhanced |
| POST | `/classes` | trainers |
| GET | `/classes` | trainers |
| GET | `/classes/:classId` | trainers |
| PUT | `/classes/:classId` | trainers |
| POST | `/classes/:classId/attendance` | trainers |
| GET | `/classes/:classId/attendance` | trainers |
| POST | `/classes/:classId/cancel` | trainers |
| POST | `/classes/:classId/enroll` | trainers |
| GET | `/classes/:classId/enrollments` | trainers |
| POST | `/classes/:classId/unenroll` | trainers |
| GET | `/classes/browse` | credits |
| GET | `/cohort-options` | cohort-preferences |
| GET | `/collection` | marketplace |
| GET | `/collection/favorites` | marketplace |
| POST | `/collection/items/:id/favorite` | marketplace |
| POST | `/collection/items/:id/seen` | marketplace |
| GET | `/collection/new-count` | marketplace |
| POST | `/collection/seen-all` | marketplace |
| GET | `/collection/sets` | marketplace |
| GET | `/collection/sets/:id` | marketplace |
| POST | `/collection/sets/:id/claim` | marketplace |
| PUT | `/collection/showcase` | marketplace |
| GET | `/collection/showcase/:userId` | marketplace |
| GET | `/collection/stats` | marketplace |
| POST | `/communities` | communities |
| GET | `/communities` | communities |
| POST | `/communities/:id/events` | communities |
| GET | `/communities/:id/events` | communities |
| POST | `/communities/:id/join` | communities |
| POST | `/communities/:id/leave` | communities |
| GET | `/communities/:id/members` | communities |
| POST | `/communities/:id/members/:userId/approve` | communities |
| POST | `/communities/:id/members/:userId/reject` | communities |
| PATCH | `/communities/:id/members/:userId/role` | communities |
| GET | `/communities/:id/posts` | communities |
| POST | `/communities/:id/posts` | communities |
| GET | `/communities/:idOrSlug` | communities |
| GET | `/communities/my` | communities |
| GET | `/community/feed` | community |
| GET | `/community/monitor` | community |
| GET | `/community/now` | community |
| GET | `/community/percentile` | community |
| GET | `/community/presence` | community |
| POST | `/community/presence` | community |
| GET | `/community/stats` | community |
| GET | `/community/stats/archetypes` | community |
| GET | `/community/stats/credits` | community |
| GET | `/community/stats/exercises` | community |
| GET | `/community/stats/funnel` | community |
| GET | `/community/stats/geographic` | community |
| GET | `/community/stats/public` | community |
| GET | `/community/stats/summary` | community |
| GET | `/community/ws` | community |
| GET | `/community/ws/public` | community |
| GET | `/competition/categories` | competition |
| GET | `/competition/categories/:id` | competition |
| GET | `/competition/categories/grouped` | competition |
| GET | `/competition/me` | competition |
| POST | `/competition/me` | competition |
| DELETE | `/competition/me` | competition |
| GET | `/competition/me/countdown` | competition |
| PUT | `/competition/me/phase` | competition |
| POST | `/competition/me/show-complete` | competition |
| POST | `/competition/me/weigh-in` | competition |
| GET | `/competition/me/weigh-ins` | competition |
| GET | `/competition/weak-points` | competition |
| GET | `/competitions` | misc |
| GET | `/competitions/:id` | misc |
| GET | `/daily-login/calendar` | daily-login |
| POST | `/daily-login/claim` | daily-login |
| POST | `/daily-login/purchase-freeze` | daily-login |
| GET | `/daily-login/rewards` | daily-login |
| GET | `/daily-login/status` | daily-login |
| POST | `/daily-login/use-freeze` | daily-login |
| POST | `/deploy/cancel/:id` | deployment |
| GET | `/deploy/commands` | deployment |
| POST | `/deploy/execute` | deployment |
| GET | `/deploy/logs` | deployment |
| GET | `/deploy/logs/:id` | deployment |
| GET | `/deploy/status` | deployment |
| GET | `/deploy/stream/:id` | deployment |
| GET | `/disputes` | credits |
| POST | `/disputes` | credits |
| GET | `/disputes/:disputeId` | credits |
| GET | `/disputes/:disputeId/messages` | credits |
| POST | `/disputes/:disputeId/messages` | credits |
| GET | `/earn-events` | economyEnhanced |
| POST | `/earn-events/mark-seen` | economyEnhanced |
| GET | `/earn-events/recent` | economyEnhanced |
| GET | `/earn-events/stream` | economyEnhanced |
| GET | `/earn-events/today` | economyEnhanced |
| GET | `/earn-events/week` | economyEnhanced |
| GET | `/earning/rules` | credits |
| GET | `/economy/actions` | economy |
| GET | `/economy/balance` | economy |
| POST | `/economy/charge` | economy |
| GET | `/economy/history` | economy |
| GET | `/economy/pricing` | economy |
| GET | `/economy/transactions` | economy |
| GET | `/economy/wallet` | economy |
| GET | `/engagement/recovery/activities` | engagement-recovery |
| GET | `/engagement/recovery/activity-types` | engagement-recovery |
| GET | `/engagement/recovery/history` | engagement-recovery |
| POST | `/engagement/recovery/log-activity` | engagement-recovery |
| GET | `/engagement/recovery/muscles` | engagement-recovery |
| GET | `/engagement/recovery/today` | engagement-recovery |
| POST | `/engagement/seed-events` | engagement-summary |
| GET | `/engagement/stats` | engagement-summary |
| GET | `/engagement/summary` | engagement-summary |
| GET | `/entitlements` | misc |
| GET | `/equipment/categories` | equipment |
| GET | `/equipment/home` | equipment |
| PUT | `/equipment/home` | equipment |
| POST | `/equipment/home` | equipment |
| DELETE | `/equipment/home/:equipmentId` | equipment |
| GET | `/equipment/home/ids` | equipment |
| GET | `/equipment/types` | equipment |
| GET | `/equipment/types/:category` | equipment |
| POST | `/errors/:id/convert-to-bug` | errors |
| POST | `/errors/:id/resolve` | errors |
| GET | `/errors/admin-stats` | errors |
| GET | `/errors/list` | errors |
| POST | `/errors/report` | errors |
| POST | `/errors/report/batch` | errors |
| GET | `/errors/stats` | errors |
| POST | `/errors/sync-to-bugs` | errors |
| GET | `/escrow` | credits |
| GET | `/escrow/:escrowId` | credits |
| POST | `/events` | events |
| GET | `/events/:id` | events |
| DELETE | `/events/:id` | events |
| POST | `/events/:id/join` | events |
| GET | `/events/:id/participation` | events |
| POST | `/events/:id/progress` | events |
| GET | `/events/active` | events |
| GET | `/events/history` | events |
| GET | `/events/multipliers` | events |
| GET | `/events/upcoming` | events |
| GET | `/exercise-group-presets` | exercise-groups |
| POST | `/exercise-group-presets` | exercise-groups |
| DELETE | `/exercise-group-presets/:presetId` | exercise-groups |
| POST | `/exercise-group-presets/:presetId/apply` | exercise-groups |
| POST | `/exercise-groups` | exercise-groups |
| GET | `/exercise-groups/:groupId` | exercise-groups |
| PUT | `/exercise-groups/:groupId` | exercise-groups |
| DELETE | `/exercise-groups/:groupId` | exercise-groups |
| POST | `/exercise-groups/:groupId/exercises` | exercise-groups |
| DELETE | `/exercise-groups/:groupId/exercises/:exerciseId` | exercise-groups |
| PUT | `/exercise-groups/:groupId/reorder` | exercise-groups |
| GET | `/exercise-groups/types` | exercise-groups |
| GET | `/exercises` | misc |
| GET | `/exercises/:id/activations` | misc |
| GET | `/exercises/:id/illustration` | misc |
| GET | `/exercises/:id/videos` | exercise-videos |
| POST | `/exercises/:id/videos` | exercise-videos |
| GET | `/exercises/:id/videos/:videoId` | exercise-videos |
| PATCH | `/exercises/:id/videos/:videoId` | exercise-videos |
| DELETE | `/exercises/:id/videos/:videoId` | exercise-videos |
| GET | `/faq` | feedback |
| GET | `/faq/:id` | feedback |
| POST | `/faq/:id/helpful` | feedback |
| GET | `/faq/categories` | feedback |
| POST | `/feedback` | feedback |
| GET | `/feedback` | feedback |
| GET | `/feedback/:id` | feedback |
| POST | `/feedback/:id/respond` | feedback |
| POST | `/feedback/:id/upvote` | feedback |
| DELETE | `/feedback/:id/upvote` | feedback |
| GET | `/feedback/features/popular` | feedback |
| GET | `/feedback/search` | feedback |
| GET | `/friend-requests` | social |
| GET | `/friends` | social |
| GET | `/goals` | goals |
| POST | `/goals` | goals |
| GET | `/goals/:id` | goals |
| PUT | `/goals/:id` | goals |
| DELETE | `/goals/:id` | goals |
| POST | `/goals/:id/milestones` | goals |
| POST | `/goals/:id/progress` | goals |
| GET | `/goals/suggestions` | goals |
| GET | `/hangouts/:id/check-ins/active` | checkins |
| GET | `/hangouts/geo/:hangoutId` | economyEnhanced |
| GET | `/hangouts/geo/:hangoutId/challenges` | economyEnhanced |
| POST | `/hangouts/geo/:hangoutId/challenges` | economyEnhanced |
| GET | `/hangouts/geo/:hangoutId/events` | economyEnhanced |
| POST | `/hangouts/geo/:hangoutId/events` | economyEnhanced |
| GET | `/hangouts/geo/:hangoutId/members` | economyEnhanced |
| GET | `/hangouts/geo/my` | economyEnhanced |
| GET | `/hangouts/types` | hangouts |
| GET | `/health` | health |
| GET | `/health-multiplier` | marketplace |
| POST | `/health-multiplier/calculate` | marketplace |
| GET | `/health-multiplier/history` | marketplace |
| GET | `/health-multiplier/leaderboard` | marketplace |
| POST | `/health-multiplier/metrics` | marketplace |
| GET | `/health-multiplier/stats` | marketplace |
| GET | `/health-multiplier/today` | marketplace |
| GET | `/health/detailed` | health |
| GET | `/health/live` | health |
| GET | `/health/ready` | health |
| POST | `/highfives/send` | misc |
| GET | `/highfives/stats` | misc |
| GET | `/highfives/users` | misc |
| GET | `/i18n/languages` | misc |
| GET | `/identities` | identities |
| GET | `/identities/all-with-communities` | identities |
| GET | `/identities/categories` | identities |
| GET | `/identities/me` | identities |
| GET | `/identities/suggested-communities` | identities |
| GET | `/illustrations/bodies` | misc |
| GET | `/issues/labels` | issues |
| GET | `/issues/stats` | issues |
| GET | `/journal` | beta-tester |
| GET | `/journey` | journey |
| POST | `/journey/fresh-start` | journey-management |
| GET | `/journey/progress` | journey |
| POST | `/journey/restart-onboarding` | journey-management |
| GET | `/journey/restore-history` | journey-management |
| GET | `/journey/settings` | journey-management |
| PUT | `/journey/settings` | journey-management |
| GET | `/journey/snapshots` | journey-management |
| POST | `/journey/snapshots` | journey-management |
| GET | `/journey/snapshots/:id` | journey-management |
| DELETE | `/journey/snapshots/:id` | journey-management |
| POST | `/journey/snapshots/:id/restore` | journey-management |
| POST | `/journey/switch` | journey |
| GET | `/journeys` | journeys |
| POST | `/journeys` | journeys |
| GET | `/journeys/:id` | journeys |
| PUT | `/journeys/:id` | journeys |
| DELETE | `/journeys/:id` | journeys |
| POST | `/journeys/:id/milestones` | journeys |
| POST | `/journeys/:id/progress` | journeys |
| GET | `/journeys/categories` | journeys |
| GET | `/journeys/categories/:categoryId` | journeys |
| GET | `/journeys/featured` | journeys |
| POST | `/journeys/start` | journeys |
| GET | `/journeys/suggestions` | journeys |
| GET | `/journeys/templates` | journeys |
| GET | `/journeys/templates/:templateId` | journeys |
| GET | `/leaderboards/simple` | leaderboards |
| GET | `/leaderboards/user-rank` | leaderboards |
| GET | `/limitations` | limitations |
| POST | `/limitations` | limitations |
| PUT | `/limitations/:id` | limitations |
| DELETE | `/limitations/:id` | limitations |
| GET | `/limitations/body-regions` | limitations |
| POST | `/limitations/check-workout` | limitations |
| GET | `/limitations/substitutions/:exerciseId` | limitations |
| POST | `/live/cleanup` | live-activity |
| GET | `/live/feed` | live-activity |
| GET | `/live/filters` | live-activity |
| GET | `/live/hierarchy/:level` | live-activity |
| GET | `/live/map` | live-activity |
| GET | `/live/stats` | live-activity |
| GET | `/live/stream` | live-activity |
| GET | `/live/trending` | live-activity |
| POST | `/location` | economyEnhanced |
| GET | `/location` | economyEnhanced |
| GET | `/locations/:id/equipment` | equipment |
| POST | `/locations/:id/equipment` | equipment |
| GET | `/locations/:id/equipment/my-reports` | equipment |
| GET | `/locations/:id/equipment/verified` | equipment |
| GET | `/locations/nearby` | misc |
| GET | `/marketplace` | marketplace |
| POST | `/marketplace/listings` | marketplace |
| GET | `/marketplace/listings/:id` | marketplace |
| PATCH | `/marketplace/listings/:id` | marketplace |
| DELETE | `/marketplace/listings/:id` | marketplace |
| POST | `/marketplace/listings/:id/buy` | marketplace |
| POST | `/marketplace/listings/:id/offer` | marketplace |
| GET | `/marketplace/listings/:id/offers` | marketplace |
| GET | `/marketplace/my-listings` | marketplace |
| GET | `/marketplace/my-offers` | marketplace |
| GET | `/marketplace/my-stats` | marketplace |
| DELETE | `/marketplace/offers/:id` | marketplace |
| POST | `/marketplace/offers/:id/respond` | marketplace |
| GET | `/marketplace/overview` | marketplace |
| GET | `/marketplace/price-history/:cosmeticId` | marketplace |
| GET | `/marketplace/price-suggestion/:cosmeticId` | marketplace |
| GET | `/marketplace/watchlist` | marketplace |
| POST | `/marketplace/watchlist` | marketplace |
| DELETE | `/marketplace/watchlist/:listingId` | marketplace |
| GET | `/martial-arts/progress` | martial-arts |
| GET | `/mascot/companion/active-program` | mascot |
| GET | `/mascot/companion/assist/abilities` | mascot |
| GET | `/mascot/companion/assist/history` | mascot |
| GET | `/mascot/companion/assist/state` | mascot |
| POST | `/mascot/companion/assist/use` | mascot |
| GET | `/mascot/companion/bonus` | mascot |
| POST | `/mascot/companion/check-overtraining` | mascot |
| POST | `/mascot/companion/cosmetics/equip` | mascot |
| GET | `/mascot/companion/credit-alerts` | mascot |
| POST | `/mascot/companion/credit-alerts/:alertId/dismiss` | mascot |
| POST | `/mascot/companion/crew-coordination` | mascot |
| GET | `/mascot/companion/crew-suggestions` | mascot |
| GET | `/mascot/companion/data-alerts` | mascot |
| GET | `/mascot/companion/energy` | mascot |
| POST | `/mascot/companion/events/mark-reacted` | mascot |
| GET | `/mascot/companion/events/recent` | mascot |
| GET | `/mascot/companion/exercise-alternatives/:exerciseId` | mascot |
| POST | `/mascot/companion/exercise-avoidance` | mascot |
| GET | `/mascot/companion/exercise-avoidances` | mascot |
| POST | `/mascot/companion/generate-program` | mascot |
| GET | `/mascot/companion/highfive-prefs` | mascot |
| PUT | `/mascot/companion/highfive-prefs` | mascot |
| GET | `/mascot/companion/loan` | mascot |
| POST | `/mascot/companion/loan/repay` | mascot |
| POST | `/mascot/companion/loan/take` | mascot |
| GET | `/mascot/companion/master-abilities` | mascot |
| POST | `/mascot/companion/master-abilities/:abilityKey/unlock` | mascot |
| GET | `/mascot/companion/milestones` | mascot |
| GET | `/mascot/companion/negotiated-rate` | mascot |
| PATCH | `/mascot/companion/nickname` | mascot |
| GET | `/mascot/companion/nutrition-hint` | mascot |
| GET | `/mascot/companion/overtraining-alerts` | mascot |
| GET | `/mascot/companion/powers` | mascot |
| GET | `/mascot/companion/powers/all` | mascot |
| GET | `/mascot/companion/programs` | mascot |
| GET | `/mascot/companion/recovered-muscles` | mascot |
| GET | `/mascot/companion/rivalry-alerts` | mascot |
| POST | `/mascot/companion/rivalry-alerts/:alertId/seen` | mascot |
| PATCH | `/mascot/companion/settings` | mascot |
| GET | `/mascot/companion/social-actions` | mascot |
| GET | `/mascot/companion/state` | mascot |
| GET | `/mascot/companion/streak-saver` | mascot |
| POST | `/mascot/companion/streak-saver/use` | mascot |
| GET | `/mascot/companion/tips/next` | mascot |
| GET | `/mascot/companion/trash-talk` | mascot |
| GET | `/mascot/companion/tutorial` | mascot |
| GET | `/mascot/companion/upgrades` | mascot |
| POST | `/mascot/companion/upgrades/:upgradeId/purchase` | mascot |
| GET | `/mascot/companion/volume-stats` | mascot |
| GET | `/mascot/companion/wardrobe/appearance` | mascot |
| GET | `/mascot/companion/wardrobe/catalog` | mascot |
| GET | `/mascot/companion/wardrobe/collection` | mascot |
| GET | `/mascot/companion/wardrobe/cosmetic/:idOrKey` | mascot |
| POST | `/mascot/companion/wardrobe/favorite/:cosmeticId` | mascot |
| POST | `/mascot/companion/wardrobe/gift` | mascot |
| GET | `/mascot/companion/wardrobe/loadout` | mascot |
| PUT | `/mascot/companion/wardrobe/loadout` | mascot |
| POST | `/mascot/companion/wardrobe/mark-seen` | mascot |
| GET | `/mascot/companion/wardrobe/presets` | mascot |
| POST | `/mascot/companion/wardrobe/presets` | mascot |
| PATCH | `/mascot/companion/wardrobe/presets/:presetId` | mascot |
| DELETE | `/mascot/companion/wardrobe/presets/:presetId` | mascot |
| POST | `/mascot/companion/wardrobe/presets/:presetId/load` | mascot |
| POST | `/mascot/companion/wardrobe/purchase/:cosmeticId` | mascot |
| GET | `/mascot/companion/wardrobe/shop` | mascot |
| GET | `/mascot/companion/workout-suggestion` | mascot |
| GET | `/mascot/global/config` | mascot |
| GET | `/mascot/global/placements` | mascot |
| GET | `/me/achievements/summary` | achievements |
| GET | `/me/check-in` | checkins |
| GET | `/me/checkin` | venues |
| GET | `/me/checkins` | venues |
| GET | `/me/cohort-preferences` | cohort-preferences |
| GET | `/me/credits/summary` | credits |
| GET | `/me/current-records` | venues |
| GET | `/me/dashboard/widgets` | preferences |
| GET | `/me/devices` | preferences |
| POST | `/me/devices/register` | preferences |
| GET | `/me/enrollments` | trainers |
| GET | `/me/entitlements` | misc |
| POST | `/me/hydration/log` | preferences |
| GET | `/me/hydration/today` | preferences |
| POST | `/me/leaderboard-opt-in` | cohort-preferences |
| POST | `/me/leaderboard-opt-out` | cohort-preferences |
| GET | `/me/nutrition` | nutrition |
| POST | `/me/nutrition/enable` | nutrition |
| GET | `/me/nutrition/goals` | nutrition |
| GET | `/me/nutrition/plans/active` | nutrition |
| GET | `/me/nutrition/preferences` | nutrition |
| GET | `/me/nutrition/streaks` | nutrition |
| GET | `/me/preferences` | preferences |
| PATCH | `/me/preferences` | preferences |
| GET | `/me/preferences/effective` | preferences |
| GET | `/me/preferences/profiles` | preferences |
| POST | `/me/preferences/profiles` | preferences |
| POST | `/me/preferences/profiles/deactivate` | preferences |
| PUT | `/me/preferences/reset` | preferences |
| GET | `/me/sounds/packs` | preferences |
| POST | `/me/sounds/packs` | preferences |
| GET | `/me/venue-records` | venues |
| GET | `/me/video-favorites` | exercise-videos |
| GET | `/me/video-history` | exercise-videos |
| PUT | `/mentor/profile` | mentorship |
| GET | `/mentors` | mentorship |
| GET | `/mentorship/requests` | mentorship |
| GET | `/mentorships/active` | mentorship |
| GET | `/mentorships/history` | mentorship |
| POST | `/messaging/block/:userId` | messaging |
| DELETE | `/messaging/block/:userId` | messaging |
| GET | `/messaging/conversations` | messaging |
| POST | `/messaging/conversations` | messaging |
| GET | `/messaging/conversations/:id/messages` | messaging |
| POST | `/messaging/conversations/:id/messages` | messaging |
| POST | `/messaging/conversations/:id/read` | messaging |
| DELETE | `/messaging/messages/:id` | messaging |
| GET | `/messaging/unread-count` | messaging |
| GET | `/messaging/ws` | messaging |
| GET | `/milestones` | tips |
| POST | `/milestones/:id/claim` | tips |
| POST | `/milestones/:id/progress` | tips |
| GET | `/modules` | modules |
| GET | `/modules/:id` | modules |
| POST | `/modules/:id/waitlist` | modules |
| DELETE | `/modules/:id/waitlist` | modules |
| GET | `/modules/coming-soon` | modules |
| GET | `/modules/waitlist/me` | modules |
| GET | `/monitoring/dashboard` | monitoring |
| GET | `/monitoring/errors` | monitoring |
| POST | `/monitoring/errors/:id/resolve` | monitoring |
| POST | `/monitoring/errors/track` | monitoring |
| GET | `/monitoring/health` | monitoring |
| POST | `/monitoring/journey/end` | monitoring |
| POST | `/monitoring/journey/error` | monitoring |
| POST | `/monitoring/journey/start` | monitoring |
| POST | `/monitoring/journey/step` | monitoring |
| GET | `/monitoring/journeys` | monitoring |
| GET | `/monitoring/ping` | monitoring |
| GET | `/monitoring/tests/definitions` | monitoring |
| GET | `/monitoring/tests/history` | monitoring |
| POST | `/monitoring/tests/run` | monitoring |
| GET | `/muscles` | misc |
| GET | `/muscles/:id` | misc |
| GET | `/my-injuries` | rehabilitation |
| GET | `/mystery-boxes` | marketplace |
| GET | `/mystery-boxes/:id` | marketplace |
| POST | `/mystery-boxes/:id/open` | marketplace |
| GET | `/mystery-boxes/history` | marketplace |
| GET | `/mystery-boxes/pity` | marketplace |
| GET | `/notifications` | notifications |
| DELETE | `/notifications/:id` | notifications |
| POST | `/notifications/mark-all-read` | notifications |
| POST | `/notifications/mark-read` | notifications |
| GET | `/notifications/preferences` | notifications |
| GET | `/notifications/preferences/:category` | notifications |
| PUT | `/notifications/preferences/:category` | notifications |
| GET | `/notifications/unread-count` | notifications |
| GET | `/nutrition/archetypes` | nutrition |
| POST | `/onboarding/back` | onboarding |
| POST | `/onboarding/complete` | onboarding |
| POST | `/onboarding/home-equipment` | onboarding |
| GET | `/onboarding/injury-regions` | onboarding |
| GET | `/onboarding/intents` | onboarding |
| GET | `/onboarding/profile` | onboarding |
| POST | `/onboarding/profile` | onboarding |
| POST | `/onboarding/skip` | onboarding |
| POST | `/onboarding/start` | onboarding |
| GET | `/onboarding/state` | onboarding |
| DELETE | `/onboarding/state` | onboarding |
| GET | `/onboarding/status` | onboarding |
| POST | `/onboarding/step` | onboarding |
| GET | `/onboarding/steps` | onboarding |
| POST | `/organizations` | organizations |
| GET | `/organizations/:orgId` | organizations |
| PUT | `/organizations/:orgId` | organizations |
| DELETE | `/organizations/:orgId` | organizations |
| GET | `/organizations/:orgId/audit` | organizations |
| POST | `/organizations/:orgId/invite` | organizations |
| POST | `/organizations/:orgId/invite/bulk` | organizations |
| GET | `/organizations/:orgId/members` | organizations |
| PUT | `/organizations/:orgId/members/:memberId` | organizations |
| DELETE | `/organizations/:orgId/members/:memberId` | organizations |
| PUT | `/organizations/:orgId/members/bulk` | organizations |
| GET | `/organizations/:orgId/readiness` | organizations |
| POST | `/organizations/:orgId/readiness/export` | organizations |
| GET | `/organizations/:orgId/readiness/history` | organizations |
| POST | `/organizations/:orgId/readiness/refresh` | organizations |
| GET | `/organizations/:orgId/settings` | organizations |
| PUT | `/organizations/:orgId/settings` | organizations |
| GET | `/organizations/:orgId/units` | organizations |
| POST | `/organizations/:orgId/units` | organizations |
| PUT | `/organizations/:orgId/units/:unitId` | organizations |
| DELETE | `/organizations/:orgId/units/:unitId` | organizations |
| GET | `/organizations/:orgId/units/:unitId/readiness` | organizations |
| GET | `/organizations/:orgId/units/tree` | organizations |
| GET | `/organizations/by-slug/:slug` | organizations |
| POST | `/organizations/invites/:token/accept` | organizations |
| GET | `/packages` | economyEnhanced |
| GET | `/packages/:packageId` | economyEnhanced |
| GET | `/packages/custom/:credits` | economyEnhanced |
| GET | `/pending-feedback` | admin-beta-testers |
| GET | `/personalization/context` | personalization |
| POST | `/personalization/exercise-check` | personalization |
| GET | `/personalization/plan` | personalization |
| GET | `/personalization/recommendations` | personalization |
| GET | `/personalization/summary` | personalization |
| GET | `/plugins` | plugins |
| GET | `/plugins/:pluginId` | plugins |
| POST | `/plugins/:pluginId/disable` | plugins |
| POST | `/plugins/:pluginId/enable` | plugins |
| GET | `/plugins/:pluginId/settings` | plugins |
| PUT | `/plugins/:pluginId/settings` | plugins |
| DELETE | `/plugins/:pluginId/settings` | plugins |
| PUT | `/plugins/settings/bulk` | plugins |
| GET | `/prescription/:id` | prescription |
| POST | `/prescription/generate` | prescription |
| GET | `/privacy` | privacy |
| PUT | `/privacy` | privacy |
| POST | `/privacy/disable-minimalist` | privacy |
| POST | `/privacy/enable-minimalist` | privacy |
| GET | `/privacy/summary` | privacy |
| GET | `/profile` | auth |
| PUT | `/profile` | auth |
| POST | `/programs` | programs |
| GET | `/programs` | programs |
| GET | `/programs/:id` | programs |
| PUT | `/programs/:id` | programs |
| DELETE | `/programs/:id` | programs |
| POST | `/programs/:id/duplicate` | programs |
| POST | `/programs/:id/enroll` | programs |
| POST | `/programs/:id/rate` | programs |
| POST | `/programs/:id/record-workout` | programs |
| GET | `/programs/active-enrollment` | programs |
| GET | `/programs/enrollments/:enrollmentId` | programs |
| POST | `/programs/enrollments/:enrollmentId/drop` | programs |
| POST | `/programs/enrollments/:enrollmentId/pause` | programs |
| POST | `/programs/enrollments/:enrollmentId/progress` | programs |
| POST | `/programs/enrollments/:enrollmentId/resume` | programs |
| GET | `/programs/featured` | programs |
| GET | `/programs/me` | programs |
| GET | `/programs/my-enrollments` | programs |
| GET | `/programs/official` | programs |
| GET | `/programs/todays-workout` | programs |
| GET | `/progress-photos` | progress-photos |
| POST | `/progress-photos` | progress-photos |
| GET | `/progress-photos/:id` | progress-photos |
| PUT | `/progress-photos/:id` | progress-photos |
| DELETE | `/progress-photos/:id` | progress-photos |
| GET | `/progress-photos/compare` | progress-photos |
| GET | `/progress-photos/stats` | progress-photos |
| GET | `/progress-photos/timeline` | progress-photos |
| GET | `/progress/stats` | misc |
| GET | `/progression/achievements` | misc |
| GET | `/progression/leaderboard` | misc |
| GET | `/progression/mastery-levels` | misc |
| GET | `/progression/recommendations` | progression |
| GET | `/progression/recommendations/:exerciseId` | progression |
| GET | `/progression/records` | progression |
| GET | `/progression/records/:exerciseId` | progression |
| GET | `/progression/stats/:exerciseId` | progression |
| GET | `/progression/targets` | progression |
| POST | `/progression/targets` | progression |
| PUT | `/progression/targets/:id` | progression |
| GET | `/pt-tests` | pt-tests |
| GET | `/pt-tests/:id` | pt-tests |
| GET | `/pt-tests/leaderboard/:testId` | pt-tests |
| GET | `/pt-tests/my-archetype` | pt-tests |
| POST | `/pt-tests/results` | pt-tests |
| GET | `/pt-tests/results` | pt-tests |
| GET | `/pt-tests/results/:id` | pt-tests |
| GET | `/purchases` | economyEnhanced |
| GET | `/push/history` | push-notifications |
| POST | `/push/mark-sent/:id` | push-notifications |
| GET | `/push/pending` | push-notifications |
| POST | `/push/register` | push-notifications |
| POST | `/push/schedule` | push-notifications |
| DELETE | `/push/schedule/:id` | push-notifications |
| GET | `/push/tokens` | push-notifications |
| DELETE | `/push/unregister` | push-notifications |
| GET | `/ranks/definitions` | ranks |
| GET | `/ranks/history` | ranks |
| GET | `/ranks/leaderboard` | ranks |
| GET | `/ranks/me` | ranks |
| POST | `/ranks/refresh` | ranks |
| POST | `/ranks/update-veterans` | ranks |
| GET | `/ranks/user/:userId` | ranks |
| GET | `/ranks/veteran-badge` | ranks |
| GET | `/record-types` | venues |
| GET | `/recovery/history` | recovery |
| GET | `/recovery/recommendations` | recovery |
| POST | `/recovery/recommendations/:id/acknowledge` | recovery |
| POST | `/recovery/recommendations/generate` | recovery |
| GET | `/recovery/score` | recovery |
| GET | `/recovery/status` | recovery |
| GET | `/reports` | content-reports |
| GET | `/reports/my` | content-reports |
| GET | `/reports/stats` | content-reports |
| GET | `/resources/most-helpful` | community-resources |
| GET | `/rivals` | rivals |
| GET | `/rivals/:id` | rivals |
| POST | `/rivals/:id/accept` | rivals |
| POST | `/rivals/:id/decline` | rivals |
| POST | `/rivals/:id/end` | rivals |
| POST | `/rivals/challenge` | rivals |
| GET | `/rivals/pending` | rivals |
| GET | `/rivals/search` | rivals |
| GET | `/rivals/stats` | rivals |
| POST | `/rpe/autoregulate` | rpe |
| GET | `/rpe/fatigue` | rpe |
| GET | `/rpe/scale` | rpe |
| POST | `/rpe/snapshot` | rpe |
| GET | `/rpe/snapshots` | rpe |
| GET | `/rpe/target/:exerciseId` | rpe |
| PUT | `/rpe/target/:exerciseId` | rpe |
| GET | `/rpe/trends/:exerciseId` | rpe |
| GET | `/rpe/weekly/:exerciseId` | rpe |
| POST | `/sessions` | workout-sessions |
| GET | `/sessions/active` | workout-sessions |
| DELETE | `/sessions/active` | workout-sessions |
| GET | `/sessions/archived` | workout-sessions |
| POST | `/sessions/archived/:id/recover` | workout-sessions |
| GET | `/sessions/status` | workout-sessions |
| POST | `/sets` | workout-sets |
| DELETE | `/sets/:setId` | workout-sets |
| POST | `/sets/bulk` | workout-sets |
| GET | `/sets/exercise/:exerciseId` | workout-sets |
| GET | `/sets/workout/:workoutId` | workout-sets |
| GET | `/settings` | misc |
| PATCH | `/settings` | misc |
| GET | `/settings/themes` | misc |
| GET | `/skill-milestones` | milestones |
| GET | `/skill-milestones/:id` | milestones |
| GET | `/skill-milestones/categories` | milestones |
| GET | `/skill-milestones/categories/:category` | milestones |
| GET | `/skill-milestones/featured` | milestones |
| GET | `/skill-milestones/me` | milestones |
| DELETE | `/skill-milestones/me/:userMilestoneId` | milestones |
| GET | `/skill-milestones/me/:userMilestoneId/attempts` | milestones |
| POST | `/skill-milestones/me/:userMilestoneId/log` | milestones |
| PUT | `/skill-milestones/me/:userMilestoneId/pause` | milestones |
| PUT | `/skill-milestones/me/:userMilestoneId/progress` | milestones |
| POST | `/skill-milestones/start` | milestones |
| GET | `/skills/progress` | skills |
| GET | `/skills/trees` | skills |
| GET | `/skins` | skins |
| POST | `/skins/:skinId/equip` | skins |
| POST | `/skins/:skinId/purchase` | skins |
| POST | `/skins/:skinId/unequip` | skins |
| GET | `/skins/equipped` | skins |
| GET | `/skins/owned` | skins |
| GET | `/skins/unlockable` | skins |
| GET | `/sleep-hygiene` | recovery |
| GET | `/sleep-hygiene/assessments` | recovery |
| POST | `/sleep-hygiene/assessments` | recovery |
| PATCH | `/sleep-hygiene/assessments/:date` | recovery |
| GET | `/sleep-hygiene/assessments/today` | recovery |
| GET | `/sleep-hygiene/credits` | recovery |
| GET | `/sleep-hygiene/credits/total` | recovery |
| POST | `/sleep-hygiene/disable` | recovery |
| POST | `/sleep-hygiene/enable` | recovery |
| GET | `/sleep-hygiene/preferences` | recovery |
| PATCH | `/sleep-hygiene/preferences` | recovery |
| GET | `/sleep-hygiene/streaks` | recovery |
| GET | `/sleep-hygiene/tips` | recovery |
| POST | `/sleep-hygiene/tips/:tipId/bookmark` | recovery |
| DELETE | `/sleep-hygiene/tips/:tipId/bookmark` | recovery |
| POST | `/sleep-hygiene/tips/:tipId/dismiss` | recovery |
| POST | `/sleep-hygiene/tips/:tipId/follow` | recovery |
| DELETE | `/sleep-hygiene/tips/:tipId/follow` | recovery |
| POST | `/sleep-hygiene/tips/:tipId/helpful` | recovery |
| GET | `/sleep-hygiene/tips/bookmarked` | recovery |
| GET | `/sleep/:id` | recovery |
| PATCH | `/sleep/:id` | recovery |
| DELETE | `/sleep/:id` | recovery |
| GET | `/sleep/goal` | recovery |
| POST | `/sleep/goal` | recovery |
| DELETE | `/sleep/goal/:id` | recovery |
| GET | `/sleep/history` | recovery |
| GET | `/sleep/last` | recovery |
| POST | `/sleep/log` | recovery |
| GET | `/sleep/stats` | recovery |
| GET | `/sleep/weekly-stats` | recovery |
| GET | `/snapshots` | beta-tester |
| POST | `/social/boost` | economyEnhanced |
| GET | `/social/boost/check` | economyEnhanced |
| GET | `/social/boost/options` | economyEnhanced |
| POST | `/social/gift` | economyEnhanced |
| POST | `/social/gifts/:giftId/accept` | economyEnhanced |
| POST | `/social/gifts/:giftId/decline` | economyEnhanced |
| GET | `/social/gifts/pending` | economyEnhanced |
| GET | `/social/high-five/costs` | economyEnhanced |
| POST | `/social/high-five/super` | economyEnhanced |
| GET | `/social/high-fives/received` | economyEnhanced |
| POST | `/social/tip` | economyEnhanced |
| GET | `/social/tips/received` | economyEnhanced |
| GET | `/social/tips/sent` | economyEnhanced |
| GET | `/stats/history` | stats |
| GET | `/stats/info` | stats |
| GET | `/stats/leaderboards` | stats |
| GET | `/stats/leaderboards/me` | stats |
| GET | `/stats/me` | stats |
| GET | `/stats/profile/extended` | stats |
| PUT | `/stats/profile/extended` | stats |
| POST | `/stats/recalculate` | stats |
| GET | `/stats/user/:userId` | stats |
| GET | `/status` | beta-tester |
| GET | `/store/categories` | credits |
| GET | `/store/featured` | credits |
| GET | `/store/inventory` | credits |
| GET | `/store/items` | credits |
| GET | `/store/items/:sku` | credits |
| GET | `/store/owns/:sku` | credits |
| POST | `/store/purchase` | credits |
| GET | `/streaks` | streaks |
| GET | `/streaks/:type` | streaks |
| POST | `/streaks/:type/claim` | streaks |
| GET | `/streaks/:type/leaderboard` | streaks |
| GET | `/streaks/:type/milestones` | streaks |
| POST | `/streaks/:type/record` | streaks |
| POST | `/subscriptions/cancel` | economyEnhanced |
| POST | `/subscriptions/checkout` | economyEnhanced |
| GET | `/subscriptions/current` | economyEnhanced |
| GET | `/subscriptions/tiers` | economyEnhanced |
| POST | `/templates` | templates |
| GET | `/templates` | templates |
| GET | `/templates/:id` | templates |
| PUT | `/templates/:id` | templates |
| DELETE | `/templates/:id` | templates |
| POST | `/templates/:id/clone` | templates |
| POST | `/templates/:id/rate` | templates |
| POST | `/templates/:id/save` | templates |
| DELETE | `/templates/:id/save` | templates |
| GET | `/templates/featured` | templates |
| GET | `/templates/me` | templates |
| GET | `/templates/saved` | templates |
| GET | `/tips` | tips |
| POST | `/tips/:id/seen` | tips |
| POST | `/trace/frontend-log` | misc |
| POST | `/trades` | marketplace |
| GET | `/trades/:id` | marketplace |
| DELETE | `/trades/:id` | marketplace |
| POST | `/trades/:id/accept` | marketplace |
| POST | `/trades/:id/counter` | marketplace |
| POST | `/trades/:id/decline` | marketplace |
| POST | `/trades/estimate-value` | marketplace |
| GET | `/trades/history` | marketplace |
| GET | `/trades/incoming` | marketplace |
| GET | `/trades/outgoing` | marketplace |
| GET | `/trainers` | trainers |
| GET | `/trainers/:userId` | trainers |
| GET | `/trainers/me` | trainers |
| GET | `/trainers/me/classes` | trainers |
| PUT | `/trainers/me/status` | trainers |
| POST | `/trainers/profile` | trainers |
| GET | `/trust` | credits |
| GET | `/trust/tiers` | credits |
| GET | `/utility/streak-freeze` | economyEnhanced |
| POST | `/utility/streak-freeze/purchase` | economyEnhanced |
| POST | `/utility/streak-freeze/use` | economyEnhanced |
| POST | `/v1/prescription/generate` | prescription |
| GET | `/venue-records/:id` | venues |
| DELETE | `/venue-records/:id` | venues |
| POST | `/venue-records/:id/attest` | venues |
| POST | `/venue-records/:id/video` | venues |
| POST | `/venue-records/:id/witness` | venues |
| GET | `/venues` | venues |
| POST | `/venues` | venues |
| GET | `/venues/:id` | venues |
| POST | `/venues/:id/checkin` | venues |
| POST | `/venues/:id/checkout` | venues |
| POST | `/venues/:id/join` | venues |
| GET | `/venues/:id/leaderboard` | venues |
| POST | `/venues/:id/leave` | venues |
| GET | `/venues/:id/members` | venues |
| GET | `/venues/:id/present` | venues |
| GET | `/venues/:id/record-types` | venues |
| POST | `/venues/:id/records/claim` | venues |
| GET | `/venues/nearby` | venues |
| GET | `/venues/slug/:slug` | venues |
| POST | `/videos/:videoId/favorite` | exercise-videos |
| POST | `/videos/:videoId/watch` | exercise-videos |
| GET | `/virtual-hangouts` | virtual-hangouts |
| GET | `/virtual-hangouts/:id` | virtual-hangouts |
| GET | `/virtual-hangouts/:id/activity` | virtual-hangouts |
| POST | `/virtual-hangouts/:id/heartbeat` | virtual-hangouts |
| POST | `/virtual-hangouts/:id/join` | virtual-hangouts |
| POST | `/virtual-hangouts/:id/leave` | virtual-hangouts |
| GET | `/virtual-hangouts/:id/members` | virtual-hangouts |
| PATCH | `/virtual-hangouts/:id/membership` | virtual-hangouts |
| GET | `/virtual-hangouts/:id/posts` | virtual-hangouts |
| POST | `/virtual-hangouts/:id/posts` | virtual-hangouts |
| POST | `/virtual-hangouts/:id/share-workout` | virtual-hangouts |
| GET | `/virtual-hangouts/my` | virtual-hangouts |
| GET | `/virtual-hangouts/recommended` | virtual-hangouts |
| GET | `/virtual-hangouts/themes` | virtual-hangouts |
| GET | `/volume/1rm/:exerciseId` | volume-stats |
| GET | `/volume/daily` | volume-stats |
| GET | `/volume/exercise/:exerciseId` | volume-stats |
| GET | `/volume/muscles` | volume-stats |
| GET | `/volume/muscles/weekly` | volume-stats |
| GET | `/volume/prs` | volume-stats |
| GET | `/volume/summary` | volume-stats |
| GET | `/volume/weekly` | volume-stats |
| GET | `/wallet` | credits |
| GET | `/wallet/earnings` | credits |
| GET | `/wallet/transactions` | credits |
| POST | `/wallet/transfer` | credits |
| GET | `/wallet/transfers` | credits |
| GET | `/watch/exercises` | watch |
| GET | `/watch/quick-start` | watch |
| POST | `/watch/state` | watch |
| POST | `/watch/sync` | watch |
| GET | `/watch/workout-state` | watch |
| POST | `/webhook/stripe` | economyEnhanced |
| POST | `/workouts` | workouts |
| GET | `/workouts/:id` | workouts |
| GET | `/workouts/:workoutId/groups` | exercise-groups |
| POST | `/workouts/:workoutId/groups/:groupId/sets` | exercise-groups |
| GET | `/workouts/:workoutId/groups/:groupId/sets` | exercise-groups |
| GET | `/workouts/me` | workouts |
| GET | `/workouts/me/muscles` | workouts |
| GET | `/workouts/me/stats` | workouts |
| POST | `/workouts/preview` | workouts |

## Scripts

| Script | Description |
|--------|-------------|
| `build-fast.sh` | ============================================================================= |
| `build-safe.sh` | ============================================================================= |
| `build-vendors.sh` | ============================================================================= |
| `build-with-vendors.sh` | ============================================================================= |
| `check-duplicate-routes.sh` | Check for duplicate route definitions in the API codebase |
| `competitive-analysis.sh` | # competitive-analysis.sh - Automated Competitive Analysis for MuscleMap |
| `compress-assets.sh` | ============================================================================= |
| `deploy-branch.sh` | # deploy-branch.sh - Full deployment: commit, push, PR, merge, and deploy to production |
| `deploy.sh` | Deployment helper for MuscleMap |
| `generate-docs.cjs` | MuscleMap Documentation Generator  PERFORMANCE OPTIMIZED: - Parallel file processing using Promise.all - Caching of analysis results (5-minute TTL) - Incremental mode (only regenerate if sources changed) - Stream-based file operations for large files  Outputs: - Markdown files (for GitHub/web) - LaTeX files (for professional documentation/PDFs) - Plain-text docs (synced to public/docs-plain/)  Usage: node scripts/generate-docs.cjs              # Generate all docs + sync plain-text node scripts/generate-docs.cjs --latex      # LaTeX only node scripts/generate-docs.cjs --md         # Markdown only node scripts/generate-docs.cjs --sync-plain # Only sync docs-plain to public node scripts/generate-docs.cjs --fast       # Use cached analysis if available node scripts/generate-docs.cjs --incremental # Only regenerate if sources changed pnpm docs:generate  What it does: 1. Scans the codebase structure (parallel) 2. Extracts API endpoints from route files 3. Identifies features from page components 4. Updates all documentation files (MD + LaTeX) 5. Syncs docs-plain/ to public/docs-plain/ for web access / |
| `generate-icons.cjs` | App Icon Generator for MuscleMap Mobile App  Generates all required app icons for iOS and Android from a source image. Uses sharp for image processing (cross-platform, fast).  Usage: pnpm generate:icons [source-image]  If no source image is provided, uses apps/mobile/assets/icon-source.png or falls back to apps/mobile/assets/icon.png  Requirements: - Source image should be at least 1024x1024 pixels - PNG format recommended for best quality / |
| `logs.sh` | Unified Log Viewer for MuscleMap |
| `maintain.sh` | --- preflight --- |
| `merge-all.sh` | # merge-all.sh - Merge all worktree branches into main |
| `musclemap-start.sh` | # MuscleMap Local Development Services - START |
| `musclemap-stop.sh` | # MuscleMap Local Development Services - STOP |
| `pre-deploy-check.sh` | Pre-Deploy Check Script (PERFORMANCE OPTIMIZED) |
| `prepare-app-store.cjs` | MuscleMap App Store Preparation Script  Automates everything needed for App Store submission: - Generates all app icons (iOS + Android) - Creates App Store metadata JSON - Generates screenshot templates - Creates store listing text  Usage: node scripts/prepare-app-store.cjs pnpm prepare:appstore / |
| `production-deploy.sh` | # production-deploy.sh - Deploy script for MuscleMap production server |
| `publish-app.sh` | # MuscleMap App Publishing Script |
| `repo-cleanup.sh` | If caller sets DRY_RUN/APPLY explicitly, we do not prompt. |
| `reset-devbox.sh` | ---- toggles (set by menu) ---- |
| `run-approved-command.sh` | # run-approved-command.sh - Execute commands from the approved commands list |
| `test.sh` | Create a competition to get an ID (avoid hardcoded /1) |
| `tidy-root-js.sh` | Collect file basenames referenced by systemd units + pm2 dump |
| `warning-tracker.sh` | Warning Tracker - Tracks, triages, and auto-resolves common warnings |
| `webhook-deploy.sh` | ============================================================================= |
| `webhook-listener.js` | MuscleMap GitHub Webhook Listener  A lightweight HTTP server that listens for GitHub webhook events and triggers deployments when pushes to main are detected.  Usage: node scripts/webhook-listener.js  Environment: WEBHOOK_SECRET - GitHub webhook secret (required) WEBHOOK_PORT   - Port to listen on (default: 9000)  The listener runs on localhost only - Caddy proxies to it. / |

## Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Caddy     │────▶│   Fastify   │
│  (React)    │◀────│   (HTTPS)   │◀────│   (API)     │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ▼
                                        ┌─────────────┐
                                        │ PostgreSQL  │
                                        │  (Data)     │
                                        └─────────────┘
```

## Key Architectural Decisions

1. **Single Source of Truth**: PostgreSQL is the only data store
2. **Fastify over Express**: Better performance and TypeScript support
3. **Caddy over Nginx**: Automatic HTTPS, simpler configuration
4. **No Docker**: Direct deployment on VPS for simplicity
5. **Monorepo**: All packages in one repository with pnpm workspaces

## Build Order

```bash
pnpm build:packages  # shared → core → plugin-sdk → client → ui
pnpm build:api       # API server
pnpm build           # Frontend (Vite)
```

## Deployment

```bash
./deploy.sh "commit message"  # Full deployment to VPS
```

See `scripts/README.md` for detailed deployment instructions.
