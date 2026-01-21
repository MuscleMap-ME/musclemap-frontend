# Migration Remediation Plan

**Created:** 2026-01-20
**Status:** Pending Implementation
**Priority:** Medium (does not block functionality, but blocks clean deployments)

## Executive Summary

The migration validation system has detected 4 categories of issues across 137 migrations:

| Category | Count | Severity | Fix Complexity |
|----------|-------|----------|----------------|
| Destructive operations without acknowledgment | 87 | Warning | Low (add comments) |
| Missing `down()` functions | 25 | Warning | Medium (assess each) |
| SQL injection pattern warnings | 49 | False Positive | Low (verify & suppress) |
| Migration number gaps | 5 | Info | None (acceptable) |

## Understanding the Issues

### 1. Destructive Operations Without Acknowledgment (87 migrations)

**What it means:** Migrations that use `DROP TABLE`, `DROP COLUMN`, `ALTER TYPE`, etc. without a `// DESTRUCTIVE: <reason>` comment.

**Why it matters:** The validation script wants explicit acknowledgment that destructive operations are intentional, preventing accidental data loss during deploys.

**Affected migrations:**
- 021-026, 028-032, 039-044, 046-059, 061-069, 076-078, 081, 083-086, 088, 091-093, 095-107, 109-113, 115-117, 120, 122, 124-125, 127-137

**Fix approach:** Add comment `// DESTRUCTIVE: <reason>` to each migration explaining why the destructive operation is necessary.

### 2. Missing `down()` Functions (25 migrations)

**What it means:** These migrations can't be rolled back because they don't implement a `down()` function.

**Why it matters:** In production, you may need to rollback a migration if it causes issues.

**Affected migrations:**
```
001_add_trial_and_subscriptions.ts
002_community_dashboard.ts
003_messaging.ts
004_exercise_equipment_locations.ts
005_tips_and_milestones.ts
006_performance_optimization.ts
007_feature_expansion.ts
008_character_stats.ts
009_issue_tracker.ts
020_scale_indexes.ts
033_journey_hierarchy.ts
034_milestones.ts
035_competition.ts
036_onboarding_intents.ts
037_future_modules.ts
038_enhanced_seed_data.ts
042_user_signing_secrets.ts
043_skill_progression_trees.ts
044_martial_arts.ts
068_expanded_archetypes.ts
070_enhanced_workout_tracking.ts
077_organization_readiness.ts
079_ems_career_standards.ts
118_complete_archetypes.ts
119_active_workout_sessions.ts
```

**Fix approach:** For each migration, determine if:
- A `down()` is feasible and valuable → Implement it
- The migration is irreversible by nature (seed data, one-way transforms) → Add comment `// IRREVERSIBLE: <reason>`
- The migration is too old/risky to add `down()` → Leave as-is, document

### 3. SQL Injection Pattern Warnings (49 migrations)

**What it means:** The validator detected patterns like template literals or string interpolation that COULD be SQL injection vectors.

**Why these are likely false positives:** In migration files, we control all the strings - there's no user input. The patterns detected are probably:
- Template literals for readability: `` `CREATE INDEX...` ``
- Seed data with dynamic values
- Raw SQL in `knex.raw()` calls

**Affected migrations:** (49 files - mostly index creation and seed data)

**Fix approach:**
1. Review each flagged file
2. Confirm no external input is used
3. Either refactor to use parameterized queries OR add comment `// SQL-SAFE: no external input`

### 4. Migration Number Gaps (5 gaps)

**What it means:** There are gaps in the sequential numbering before migrations 020, 028, 076, 109, 115.

**Why it's acceptable:** These gaps likely occurred from:
- Deleted migrations during development
- Merged branches with overlapping numbers
- Re-organized migrations

**Fix approach:** No fix needed - gaps are cosmetic and don't affect functionality.

---

## Remediation Plan

### Phase 1: Quick Wins (Estimated: 30 minutes)

Add `// DESTRUCTIVE:` comments to all 87 flagged migrations. This can be automated.

**Script approach:**
```bash
# For each migration with DROP/ALTER:
# 1. Find the line with destructive operation
# 2. Add comment above it explaining why
```

