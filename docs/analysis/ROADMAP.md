# MuscleMap Feature Roadmap

*Generated: January 8, 2026*

## Executive Summary

This roadmap prioritizes features that maximize MuscleMap's differentiation in the fitness app market. The core strategy:

1. **Lead with Career Readiness** - No competitor serves this market
2. **Enable Team/Unit features** - Enterprise potential for departments
3. **Build Safety features** - Trust with high-risk professionals
4. **Expand to Activity Recording** - Expected feature, build last

---

## MVP Sprint: Career Readiness Foundation

**Theme:** Establish MuscleMap as THE platform for career physical fitness standards

### Feature 1: Standards Library

**User story:** As a firefighter candidate, I want to see exactly what the CPAT requires so that I know what I'm training for.

**Acceptance criteria:**
- [ ] Database of 15+ physical standards (CPAT, ACFT, PFT, Navy PRT, etc.)
- [ ] Per-standard event listings with passing criteria
- [ ] Age/gender scoring tables where applicable
- [ ] Exercise mappings (which exercises train which events)
- [ ] Official source links

**Telemetry events:**
- `standards.viewed` - User viewed a standard
- `standards.event_viewed` - User viewed event details
- `standards.search` - User searched standards

**Privacy defaults:** Standards data is public (official government data)

**Effort:** M

**Dependencies:** None

---

### Feature 2: Career Goal Selection

**User story:** As a military member, I want to set ACFT as my career goal so that my training is optimized for it.

**Acceptance criteria:**
- [ ] User can browse standards by category (Fire, Military, LE, etc.)
- [ ] User can select a standard as their active career goal
- [ ] User can set a target date (e.g., "I want to be CPAT-ready by March 1")
- [ ] User can have multiple career goals (primary + secondary)
- [ ] Goals persist in user profile

**Telemetry events:**
- `career_goal.set` - User set a career goal
- `career_goal.target_date_set` - User set target date
- `career_goal.removed` - User removed a goal

**Privacy defaults:** Career goals are private by default

**Effort:** S

**Dependencies:** Standards Library

---

### Feature 3: Assessment Logger

**User story:** As a police academy candidate, I want to log my POST practice test results so that I can track my progress.

**Acceptance criteria:**
- [ ] User can log results for each event in a standard
- [ ] Results capture: value, date, location, notes
- [ ] Auto-calculate pass/fail per event and overall
- [ ] Show improvement from previous attempt
- [ ] Support partial assessments (log some events, not all)

**Telemetry events:**
- `assessment.logged` - User logged an assessment
- `assessment.event_passed` - User passed an event
- `assessment.overall_passed` - User passed entire standard

**Privacy defaults:** Assessment results are private by default

**Effort:** M

**Dependencies:** Standards Library, Career Goal Selection

---

### Feature 4: Readiness Dashboard

**User story:** As a firefighter, I want to see my current CPAT readiness percentage so that I know if I'm ready for the test.

**Acceptance criteria:**
- [ ] Calculate readiness score (0-100%) from most recent assessment
- [ ] Show per-event breakdown (passed/failed/needs-work)
- [ ] Show trend over time (improving/declining/stable)
- [ ] Show days until target date
- [ ] Identify weakest events

**Telemetry events:**
- `readiness.viewed` - User viewed readiness dashboard
- `readiness.milestone` - User crossed a readiness threshold (50%, 75%, 90%)

**Privacy defaults:** Readiness data is private by default

**Effort:** M

**Dependencies:** Assessment Logger

---

### Feature 5: Standard-Aware Prescription

**User story:** As a Marine preparing for the PFT, I want my prescribed workouts to focus on my weak events so that I improve faster.

**Acceptance criteria:**
- [ ] Prescription engine accepts career goal as input
- [ ] Identifies user's weak events from assessments
- [ ] Prioritizes exercises that train weak events
- [ ] Adjusts intensity based on target date proximity
- [ ] Includes event-specific drills (e.g., stair climb for CPAT)

