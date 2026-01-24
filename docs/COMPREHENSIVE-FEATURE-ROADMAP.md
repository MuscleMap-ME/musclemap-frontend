# MuscleMap Comprehensive Feature Roadmap

**Created:** January 24, 2026
**Status:** Active Development Plan
**Goal:** Make MuscleMap the most comprehensive fitness platform

---

## Executive Summary

MuscleMap has an **80% complete backend** with 140+ migrations and 39 modules. This roadmap focuses on:
1. **Completing partially-built features** (quick wins)
2. **Closing critical competitive gaps** (Apple Watch, video demos)
3. **Expanding unique differentiators** (3D viz, gamification, AI)

---

## Phase 1: Quick Wins (Week 1-2)
*Complete what's already built but needs UI polish*

### 1.1 RPE/RIR Workout Integration
**Status:** Backend 100% complete, UI needs integration
**Effort:** 2-3 days
**Files:**
- `src/pages/Workout.tsx` - Add RPE/RIR input after each set
- `src/components/workout/RPESelector.tsx` - Create RPE scale picker (1-10)
- `src/components/workout/RIRSelector.tsx` - Create RIR picker (0-5+)

**Tasks:**
- [ ] Add RPE input modal after set completion
- [ ] Add optional RIR toggle
- [ ] Show RPE trends in set history
- [ ] Add fatigue indicator based on RPE progression
- [ ] Integrate with workout prescription (lower volume when fatigued)

### 1.2 Recovery Score Dashboard
**Status:** Backend complete, UI exists but needs refinement
**Effort:** 2 days
**Files:**
- `src/pages/Recovery.tsx` - Enhance with better visualizations
- `src/pages/Health.tsx` - Integrate recovery metrics

**Tasks:**
- [ ] Add recovery score card to Dashboard
- [ ] Show muscle-specific recovery status
- [ ] Add "optimal training" recommendations
- [ ] Visualize recovery trend over 7/30 days
- [ ] Add sleep quality correlation chart

### 1.3 Sleep Tracking Enhancement
**Status:** Backend complete, UI basic
**Effort:** 2 days

**Tasks:**
- [ ] Add quick sleep log from Dashboard
- [ ] Show sleep debt accumulation
- [ ] Add sleep quality factors (caffeine, screens, etc.)
- [ ] Integrate sleep with recovery score display
- [ ] Add bedtime reminder notification

### 1.4 1RM Tracking & Estimation
**Status:** Database exists, needs service implementation
**Effort:** 2 days

**Tasks:**
- [ ] Implement Epley formula: `1RM = weight × (1 + reps/30)`
- [ ] Track estimated 1RM per exercise over time
- [ ] Add 1RM progression chart to exercise detail
- [ ] Show percentage of 1RM for each set
- [ ] Add "Test Your 1RM" workout mode

### 1.5 Outdoor Equipment Map Route
**Status:** Components built, needs routing
**Effort:** 1 day

**Tasks:**
- [ ] Add `/discover` route to router
- [ ] Create DiscoverPage wrapper component
- [ ] Add navigation link to main menu
- [ ] Integrate EquipmentMap component
- [ ] Add "Workout Here" CTA on venue detail

---

## Phase 2: Nutrition Completion (Week 2-3)
*Database 90% complete, needs UI integration*

### 2.1 Daily Nutrition Logging UI
**Effort:** 3-4 days

**Tasks:**
- [ ] Create meal logging flow (breakfast/lunch/dinner/snacks)
- [ ] Add quick-add recent foods
- [ ] Show daily macro progress ring
- [ ] Add meal photo capture (optional)
- [ ] Create food search with fuzzy matching

### 2.2 Barcode Scanning
**Effort:** 2-3 days (requires food database)

**Tasks:**
- [ ] Integrate camera barcode scanner (react-native-camera or web API)
- [ ] Connect to Open Food Facts API (free) or Nutritionix (paid)
- [ ] Cache scanned items locally
- [ ] Add manual barcode entry fallback
- [ ] Show nutrition facts after scan

