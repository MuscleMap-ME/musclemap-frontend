# QA Bug Tracker - Systematic Site Testing

**Session Started:** 2026-01-25
**Tester:** User + Claude Code
**Method:** Manual testing with React DevTools

---

## Testing Protocol

For each feature, check:
1. **Happy path** - Does normal usage work?
2. **Edge cases** - Empty states, long text, special characters
3. **Error handling** - What happens when things fail?
4. **Loading states** - Are there proper loading indicators?
5. **Mobile responsiveness** - Does it work on smaller screens?

Use React DevTools to inspect:
- Component state and props
- Hook values (especially Apollo queries)
- Console errors/warnings
- Network requests

---

## Bug Log

### Format
```
### BUG-XXX: [Short Description]
- **Location:** Page/Component where found
- **Steps to Reproduce:**
- **Expected:** What should happen
- **Actual:** What actually happens
- **DevTools Findings:** State/props/errors observed
- **Severity:** Critical/High/Medium/Low
- **Status:** Open/In Progress/Fixed/Verified
- **Fix Commit:** (added after fix)
```

---

## Discovered Bugs

(Bugs will be added here as testing progresses)

---

## Testing Checklist

### 1. Authentication
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (error message?)
- [ ] Register new account
- [ ] Register with existing email (error message?)
- [ ] Logout
- [ ] Session persistence (refresh page while logged in)
- [ ] Protected routes redirect when logged out

### 2. Onboarding & Profile
- [ ] Complete onboarding flow
- [ ] Skip onboarding (if possible)
- [ ] View own profile
- [ ] Edit profile (username, bio, avatar)
- [ ] View other user's profile
- [ ] Profile with no workouts/stats (empty states)

### 3. Workout Tracking
- [ ] Start a new workout
- [ ] Add exercises to workout
- [ ] Log sets (weight, reps)
- [ ] Rest timer functionality
- [ ] Complete workout
- [ ] Cancel/discard workout
- [ ] View workout history
- [ ] View workout details

### 4. Exercise Library
- [ ] Browse all exercises
- [ ] Search exercises
- [ ] Filter by muscle group
- [ ] View exercise details
- [ ] Exercise alternatives

### 5. Goals System
- [ ] View goals page
- [ ] Create new goal
- [ ] Edit existing goal
- [ ] Delete goal
- [ ] Goal progress tracking
- [ ] Goal suggestions

### 6. Social Features
- [ ] View activity feed
- [ ] Like/high-five posts
- [ ] Comment on posts
- [ ] View communities
- [ ] Join/leave community
- [ ] Send message
- [ ] View conversations
- [ ] Block/unblock user

### 7. Economy System
- [ ] View credit balance
- [ ] View transaction history
- [ ] Shop/store page
- [ ] Purchase item
- [ ] Earn credits (workout completion, etc.)

### 8. Stats & Progress
- [ ] View personal stats
- [ ] View charts/graphs
- [ ] View achievements
- [ ] View leaderboards
- [ ] View rankings

### 9. Settings
- [ ] View settings page
- [ ] Change theme (dark/light)
- [ ] Update notification preferences
- [ ] Update privacy settings
- [ ] Change units (kg/lbs)

### 10. Navigation & UI
- [ ] All nav links work
- [ ] Back button behavior
- [ ] 404 page for invalid routes
- [ ] Mobile menu
- [ ] Modals open/close properly
- [ ] Toast notifications appear

### 11. 3D Muscle Visualization
- [ ] Model loads
- [ ] Muscle highlighting works
- [ ] Camera controls (rotate, zoom)
- [ ] Performance (no lag)

---

## Summary

| Category | Tested | Bugs Found | Bugs Fixed |
|----------|--------|------------|------------|
| Authentication | | | |
| Onboarding | | | |
| Workouts | | | |
| Exercises | | | |
| Goals | | | |
| Social | | | |
| Economy | | | |
| Stats | | | |
| Settings | | | |
| Navigation | | | |
| 3D Model | | | |
| **TOTAL** | | | |

---

## Notes

(Any general observations, patterns, or suggestions)