**Telemetry events:**
- `prescription.career_goal_used` - Prescription generated with career goal
- `prescription.weak_event_targeted` - Prescription targeted a weak event

**Privacy defaults:** Prescriptions are private by default

**Effort:** L

**Dependencies:** Readiness Dashboard, Existing Prescription Engine

---

## Phase 2: Team Readiness & Community

**Theme:** Enable supervisors and commanders to see unit fitness

### Feature 6: Unit Readiness Dashboard

**User story:** As a fire captain, I want to see which of my crew members are CPAT-ready so that I can ensure team safety.

**Acceptance criteria:**
- [ ] Hangout owner/admin can enable "Unit Readiness" view
- [ ] Members opt-in to share readiness with unit leadership
- [ ] Dashboard shows: member list, readiness %, last assessment date
- [ ] Aggregate stats: X of Y members ready
- [ ] Identify unit-wide weak areas
- [ ] Export report for department records

**Telemetry events:**
- `unit_readiness.viewed` - Supervisor viewed unit dashboard
- `unit_readiness.member_opted_in` - Member opted into sharing
- `unit_readiness.report_exported` - Report exported

**Privacy defaults:**
- Members must explicitly opt-in to share with unit
- Opt-in is per-hangout (can share with station, not department)
- Admins see aggregates by default, individuals only if opted-in

**Effort:** L

**Dependencies:** Readiness Dashboard, Hangouts

---

### Feature 7: Recertification Tracking

**User story:** As a police officer, I want reminders when my annual fitness test is due so that I don't miss the deadline.

**Acceptance criteria:**
- [ ] User can set recertification schedule (annual, biannual, etc.)
- [ ] System calculates next due date from last assessment
- [ ] Push notifications 30, 14, 7 days before due
- [ ] Calendar export (iCal)
- [ ] Supervisor view of team recertification status

**Telemetry events:**
- `recertification.due_soon` - User notified of upcoming test
- `recertification.completed` - User logged recertification
- `recertification.overdue` - User past due date

**Privacy defaults:** Recertification status private by default

**Effort:** S

**Dependencies:** Assessment Logger

---

### Feature 8: Team Missions

**User story:** As a crew, I want to do a team fitness challenge so that we train together and compete with other crews.

**Acceptance criteria:**
- [ ] Hangout admin can create a Mission (time-bound challenge)
- [ ] Mission types: total TU, workout count, specific exercises
- [ ] Individual contributions aggregate to team score
- [ ] Leaderboard shows participating hangouts
- [ ] Mission completion awards for all participants

**Telemetry events:**
- `mission.created` - Admin created mission
- `mission.joined` - User joined mission
- `mission.completed` - Mission ended
- `mission.leaderboard_viewed` - User viewed standings

**Privacy defaults:**
- Mission participation visible to mission participants
- Individual contributions visible to team

**Effort:** M

**Dependencies:** Hangouts, Achievements

---

### Feature 9: Props System Enhancement

**User story:** As a user, I want to give meaningful recognition to others when they achieve something impressive.

**Acceptance criteria:**
- [ ] "Props" reaction system with archetype-themed options
- [ ] Props types: Respect, Solid, Beast, Warrior, Legend
- [ ] Props appear on activity feed items
- [ ] Weekly "most props" recognition
- [ ] Props count visible on profile (opt-out available)

**Telemetry events:**
- `props.given` - User gave props
- `props.received` - User received props
- `props.milestone` - User reached props milestone

**Privacy defaults:** Props visible by default, opt-out available

**Effort:** S

**Dependencies:** Activity Feed

---

## Phase 3: Safety & OPSEC

**Theme:** Build trust with users in dangerous professions

### Feature 10: Safe Zones

**User story:** As a federal agent, I want my home and office locations automatically hidden so that I don't expose sensitive locations.

**Acceptance criteria:**
- [ ] User can define Safe Zones (center point + radius)
- [ ] System auto-suggests frequent locations
- [ ] Activities within Safe Zones have location obscured
- [ ] Location shows as "Private Location" or general area only
- [ ] Applies to activity feed, check-ins, leaderboards