### 2.3 Macro Goals & Tracking
**Effort:** 2 days

**Tasks:**
- [ ] Set daily macro targets (protein/carbs/fat/calories)
- [ ] Archetype-based default recommendations
- [ ] Show macro breakdown by meal
- [ ] Add weekly nutrition summary
- [ ] Integrate with workout days (higher carbs on training days)

### 2.4 Hydration Tracking
**Effort:** 1 day

**Tasks:**
- [ ] Quick water intake logging
- [ ] Daily hydration goal
- [ ] Hydration reminders
- [ ] Show hydration on Dashboard

### 2.5 Meal Plans & Recipes
**Effort:** 2 days

**Tasks:**
- [ ] Create meal plan templates
- [ ] Recipe browser with filters
- [ ] Shopping list generation
- [ ] Meal prep scheduling

---

## Phase 3: Training Programs (Week 3-4)
*Infrastructure exists, needs content and UI*

### 3.1 Pre-Built Program Library
**Effort:** 3-4 days

**Programs to add:**
- [ ] Push/Pull/Legs (PPL) - 6 day
- [ ] StrongLifts 5x5 - 3 day
- [ ] PHUL - 4 day
- [ ] GZCLP - 4 day
- [ ] Upper/Lower - 4 day
- [ ] Full Body - 3 day
- [ ] Bro Split - 5 day
- [ ] Beginner Foundation - 3 day

**Tasks:**
- [ ] Create program data structure (JSON or DB seeds)
- [ ] Build program browser UI
- [ ] Add program preview (show all workouts)
- [ ] Implement program enrollment flow
- [ ] Show current program on Dashboard

### 3.2 Program Progression System
**Effort:** 2 days

**Tasks:**
- [ ] Auto-increase weight after successful sets
- [ ] Deload week detection and scheduling
- [ ] Program completion tracking
- [ ] Progressive overload recommendations
- [ ] Stall detection and suggestions

### 3.3 Custom Program Builder
**Effort:** 3 days

**Tasks:**
- [ ] Drag-drop workout day editor
- [ ] Exercise selection with search
- [ ] Set/rep/rest configuration
- [ ] Multi-week phase planning
- [ ] Program sharing (public/private/link)

### 3.4 Today's Workout Widget
**Effort:** 1 day

**Tasks:**
- [ ] Show next scheduled workout on Dashboard
- [ ] One-tap start workout
- [ ] Adjust if skipped (shuffle schedule)
- [ ] Rest day indicator

---

## Phase 4: Apple Watch App (Week 4-6)
*Critical competitive gap - highest priority integration*

### 4.1 Watch App Foundation
**Effort:** 2 weeks

**Technology:** React Native + WatchKit (or native Swift for performance)

**Core Features:**
- [ ] Start workout from watch
- [ ] Log sets (weight/reps) via crown
- [ ] Rest timer with haptic alerts
- [ ] Current exercise display
- [ ] Quick RPE input (1-10 buttons)
- [ ] Workout completion summary
- [ ] Heart rate display (if available)

### 4.2 Watch Complications
**Effort:** 3-4 days

**Tasks:**
- [ ] Current streak complication
- [ ] Next workout complication
- [ ] Rest timer complication
- [ ] Daily progress ring complication

### 4.3 Watch-Phone Sync
**Effort:** 3-4 days

**Tasks:**
- [ ] Real-time workout sync via WatchConnectivity
- [ ] Offline workout storage on watch
- [ ] Sync queue when phone reconnects
- [ ] Background sync for stats

### 4.4 Standalone Watch Workouts
**Effort:** 3-4 days

**Tasks:**
- [ ] Download workout templates to watch
- [ ] Full workout without phone
- [ ] Exercise library on watch (top 50)
- [ ] Sync completed workout later

---

## Phase 5: Health Integrations (Week 6-7)
*Opens ecosystem integration flywheel*

