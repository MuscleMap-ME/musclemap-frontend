# XP Velocity Limits

The MuscleMap XP (experience point) system includes velocity limits to prevent abuse while allowing legitimate heavy usage.

## Purpose

Velocity limits serve as an anti-cheat mechanism to prevent:
- Automated bots from farming XP
- Exploitation of bugs to gain unlimited XP
- Unfair advantages in leaderboards

## Current Limits

| Limit | Value | Description |
|-------|-------|-------------|
| `MAX_PER_DAY` | 2,000 XP | Maximum XP earnable in a single calendar day |
| `MAX_PER_HOUR` | 500 XP | Maximum XP earnable in a rolling 60-minute window |
| `MAX_PER_WORKOUT` | 200 XP | Maximum XP from a single workout completion |
| `COOLDOWN_MINUTES` | 1 min | Minimum time between same-source XP awards |

## XP Sources and Amounts

| Activity | XP Amount | Notes |
|----------|-----------|-------|
| Workout (base) | 25 XP | Base award for completing any workout |
| Workout duration bonus | +5 XP / 10 min | Additional XP for longer workouts |
| Goal complete | 50 XP | Completing a set goal |
| Archetype level up | 100 XP | Leveling up an archetype |
| Archetype complete | 500 XP | Fully mastering an archetype |
| Daily streak | 10 XP / day | Maintaining workout streak |
| 7-day streak bonus | 50 XP | One-time bonus at 7 days |
| 30-day streak bonus | 200 XP | One-time bonus at 30 days |
| 100-day streak bonus | 500 XP | One-time bonus at 100 days |
| Achievement (common) | 25 XP | Common achievements |
| Achievement (uncommon) | 50 XP | Uncommon achievements |
| Achievement (rare) | 100 XP | Rare achievements |
| Achievement (epic) | 200 XP | Epic achievements |
| Achievement (legendary) | 500 XP | Legendary achievements |
| First workout | 100 XP | One-time bonus for first workout |

## Owner Account Bypass

**Owner accounts bypass all velocity limits.** This allows the site owner to:
- Test the XP system without restrictions
- Verify limit enforcement is working correctly
- Demo features without hitting artificial caps

To identify owner accounts, the system checks for the `owner` role in the user's `roles` array.

## Implementation Details

The velocity check occurs in `apps/api/src/modules/ranks/xp.service.ts`:

```typescript
// Check if user is owner - owners bypass all velocity limits
const user = await queryOne<{ roles: string[] }>(
  'SELECT roles FROM users WHERE id = $1',
  [userId]
);

if (user?.roles?.includes('owner')) {
  return { allowed: true };
}
```

## Database Tables

| Table | Purpose |
|-------|---------|
| `xp_history` | Records all XP awards with timestamps |
| `users.total_xp` | Cached total XP for quick lookups |
| `users.current_rank` | Current rank based on total XP |

## Rank Thresholds

XP maps to ranks via the `rank_definitions` table:

| Rank | Min XP |
|------|--------|
| Novice | 0 |
| Apprentice | 500 |
| Journeyman | 2,000 |
| Expert | 5,000 |
| Master | 10,000 |
| Grandmaster | 25,000 |
| Legend | 50,000 |

## Testing

Run the data integrity tests to verify XP system consistency:

```bash
pnpm -C apps/api test:integrity
```

This checks:
- All users have non-negative `total_xp`
- XP history entries have positive amounts
- User `total_xp` matches sum of `xp_history`
- User `current_rank` matches their XP level

## Monitoring

Admins can monitor XP activity via:
- `/api/admin-control/audit/credits` - Economy audit endpoint
- `/empire` - Empire Control dashboard
- Database queries on `xp_history` table

## Troubleshooting

### User reports XP not increasing

1. Check if they've hit daily limits: `SELECT SUM(amount) FROM xp_history WHERE user_id = ? AND created_at >= CURRENT_DATE`
2. Verify they're not hitting cooldown for same-source awards
3. Check for errors in API logs

### User has incorrect rank

1. Run stats recalculation: `POST /api/stats/recalculate`
2. Verify `total_xp` matches `xp_history` sum
3. Check `rank_definitions` table for correct thresholds