**Telemetry events:**
- `safe_zone.created` - User created safe zone
- `safe_zone.triggered` - Activity obscured by safe zone

**Privacy defaults:** No Safe Zones by default, but prominent in privacy settings

**Effort:** M

**Dependencies:** Location services

---

### Feature 11: Lifeline Location Sharing

**User story:** As a trail runner, I want my spouse to see my location during my run so that they know I'm safe.

**Acceptance criteria:**
- [ ] User can enable Lifeline before starting activity
- [ ] Select trusted contacts to share with
- [ ] Contacts see real-time location on map
- [ ] Lifeline auto-ends when activity ends
- [ ] Option for scheduled Lifeline (e.g., every morning run)

**Telemetry events:**
- `lifeline.started` - User started Lifeline
- `lifeline.contact_viewed` - Contact viewed location
- `lifeline.ended` - Lifeline ended

**Privacy defaults:**
- Lifeline is opt-in per activity
- Contacts must be pre-approved
- Location data not stored after Lifeline ends

**Effort:** L

**Dependencies:** Activity Recording (Phase 4)

---

### Feature 12: Mayday Emergency Alert

**User story:** As a firefighter training alone, I want an emergency button that alerts my crew if I'm in trouble.

**Acceptance criteria:**
- [ ] Mayday button accessible during workouts/activities
- [ ] Alert sent to: emergency contacts, crew members, 911 (optional)
- [ ] Alert includes: last known location, activity type, user profile
- [ ] Auto-detect option: alert if no movement for X minutes
- [ ] False alarm cancellation within 30 seconds

**Telemetry events:**
- `mayday.triggered` - User triggered Mayday
- `mayday.auto_triggered` - System triggered Mayday
- `mayday.cancelled` - User cancelled within window
- `mayday.acknowledged` - Contact acknowledged alert

**Privacy defaults:**
- Emergency contacts pre-defined
- Location shared only during emergency
- Auto-detect is opt-in

**Effort:** M

**Dependencies:** Lifeline, Activity Recording

---

### Feature 13: Conditions Alert

**User story:** As a construction worker, I want heat warnings during summer workouts so that I don't overheat.

**Acceptance criteria:**
- [ ] Weather API integration for temperature, humidity
- [ ] Calculate heat index / wet bulb globe temperature
- [ ] Alert thresholds: Caution, Warning, Danger
- [ ] PPE load modifier (add 10% for vest, 15% for full gear)
- [ ] Alerts shown before and during activity

**Telemetry events:**
- `conditions.alert_shown` - Alert displayed
- `conditions.activity_modified` - User modified activity due to alert
- `conditions.activity_continued` - User continued despite alert

**Privacy defaults:** Weather based on general area, not exact location

**Effort:** S

**Dependencies:** Weather API integration

---

## Phase 4: Activity Recording & Analytics

**Theme:** Expand beyond strength training to full fitness tracking

### Feature 14: Field Log Activity Recording

**User story:** As a soldier, I want to log my ruck marches with distance, time, and load so that I can track my conditioning.

**Acceptance criteria:**
- [ ] GPS-based activity recording
- [ ] Activity types: Run, Ruck, Swim, Climb, Row, Bike
- [ ] Load/weight input for weighted activities
- [ ] Elevation gain tracking
- [ ] Pace/speed calculation
- [ ] Map visualization of route

**Telemetry events:**
- `activity.started` - Activity recording started
- `activity.completed` - Activity completed
- `activity.paused` - Activity paused
- `activity.discarded` - Activity discarded

**Privacy defaults:**
- Activities private by default
- Delayed posting option (post 24h later)
- Safe Zones auto-applied

**Effort:** XL

**Dependencies:** Safe Zones

---

### Feature 15: Offline Mode

**User story:** As a Marine on deployment, I want to log workouts without internet so that I can track my training in the field.