### 5.1 Apple HealthKit Integration
**Effort:** 1 week

**Read from HealthKit:**
- [ ] Steps
- [ ] Active calories
- [ ] Resting heart rate
- [ ] Heart rate variability (HRV)
- [ ] Sleep analysis
- [ ] Body measurements (weight, body fat %)
- [ ] Workouts from other apps

**Write to HealthKit:**
- [ ] Completed workouts
- [ ] Active calories burned
- [ ] Strength training minutes

### 5.2 Google Fit Integration
**Effort:** 4-5 days

**Tasks:**
- [ ] OAuth flow for Google Fit
- [ ] Read steps, calories, heart rate
- [ ] Write workout sessions
- [ ] Sync body measurements
- [ ] Background sync service

### 5.3 Strava Integration
**Effort:** 3-4 days

**Tasks:**
- [ ] OAuth connection flow
- [ ] Import cardio activities
- [ ] Export strength workouts as activities
- [ ] Share PRs to Strava

### 5.4 Garmin Connect Integration
**Effort:** 3-4 days

**Tasks:**
- [ ] Garmin Connect IQ SDK integration
- [ ] Import workouts from Garmin watches
- [ ] Sync heart rate data
- [ ] Sleep data import

---

## Phase 6: Exercise Videos (Week 7-8)
*Baseline competitor feature*

### 6.1 Video Infrastructure
**Effort:** 2-3 days

