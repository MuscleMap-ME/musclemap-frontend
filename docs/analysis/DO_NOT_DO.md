# MuscleMap: Do Not Do List

*Generated: January 8, 2026*

This document defines what MuscleMap should **avoid** building, naming, or doing. It serves as guardrails for product decisions.

---

## Naming (Trademark Avoidance)

### Terms to AVOID

| DO NOT USE | USE INSTEAD | Reason |
|------------|-------------|--------|
| "Segments" | "Checkpoints" or "Splits" | Strava trademark |
| "KOM" / "QOM" | "Course Record" or "Top Honor" | Strava trademark |
| "Kudos" | "Props" or "Respect" | Strava trademark |
| "Beacon" | "Lifeline" | Strava trademark |
| "Flybys" | N/A (don't build) | Strava feature name |
| "Suffer Score" | "Effort Index" or "Load Score" | Strava trademark |
| "Relative Effort" | "Training Load" | Strava trademark |
| "Heatmap" | "Activity Map" | Common but associated |
| "Local Legend" | "Area Champion" | Strava feature |
| "Routes" (as feature name) | "Courses" or "Paths" | Generic but associated |
| "Challenges" | "Missions" | Common but different branding |
| "Clubs" | "Hangouts" | Already using Hangouts |

### Naming Guidelines

1. **Use military/tactical terminology** where appropriate (Missions, Intel, Field Log)
2. **Use sports terminology** for competition (Course Record, Honor Roll)
3. **Use community terminology** for social (Props, Crew, Hangouts)
4. **Avoid** cutesy or gamified names that feel inauthentic to our users

---

## Data Sources

### DO NOT Use

| Source | Reason |
|--------|--------|
| Strava API data | Competitor data, TOS concerns |
| Scraped competitor data | Unethical, potential legal issues |
| Scraped user data | Privacy violation |
| Unlicensed map data | Legal liability |
| Copyrighted fitness content | IP infringement |

### DO Use

| Source | Usage |
|--------|-------|
| Our own user data | Primary source |
| OpenStreetMap | Maps (with attribution) |
| Public government fitness standards | CPAT, ACFT, PFT specifications |
| User-contributed hangout data | Community content |
| Weather APIs (licensed) | Conditions alerts |
| Device APIs (Garmin, Apple) | With user OAuth consent |
| Academic exercise science | With citation |

---

## Feature Scope Traps

### DO NOT Build (Yet)

| Feature | Reason | Reconsider When |
|---------|--------|-----------------|
| Full route creation editor | Complex, not core value | After Activity Recording stable |
| Complex ML recommendations | Simple rules first | After 100k workouts logged |
| Social graph / follower suggestions | Not our model (Hangouts > follows) | If engagement stalls |
| Real-time multiplayer workouts | Huge complexity | After offline mode stable |
| Video workout content | Different business model | Partnership opportunity |
| Meal planning / recipes | Out of domain expertise | Acquisition opportunity |
| Sleep tracking | Wearable data sufficient | If users demand |
| Meditation / mindfulness | Not core value | Never (stay focused) |
| Weight tracking as primary feature | Not our differentiation | Keep as minor feature |

### Feature Creep Red Flags

Watch for these warning signs during development:

1. "While we're at it, we could also..." → Stop. Ship the core feature.
2. "Users might want to configure..." → Default to good defaults.
3. "What if we added a social sharing option for..." → Privacy first.
4. "This would be a nice gamification element..." → Useful first, fun second.
5. "Competitors have this feature..." → Is it core to OUR value proposition?

---

## Scope Order (Build Sequence)

### WRONG Order

```
❌ Social graph → Activity recording → Workout logging → Standards
```

### RIGHT Order

```
✅ Career Standards (differentiator) →
   Team Readiness (enterprise) →
   Safety Features (trust) →
   Activity Recording (expected) →
   Social enhancements (engagement)
```

### Dependencies to Respect

| Don't Build | Until You Have |
|-------------|----------------|
| Route sharing | Activity recording |
| Social challenges | Activity recording + Missions framework |
| Team analytics | Unit Readiness + Activity recording |
| ML-based recommendations | 50k+ workout dataset |
| Premium tiers | Core feature adoption |

---

## UX Anti-Patterns

### DO NOT Require

| Don't Require | For | Reason |
|---------------|-----|--------|
| Location to log workout | Gym workouts | Users shouldn't need GPS for bench press |
| Account to view standards | Browsing | Let users see value before signup |
| Social connection to use app | Core features | We're not a social network first |
| Always-on connectivity | Core features | Austere environments |
| Premium for basic features | Workout logging | Credit system for premium only |

### DO NOT Default To

| Don't Default | Instead Default |
|---------------|-----------------|
| Public activities | Private |
| Location sharing | Off |
| Activity posting | Private |
| Real-time location | Never auto-enable |
| Data sharing with team | Explicit opt-in |
| Push notifications | Conservative defaults |

### DO NOT Design

| Anti-Pattern | Why | Alternative |
|--------------|-----|-------------|
| Gamification that rewards overtraining | Safety hazard | Recovery-aware rewards |
| Leaderboards that discourage beginners | Alienates new users | Cohort-based leaderboards |
| Streaks that punish rest days | Poor periodization | Recovery streaks |
| Features requiring constant phone checking | Bad UX | Set-and-forget features |
| Complex multi-tap workflows | Touchscreen-unfriendly | One-tap actions |
| Small tap targets | Accessibility issue | 44px minimum |
| Modals during workout | Interrupts flow | Post-workout prompts |

---

## Technical Anti-Patterns

### DO NOT Use

| Anti-Pattern | Reason | Use Instead |
|--------------|--------|-------------|
| Express | Not our stack | Fastify |
| Nginx | Not our stack | Caddy |
| SQLite in production | Not our stack | PostgreSQL |
| Docker | Adds complexity for VPS | Direct deployment |
| GraphQL-only | REST is simpler for most endpoints | REST + optional GraphQL |
| Redux | Overkill for our state | Zustand or React context |
| Moment.js | Deprecated | date-fns |
| jQuery | Not modern React | Native React |
| Class components | Outdated pattern | Functional components + hooks |

### DO NOT Implement

| Don't Implement | Why | Alternative |
|-----------------|-----|-------------|
| Custom auth system | Security risk | Existing JWT implementation |
| Custom rate limiter | Reinventing wheel | Native module already built |
| Custom geohashing | Reinventing wheel | Native module already built |
| Email from API server | Deliverability issues | Use email service (Resend, etc.) |
| File storage on VPS | Not scalable | S3 or similar |
| Background jobs in API process | Reliability | Separate worker process |

### DO NOT Skimp On

| Don't Skip | Reason |
|------------|--------|
| TypeScript strict mode | Type safety |
| Input validation | Security |
| Rate limiting on public endpoints | DoS protection |
| Parameterized SQL queries | SQL injection prevention |
| Output encoding | XSS prevention |
| Auth on all private endpoints | Data protection |
| Audit logging for sensitive actions | Compliance |

---

## Privacy Anti-Patterns

### DO NOT Collect

| Data | Reason | If Needed |
|------|--------|-----------|
| Precise home location | Privacy risk | Only for Safe Zones (user-defined) |
| Social graph from contacts | Overreach | User explicitly adds contacts |
| Device identifiers | Privacy regulations | Only for device verification |
| Browsing history | Not relevant | N/A |
| Other app data | Privacy violation | N/A |

### DO NOT Share

| Data | With | Reason |
|------|------|--------|
| Individual workout data | Team without consent | Privacy violation |
| Location data | Anyone by default | OPSEC concerns |
| Fitness metrics | Public leaderboards without opt-in | Privacy |
| Email addresses | Other users | Privacy |
| Assessment results | Anyone without consent | Sensitive career data |

### DO NOT Store

| Data | For | Reason |
|------|-----|--------|
| Location data after Lifeline ends | Future use | Privacy by design |
| Precise GPS routes | Longer than needed | Data minimization |
| Deleted user data | Any purpose | GDPR compliance |
| Unverified email addresses | Marketing | CAN-SPAM compliance |

---

## Business Anti-Patterns

### DO NOT Pursue

| Opportunity | Reason |
|-------------|--------|
| Advertising revenue | Conflicts with privacy focus |
| Selling user data | Violates trust |
| Aggressive monetization | Alienates tactical users |
| Venture capital (maybe) | May compromise mission |
| Feature parity with Strava | Not our value proposition |

### DO NOT Neglect

| Priority | Why |
|----------|-----|
| Core fitness features | Foundation |
| Privacy controls | Trust with target users |
| Offline capability | Critical for tactical users |
| Performance | Users expect snappy apps |
| Documentation | Developer velocity |

### DO NOT Launch Without

| Requirement | Why |
|-------------|-----|
| Privacy policy | Legal requirement |
| Terms of service | Legal requirement |
| Data export capability | GDPR compliance |
| Account deletion | GDPR compliance |
| Accessibility basics | Inclusion |
| Error handling | User experience |

---

## Communication Anti-Patterns

### DO NOT Say

| Avoid | Why | Say Instead |
|-------|-----|-------------|
| "Like Strava but..." | Defines us by competitor | "Fitness for careers that demand physical readiness" |
| "Gamified fitness" | Minimizes our science | "Evidence-based training" |
| "Social fitness app" | Not our primary identity | "Career fitness platform" |
| "Military-grade" | Overused, cliché | "Built for first responders and military" |
| "AI-powered" | Buzzword | "Personalized prescriptions" |

### DO NOT Market To

| Audience | Reason | Focus Instead |
|----------|--------|---------------|
| Casual fitness | Not our differentiation | Career fitness users |
| Cyclists/runners primarily | Strava owns this | Strength + tactical users |
| Aesthetics-focused | Not our value | Functional fitness |
| Already using Strava heavily | Hard to convert | Strava non-users |

### DO NOT Ignore

| Feedback | Why |
|----------|-----|
| Privacy concerns | Core to our users |
| Feature requests from tactical users | Our target market |
| Accessibility complaints | Important for inclusion |
| Performance issues | User retention |

---

## Competitor Response

### DO NOT React To

| Competitor Action | Our Response |
|-------------------|--------------|
| New feature launch | Stay focused on our roadmap |
| Price changes | Stick to our credit model |
| Marketing campaigns | Focus on word-of-mouth |
| Bad press | Don't pile on |

### DO NOT Copy

| Competitor Feature | Why Not | Our Approach |
|--------------------|---------|--------------|
| Route segments | Not our differentiation | Focus on standards |
| Social features | Not primary value | Hangouts-based community |
| Subscription tiers | Credits work better | Keep credit model |
| Gamification badges | Hollow without meaning | Career-relevant achievements |

---

## Summary Checklist

Before building any feature, ask:

- [ ] Is this core to our differentiation (career fitness, physiology)?
- [ ] Does this serve tactical/first responder users?
- [ ] Is privacy protected by default?
- [ ] Does it work offline?
- [ ] Is it achievable in one tap?
- [ ] Does it use our terminology (not competitor's)?
- [ ] Can we build it simply first?
- [ ] Do we have the data to support it?
- [ ] Is it in our roadmap priority order?
- [ ] Does it pass the "would a firefighter need this?" test?

If any answer is "no," reconsider building it.

---

*End of Do Not Do List*