**Acceptance criteria:**
- [ ] Full workout logging offline
- [ ] Queue workouts for sync when connected
- [ ] Conflict resolution for multi-device
- [ ] Offline duration: up to 30 days of data
- [ ] Sync progress indicator

**Telemetry events:**
- `offline.mode_entered` - Device went offline
- `offline.sync_started` - Sync began
- `offline.sync_completed` - Sync finished
- `offline.conflict_resolved` - Conflict handled

**Privacy defaults:** Local data encrypted at rest

**Effort:** XL

**Dependencies:** Core app refactor for local-first

---

### Feature 16: Training Intel Dashboard

**User story:** As an athlete, I want to see my training trends over time so that I can understand my progress.

**Acceptance criteria:**
- [ ] Weekly/monthly/yearly views
- [ ] Metrics: total TU, workout count, muscle coverage
- [ ] Trend indicators: improving, stable, declining
- [ ] Muscle group breakdown over time
- [ ] Training balance score (upper/lower, push/pull)

**Telemetry events:**
- `training_intel.viewed` - User viewed dashboard
- `training_intel.date_range_changed` - User changed time range
- `training_intel.metric_drilldown` - User drilled into metric

**Privacy defaults:** Private by default

**Effort:** M

**Dependencies:** Sufficient workout history

---

### Feature 17: Recovery Status

**User story:** As a CrossFitter, I want to know if I'm recovered enough to train hard today so that I don't overtrain.

**Acceptance criteria:**
- [ ] Fatigue score from recent training load
- [ ] Recovery score from time since last workout
- [ ] Sleep/HRV integration if available
- [ ] Recommendation: Ready, Moderate, Rest
- [ ] Recovery trends over time

**Telemetry events:**
- `recovery.viewed` - User viewed status
- `recovery.recommendation_followed` - User trained per recommendation
- `recovery.recommendation_ignored` - User trained against recommendation

**Privacy defaults:** Private by default

**Effort:** M

**Dependencies:** Training Intel, Wearables integration

---

### Feature 18: Battle Rhythm Periodization

**User story:** As a firefighter on 24-hour shifts, I want my training plan to account for my work schedule so that I'm not prescribed hard workouts after a shift.

**Acceptance criteria:**
- [ ] User can set work schedule pattern (24 on/48 off, etc.)
- [ ] Periodization accounts for work days (lighter/recovery)
- [ ] Phase planning: Build, Peak, Taper, Recovery
- [ ] Event targeting (peak for test date)
- [ ] Deload week automation

**Telemetry events:**
- `periodization.schedule_set` - User set work schedule
- `periodization.phase_started` - Training phase began
- `periodization.deload_triggered` - Deload week started

**Privacy defaults:** Schedule private by default

**Effort:** L

**Dependencies:** Prescription Engine, Career Goal

---

## Phase 5: Ecosystem & Integrations

**Theme:** Connect MuscleMap to the broader fitness ecosystem

### Feature 19: Garmin Connect Integration

**User story:** As a Garmin user, I want my watch data to sync to MuscleMap so that I have all my fitness data in one place.

**Acceptance criteria:**
- [ ] OAuth connection to Garmin Connect
- [ ] Import: activities, heart rate, sleep, stress
- [ ] Sync frequency: near real-time via webhooks
- [ ] Data merge with MuscleMap workouts
- [ ] Disconnect option with data retention choice

**Telemetry events:**
- `integration.garmin_connected` - User connected Garmin
- `integration.garmin_sync` - Data synced
- `integration.garmin_disconnected` - User disconnected

**Privacy defaults:** User controls what data is imported

**Effort:** L

**Dependencies:** Wearables service

---

### Feature 20: Apple HealthKit Integration

**User story:** As an iPhone user, I want my Apple Watch data in MuscleMap so that my heart rate and activity rings are part of my fitness picture.

**Acceptance criteria:**
- [ ] HealthKit permissions on iOS
- [ ] Import: workouts, heart rate, steps, sleep
- [ ] Write back: MuscleMap workouts to HealthKit
- [ ] Background sync
- [ ] Privacy controls per data type