**Tasks:**
- [ ] Set up video CDN (Cloudflare Stream, Mux, or AWS)
- [ ] Create video upload pipeline for admin
- [ ] Implement HLS streaming
- [ ] Add video player component with quality selection
- [ ] Lazy load videos (don't preload)

### 6.2 Video Content Strategy
**Options:**
1. **License existing library** - MuscleWiki, ExRx, or commercial provider
2. **Partner with content creator** - Fitness YouTuber collaboration
3. **Create original content** - Expensive but branded
4. **Community contributed** - User-submitted with review

**Recommended:** Start with licensing (fastest), add original over time

### 6.3 Video Integration
**Effort:** 2-3 days

**Tasks:**
- [ ] Add video tab to exercise detail
- [ ] Show video thumbnail in exercise list
- [ ] Multiple angles (front, side, 45°)
- [ ] Common mistakes video section
- [ ] Form cues overlay
- [ ] Slow-motion toggle

### 6.4 Video Search & Discovery
**Effort:** 1-2 days

**Tasks:**
- [ ] Search exercises by video availability
- [ ] "New videos" section
- [ ] Video quality indicator
- [ ] Offline video download (premium)

---

## Phase 7: Advanced Features (Week 8-10)

### 7.1 AI Workout Coach
**Effort:** 1 week

**Tasks:**
- [ ] Chat interface for workout questions
- [ ] Form advice based on common mistakes
- [ ] Personalized recommendations based on history
- [ ] "Why this exercise?" explanations
- [ ] Injury prevention suggestions
- [ ] Integration with Claude API or OpenAI

### 7.2 AI Form Feedback (Experimental)
**Effort:** 2 weeks (complex)

**Tasks:**
- [ ] Camera-based pose detection
- [ ] Real-time form analysis
- [ ] Rep counting from video
- [ ] Form score per rep
- [ ] Correction suggestions
- [ ] Requires ML model (MediaPipe, TensorFlow.js)

### 7.3 Social Challenges 2.0
**Effort:** 1 week

**Tasks:**
- [ ] Weekly group challenges
- [ ] Custom challenge creation
- [ ] Challenge leaderboards
- [ ] Prize/badge system for winners
- [ ] Team vs team challenges
- [ ] Streak challenges

### 7.4 Workout Sharing & Social
**Effort:** 3-4 days

**Tasks:**
- [ ] Share workout summary card (image)
- [ ] Share to Instagram/Twitter/Facebook
- [ ] Deep link to workout in app
- [ ] "Copy this workout" feature
- [ ] Workout comments/reactions

---

## Phase 8: Premium Features (Week 10-12)

### 8.1 Advanced Analytics Dashboard
**Effort:** 1 week

**Tasks:**
- [ ] Muscle balance analysis
- [ ] Training frequency heatmap
- [ ] Volume vs strength correlation
- [ ] Fatigue accumulation tracking
- [ ] Optimal training time analysis
- [ ] Compare to similar users (anonymized)

### 8.2 Periodization Planner
**Effort:** 1 week

**Tasks:**
- [ ] Mesocycle planning (4-6 weeks)
- [ ] Volume wave programming
- [ ] Intensity cycling
- [ ] Peak week planning
- [ ] Competition prep mode

### 8.3 Coach Dashboard (B2B)
**Effort:** 1-2 weeks

**Tasks:**
- [ ] Multi-client management
- [ ] Program assignment
- [ ] Client progress monitoring
- [ ] Messaging with clients
- [ ] Bulk program updates
- [ ] Revenue tracking

### 8.4 Team/Organization Features (B2B)
**Effort:** 1-2 weeks

**Tasks:**
- [ ] Organization admin panel
- [ ] Team member management
- [ ] Aggregate team stats
- [ ] PT test tracking for teams
- [ ] Team readiness dashboard
- [ ] Compliance reporting

---

## Phase 9: Platform Expansion (Month 3+)

### 9.1 Wear OS App
**Effort:** 2 weeks (after Apple Watch)

### 9.2 Android TV / Apple TV App
**Effort:** 2-3 weeks
- Follow-along workouts on big screen

### 9.3 Desktop App
**Effort:** 1 week (Electron wrapper)
- Gym kiosk mode
- Detailed analytics view

### 9.4 API for Third Parties
**Effort:** 2 weeks
- Public API for integrations
- Webhook system
- OAuth for third-party apps

---

## Implementation Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| RPE/RIR UI | Medium | Low | P0 |
| Recovery Dashboard | Medium | Low | P0 |
| 1RM Tracking | High | Low | P0 |
| Outdoor Map Route | Low | Very Low | P0 |
| Nutrition UI | High | Medium | P1 |
| Barcode Scanning | High | Medium | P1 |
| Training Programs | High | Medium | P1 |
| **Apple Watch** | **Very High** | **High** | **P0** |
| Apple Health | High | Medium | P1 |
| Exercise Videos | High | Medium | P1 |
| AI Coach | Medium | High | P2 |
| AI Form Feedback | Low | Very High | P3 |
| Wear OS | Medium | Medium | P2 |
| Coach Dashboard | Medium | High | P2 |

---

## Success Metrics

### User Engagement
- DAU/MAU ratio > 40%
- Avg session length > 15 min
- Workout completion rate > 80%
- 7-day retention > 60%

### Feature Adoption
- Nutrition logging > 30% of active users
- Apple Watch usage > 50% of iOS users
- Video views > 2 per workout
- Program enrollment > 40%

### Competitive Position
- App Store rating > 4.7
- Feature parity with Strong/Hevy
- Unique features (3D viz, gamification) highlighted in reviews

---

## Resource Requirements

### Development Team
- 2 React Native developers (mobile/watch)
- 1 Backend developer (API/integrations)
- 1 Full-stack developer (web/features)
- 1 Designer (UI/UX)

### External Costs
- Video content licensing: $5-20K/year
- CDN for videos: $500-2K/month
- Food database API: $200-500/month
- Apple Developer: $99/year
- Google Play: $25 one-time

### Timeline
- Phase 1-3: 4 weeks (current team)
- Phase 4-6: 6 weeks (need mobile specialist)
- Phase 7-9: Ongoing (quarterly releases)

---

## Next Steps

1. **This Week:** Complete Phase 1 quick wins
2. **Week 2-3:** Nutrition UI completion
3. **Week 3-4:** Training programs
4. **Week 4+:** Apple Watch development begins

---

*This roadmap is a living document. Update as features are completed and priorities shift.*