**Example fixes:**
```typescript
// Before:
await knex.schema.dropTable('old_table');

// After:
// DESTRUCTIVE: Removing legacy table that was replaced in migration 040
await knex.schema.dropTable('old_table');
```

### Phase 2: SQL Injection Review (Estimated: 1 hour)

Review each of the 49 flagged migrations for actual SQL injection risks.

**Categories to identify:**
1. **Safe raw SQL** - Template literals with no variables: Mark as `// SQL-SAFE: static SQL`
2. **Seed data** - Hardcoded values: Mark as `// SQL-SAFE: no user input`
3. **Actual concerns** - If any use external input: Refactor to parameterized

**Script to generate review list:**
```bash
for file in $(./scripts/deployment/validate-migrations.sh 2>&1 | grep "SQL injection" -A 999 | grep "\.ts" | head -49); do
  echo "=== $file ==="
  grep -n "raw\|template literal patterns" apps/api/src/db/migrations/$file | head -5
done
```

### Phase 3: Down Migration Assessment (Estimated: 2 hours)

For each of the 25 migrations without `down()`:

| Migration | Assessment | Action |
|-----------|------------|--------|
| 001-009 | Old foundational tables | Add `down()` if feasible |
| 020 | Index creation only | Add `down()` to drop indexes |
| 033-038 | Feature tables | Add `down()` to drop tables |
| 042-044 | Security/feature tables | Add `down()` with caution |
| 068, 070, 077, 079 | Career/archetype data | May be `IRREVERSIBLE` (seed data) |
| 118-119 | Recent additions | Should have `down()` |

**For irreversible migrations, add comment:**
```typescript
// IRREVERSIBLE: This migration adds seed data that cannot be safely removed
// without corrupting user references

export async function down(): Promise<void> {
  throw new Error('This migration is intentionally irreversible');
}
```

---

## Implementation Steps

### Step 1: Create Automation Script

```bash
#!/bin/bash
# scripts/fix-migration-warnings.sh

# Add DESTRUCTIVE comments
for file in apps/api/src/db/migrations/*.ts; do
  if grep -q "dropTable\|dropColumn\|alterColumn" "$file"; then
    if ! grep -q "// DESTRUCTIVE:" "$file"; then
      echo "Adding DESTRUCTIVE comment to $file"
      # Add comment before first destructive operation
    fi
  fi
done

# Add SQL-SAFE comments
for file in apps/api/src/db/migrations/*.ts; do
  if grep -q "knex.raw\|template literal" "$file"; then
    if ! grep -q "// SQL-SAFE:" "$file"; then
      echo "Review needed for $file"
    fi
  fi
done
```

### Step 2: Batch Fix Destructive Migrations

Run the script in dry-run mode first, then apply.

### Step 3: Manually Review SQL Injection Flags

For each flagged file, verify no external input is used.

### Step 4: Add Down Migrations

For migrations that should be reversible, add proper `down()` functions.

### Step 5: Update Validation Script

Consider adding suppressions for known-safe patterns.

---

## Acceptance Criteria

When complete, `./scripts/deployment/validate-migrations.sh` should:
- ✅ Pass with 0 errors
- ✅ Pass with 0 warnings (or only acceptable warnings)
- ✅ Allow clean deployments without `--no-verify`

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing migrations | Low | High | Test each change locally first |
| Adding broken `down()` | Medium | Medium | Only add if fully tested |
| Missing actual SQL injection | Low | High | Manual review of each file |

---

## Timeline

| Phase | Time | Priority |
|-------|------|----------|
| Phase 1: DESTRUCTIVE comments | 30 min | Can do now |
| Phase 2: SQL injection review | 1 hour | Can do now |
| Phase 3: Down migrations | 2 hours | Schedule for later |

**Recommendation:** Start with Phase 1 and 2 (automation-friendly), defer Phase 3 until there's a specific need for rollback capability.

---

## Notes

- The migration validation is a GATE for clean deployments, not a blocker for functionality
- Using `git commit --no-verify` bypasses these checks but is not recommended for normal development
- All existing migrations have already run in production - these fixes are for future maintainability