**Telemetry events:**
- `integration.healthkit_connected` - User granted permissions
- `integration.healthkit_sync` - Data synced
- `integration.healthkit_write` - Data written to HealthKit

**Privacy defaults:** User grants specific permissions

**Effort:** L

**Dependencies:** iOS app, Wearables service

---

### Feature 21: Data Vault Export

**User story:** As a privacy-conscious user, I want to export all my data so that I own my fitness history.

**Acceptance criteria:**
- [ ] Full export: JSON and CSV formats
- [ ] Selective export: date range, data types
- [ ] Include: workouts, assessments, achievements, settings
- [ ] GDPR compliance: right to erasure
- [ ] Export request via settings, email delivery

**Telemetry events:**
- `data_vault.export_requested` - User requested export
- `data_vault.export_completed` - Export delivered
- `data_vault.deletion_requested` - User requested deletion

**Privacy defaults:** Export includes all user data

**Effort:** M

**Dependencies:** None

---

### Feature 22: Public API

**User story:** As a gym owner, I want to integrate MuscleMap data into my gym's system so that members can see their progress on our screens.

**Acceptance criteria:**
- [ ] API key management in settings
- [ ] Rate limits per tier (free, paid)
- [ ] Endpoints: user stats, workouts, achievements
- [ ] OAuth for third-party apps
- [ ] API documentation portal

**Telemetry events:**
- `api.key_created` - User created API key
- `api.request` - API request made
- `api.rate_limited` - Request rate limited

**Privacy defaults:** User authorizes each third-party app

**Effort:** L

**Dependencies:** None

---

## Phase 6: Marketplace & Cosmetics Economy

**Theme:** Create a thriving cosmetics economy that incentivizes healthy behavior through collection, trading, and social engagement

*Full specification: See `docs/MARKETPLACE-TRADING-SYSTEM-PLAN.md`*

### Feature 23: Marketplace Foundation

**User story:** As a user, I want to buy and sell cosmetics with other users so that I can collect rare items and monetize my duplicates.

**Acceptance criteria:**
- [ ] Player-to-player marketplace with buy now and offer system
- [ ] Auction house with standard, Dutch, and blind auctions
- [ ] Watchlist and price alert notifications
- [ ] Price history charts and market analytics
- [ ] Seller reputation and rating system
- [ ] 5% marketplace fee as credit sink

**Telemetry events:**
- `marketplace.listing_created` - User listed an item
- `marketplace.item_sold` - Item sold through marketplace
- `marketplace.offer_made` - User made an offer
- `marketplace.auction_bid` - User placed auction bid

**Privacy defaults:** Listings are public, purchase history private

**Effort:** XL

**Dependencies:** Credit economy system, Cosmetics catalog

---

### Feature 24: P2P Trading System

**User story:** As a user, I want to trade items directly with other users so that I can negotiate deals and exchange items + credits.

**Acceptance criteria:**
- [ ] Item + credits trades in single transaction
- [ ] Multi-item trades (up to 10 items per side)
- [ ] Trade value calculator with market estimates
- [ ] Counter-offer negotiation system
- [ ] Trade history and reputation tracking
- [ ] Scam prevention with value warnings

**Telemetry events:**
- `trade.request_sent` - Trade request initiated
- `trade.completed` - Trade completed
- `trade.countered` - Counter-offer made
- `trade.declined` - Trade declined

**Privacy defaults:** Trade history visible to participants only

**Effort:** L

**Dependencies:** Marketplace foundation

---

### Feature 25: Collection & Showcase System

**User story:** As a collector, I want to track my progress toward completing cosmetic sets and show off my best items on my profile.

**Acceptance criteria:**
- [ ] Collection progress tracking by category and rarity
- [ ] Collection sets with themed items and completion rewards
- [ ] Profile showcase with 3 featured items
- [ ] Collection value estimation
- [ ] Collection milestones and achievements
- [ ] Set completion badges and titles

**Telemetry events:**
- `collection.set_progress` - User progressed in a set
- `collection.set_completed` - User completed a set
- `collection.showcase_updated` - User updated showcase
- `collection.milestone_reached` - Collection milestone achieved

**Privacy defaults:** Collection visible, showcase customizable

**Effort:** M

**Dependencies:** Cosmetics catalog

---

### Feature 26: Mystery Box System

**User story:** As a user, I want to open mystery boxes for a chance at rare cosmetics so that I have an exciting way to acquire new items.

**Acceptance criteria:**
- [ ] Multiple box tiers (Standard, Premium, Legendary)
- [ ] Transparent drop rates
- [ ] Pity system guaranteeing epic at 30 opens, legendary at 100
- [ ] Animated opening experience
- [ ] Workout-earned boxes (daily workout, weekly streak)
- [ ] Box history and statistics

**Telemetry events:**
- `mystery_box.opened` - User opened a box
- `mystery_box.pity_triggered` - Pity system activated
- `mystery_box.rare_drop` - Epic+ item obtained

**Privacy defaults:** Opening history private by default

**Effort:** M

**Dependencies:** Cosmetics catalog, Credit economy

---

### Feature 27: Health-Based Earning Multipliers

**User story:** As a user who exercises regularly, I want to earn credits faster so that I'm rewarded for maintaining healthy habits.

**Acceptance criteria:**
- [ ] Base earning multiplier from health score
- [ ] Workout streak bonus (+10% per day, max 70%)
- [ ] Sleep quality bonus (+5% per 10 points above 70)
- [ ] Nutrition tracking bonus (+15% max)
- [ ] Health tier system (5 tiers) with escalating benefits
- [ ] Maximum 2.1x earning multiplier

**Telemetry events:**
- `health.multiplier_updated` - Multiplier changed
- `health.tier_changed` - User changed health tier
- `health.daily_complete` - All daily health goals met

**Privacy defaults:** Health metrics private by default

**Effort:** L

**Dependencies:** Health metrics logging, Nutrition tracking

---

### Feature 28: Workout-Gated Cosmetics

**User story:** As a dedicated athlete, I want access to exclusive cosmetics that require workout achievements so that my dedication is visually recognized.

**Acceptance criteria:**
- [ ] Cosmetics requiring lifetime workout counts
- [ ] Cosmetics requiring workout streaks
- [ ] Cosmetics requiring weight lifted milestones
- [ ] Cosmetics requiring competition victories
- [ ] Cosmetics requiring health tier maintenance
- [ ] Progressive unlock visibility

**Telemetry events:**
- `workout_gated.unlocked` - User unlocked gated cosmetic
- `workout_gated.progress` - User progressed toward unlock
- `workout_gated.purchased` - User purchased after unlock

**Privacy defaults:** Unlock progress visible on profile (opt-out)

**Effort:** M

**Dependencies:** Achievement system, Workout logging

---

### Feature 29: Crew Treasury & Group Economy

**User story:** As a crew leader, I want to manage a shared treasury so that we can pool resources for group purchases and rewards.

**Acceptance criteria:**
- [ ] Crew treasury with deposit/withdrawal controls
- [ ] Crew cosmetics (banner, badge, aura) usable by all members
- [ ] Shared inventory for crew-owned items
- [ ] Group challenge rewards paid to treasury
- [ ] Treasury transaction history and audit log
- [ ] Crew-only marketplace listings (no fees)

**Telemetry events:**
- `crew_economy.deposit` - Credits deposited to treasury
- `crew_economy.withdrawal` - Credits withdrawn
- `crew_economy.purchase` - Crew purchased cosmetic
- `crew_economy.item_shared` - Item added to shared inventory

**Privacy defaults:** Treasury visible to crew members only

**Effort:** L

**Dependencies:** Crews system, Marketplace

---

### Feature 30: Enhanced Gifting System

**User story:** As a user, I want to send cosmetics and credits as gifts to friends so that I can celebrate their achievements and build community.

**Acceptance criteria:**
- [ ] Gift wrapping styles (standard, birthday, holiday, congrats)
- [ ] Personal messages with gifts
- [ ] Anonymous gifting option
- [ ] Scheduled future delivery
- [ ] Gift return/exchange system
- [ ] Gift opening animation

**Telemetry events:**
- `gift.sent` - Gift sent
- `gift.received` - Gift delivered
- `gift.opened` - Gift opened
- `gift.returned` - Gift returned

**Privacy defaults:** Gifts visible to sender/recipient only

**Effort:** S

**Dependencies:** Cosmetics catalog

---

### Feature 31: Seasonal Battle Pass

**User story:** As an active user, I want to progress through a seasonal battle pass so that I have long-term goals and exclusive rewards.

**Acceptance criteria:**
- [ ] 100 level progression per season
- [ ] Free track with basic rewards
- [ ] Premium track (500 credits) with exclusive cosmetics
- [ ] Season duration: 3 months
- [ ] XP earned from workouts, daily tasks, challenges
- [ ] Season-exclusive items (never return)

**Telemetry events:**
- `battle_pass.level_up` - User leveled up
- `battle_pass.premium_purchased` - User bought premium
- `battle_pass.reward_claimed` - User claimed reward
- `battle_pass.completed` - User reached level 100

**Privacy defaults:** Battle pass progress visible on profile

**Effort:** L

**Dependencies:** XP system, Cosmetics catalog

---

## Later: Future Considerations

### Not Prioritized (Build Only If Demanded)

| Feature | Reason | Reconsider If |
|---------|--------|---------------|
| Route Discovery | Not core to MuscleMap identity | Strong user demand |
| Virtual Races | Commodity feature, not differentiator | Partnership opportunity |
| Nutrition Tracking | Different domain expertise needed | Acquisition opportunity |
| Social Graph | Feeds algorithm complexity | Community growth stalls |
| Crafting System | Complexity overhead | High engagement with trading |
| Item Fusion | Balancing difficulty | Mature economy |

### Possible Future Features

| Feature | Description | Trigger |
|---------|-------------|---------|
| Agency Marketplace | Departments pay for team licenses | 10+ departments using MuscleMap |
| Certification API | Issue digital certificates for standards | Partner with certification bodies |
| VR Training | VisionOS training simulations | VisionOS adoption |
| AI Coach | Natural language training advice | LLM cost reduction |
| Item Crafting | Combine items to create new ones | Economy reaches maturity |
| Limited Drops | Time-limited exclusive releases | Strong collector engagement |
| Creator Program | Users design cosmetics for revenue share | 10k+ active traders |

---

## Success Metrics

### MVP Sprint
- [ ] 15+ physical standards in database
- [ ] 100+ users with career goals set
- [ ] 500+ assessments logged
- [ ] Prescription engine used 50% more when career goal set

### Phase 2
- [ ] 10+ hangouts with Unit Readiness enabled
- [ ] 50+ supervisors viewing team dashboards
- [ ] 100+ team missions completed

### Phase 3
- [ ] 1000+ Safe Zones created
- [ ] 500+ Lifeline sessions
- [ ] 0 missed Mayday alerts

### Phase 4
- [ ] 10,000+ Field Log activities recorded
- [ ] 95% sync success rate for Offline Mode
- [ ] 80% of active users view Training Intel weekly

### Phase 5
- [ ] 5000+ Garmin connections
- [ ] 3000+ HealthKit connections
- [ ] 100+ third-party apps using Public API

### Phase 6 (Marketplace & Economy)
- [ ] 10,000+ marketplace listings created
- [ ] 50,000+ trades completed
- [ ] 70% of active users own 10+ cosmetics
- [ ] 30% of users complete at least one collection set
- [ ] Health-based multiplier users workout 40% more than baseline
- [ ] 25% of crews actively use treasury
- [ ] Battle pass completion rate >60% for premium purchasers
- [ ] Average 5+ gifts sent per user per month
- [ ] Marketplace fee revenue covers 20%+ of infrastructure costs
- [ ] Workout-gated cosmetics increase average workouts by 25%

---

*End of Roadmap*
