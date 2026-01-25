# Incremental Build Optimization Plan

## Goal

Maximize rsync delta transfer efficiency by producing **stable, content-addressable output files** during builds. When only a few source files change, only a few output files should change - enabling rsync to transfer just kilobytes instead of megabytes.

## Current Problem

```
Source Change: 1 file (10 lines)
         ↓
Traditional Build: Rebuilds ALL chunks
         ↓
Output Change: 50+ files changed (new hashes)
         ↓
Rsync Transfer: ~60MB (entire dist/)
```

## Target State

```
Source Change: 1 file (10 lines)
         ↓
Incremental Build: Rebuilds ONLY affected chunks
         ↓
Output Change: 2-3 files changed (stable hashes)
         ↓
Rsync Transfer: ~50KB (delta only)
```

---

## Optimization Strategies

### 1. Stable Content Hashing

**Problem**: Vite/Rollup uses non-deterministic hashes that change even when content doesn't.

**Solution**: Use content-based hashing with consistent ordering:

```javascript
// vite.config.js - Stable hash configuration
build: {
  rollupOptions: {
    output: {
      // Use content hash, not build-time hash
      hashCharacters: 'base36',
      // Ensure consistent module ordering for reproducible builds
      generatedCode: {
        constBindings: true,  // Use const instead of var
        arrowFunctions: true, // Consistent function syntax
      },
    },
  },
}
```

### 2. Granular Chunk Splitting

**Current**: Large chunks that change frequently
**Target**: Small, stable chunks based on change frequency

| Chunk Type | Description | Expected Stability |
|------------|-------------|-------------------|
| `vendor-stable` | React, React-DOM, Router | Changes ~never |
| `vendor-apollo` | Apollo Client, GraphQL | Changes rarely |
| `vendor-three-*` | Three.js split chunks | Changes rarely |
| `vendor-ui` | MUI, Emotion | Changes rarely |
| `feature-*` | Feature-specific code | Changes sometimes |
| `page-*` | Page components | Changes frequently |

### 3. Separate Static Assets

**Problem**: Images, fonts, and icons get re-hashed on every build.

**Solution**: Build static assets separately with content-based naming:

```bash
# Pre-build assets with stable names
public/
├── images/           # Served as-is (no hash)
├── fonts/            # Served as-is (no hash)
└── icons/            # Served as-is (no hash)

dist/assets/
├── [name]-[contenthash].js   # Only JS/CSS get hashes
└── [name]-[contenthash].css
```

### 4. Module Federation for Large Vendors

**Problem**: Three.js, D3, etc. are huge and rarely change.

**Solution**: Build heavy vendors as separate "remote" bundles:

```javascript
// Heavy vendors built once, cached indefinitely
.vendor-cache/
├── three.esm.js       # ~650KB, rebuilt only when upgraded
├── d3.esm.js          # ~150KB, rebuilt only when upgraded
├── recharts.esm.js    # ~300KB, rebuilt only when upgraded
└── leaflet.esm.js     # ~150KB, rebuilt only when upgraded
```

### 5. Hierarchical Chunk Groups

**Strategy**: Organize chunks in a dependency hierarchy so that changes propagate minimally:

```
Level 0 (Core - never changes):
  └── react-vendor.js (React, ReactDOM, Router)

Level 1 (Framework - rarely changes):
  └── apollo-vendor.js (Apollo, GraphQL)
  └── ui-vendor.js (MUI, Emotion)

Level 2 (Features - sometimes changes):
  └── three-core.js
  └── three-render.js
  └── three-extras.js
  └── recharts-vendor.js
  └── leaflet-vendor.js

Level 3 (App - frequently changes):
  └── feature-workout.js
  └── feature-profile.js
  └── feature-hangouts.js

Level 4 (Pages - most frequent changes):
  └── page-landing.js
  └── page-dashboard.js
  └── page-settings.js
```

---

## Implementation Plan

### Phase 1: Stable Hash Configuration (Immediate)

1. Configure Vite for deterministic builds:
   - Set `build.rollupOptions.output.hashCharacters` to 'base36'
   - Enable `generatedCode.constBindings` for consistent output
   - Sort module imports for reproducible ordering

2. Add build manifest tracking:
   - Generate `.intelligent-cache/build-manifest.json` with file→chunk mapping
   - Compare manifests to detect actual changes

### Phase 2: Granular Chunk Splitting (This Week)

1. Split large vendor chunks into smaller, more stable pieces
2. Create feature-specific chunks that only include necessary code
3. Ensure page components are in their own chunks

### Phase 3: Static Asset Separation (This Week)

1. Move all static assets to `public/` (no build processing)
2. Configure Vite to skip hashing for stable assets
3. Use long cache headers for static assets

### Phase 4: Vendor Pre-bundling (Next Week)

1. Expand `.vendor-cache/` system to include all heavy dependencies
2. Build vendors separately and only update when `package.json` changes
3. Reference pre-built vendors in main build

---

## Rsync Delta Transfer Mechanics

### How rsync Delta Works

```
rsync -rvz --delete -e "ssh -p 2222" dist/ server:/var/www/dist/

1. rsync checksums all source files (local)
2. rsync sends checksums to destination
3. destination compares checksums
4. only CHANGED BLOCKS are transferred
5. destination reconstructs files from local + received blocks
```

### Maximizing Delta Efficiency

For rsync delta to work optimally:

| Requirement | Why It Matters |
|-------------|----------------|
| Same filename | rsync matches by name first |
| Similar content | Delta only helps if content is similar |
| Content-based hash | Same content = same filename |
| Consistent ordering | Module order affects final bytes |

### Expected Bandwidth Savings

| Scenario | Before (avz) | After (rvz + stable hashes) |
|----------|-------------|---------------------------|
| No changes | ~60MB (full copy) | ~0KB (instant) |
| 1 file change | ~60MB (full copy) | ~50KB (delta) |
| 10 file changes | ~60MB (full copy) | ~200KB (delta) |
| New feature | ~60MB (full copy) | ~2MB (new chunks only) |
| Dependency update | ~60MB (full copy) | ~5-10MB (vendor chunk only) |

---

## Monitoring & Validation

### Build Analysis Script

```bash
# Compare builds to validate stability
./scripts/analyze-build-stability.sh

# Output:
# Files unchanged: 45/50 (90%)
# Files modified: 3/50 (6%)
# Files new: 2/50 (4%)
# Estimated rsync transfer: 127KB
```

### Rsync Dry-Run Testing

```bash
# Test rsync without actually transferring
rsync -rvzn --delete -e "ssh -p 2222" dist/ server:/var/www/dist/

# -n = dry-run (don't transfer, just show what would change)
```

### Metrics to Track

1. **Build Stability Score**: % of chunks unchanged between builds
2. **Delta Transfer Size**: Bytes actually transferred by rsync
3. **Build Time**: Should stay constant or improve
4. **Cache Hit Rate**: How often we skip rebuilding

---

## Files to Modify

| File | Changes |
|------|---------|
| `vite.config.js` | Stable hashing, granular chunks |
| `scripts/intelligent-cache.mjs` | Track chunk stability |
| `scripts/analyze-build-stability.sh` | New - compare builds |
| `CLAUDE.md` | Document new rsync workflow |

---

## Success Criteria

1. **90%+ chunk stability** when changing 1-5 source files
2. **<500KB rsync transfer** for typical code changes
3. **No increase in build time**
4. **Reproducible builds** - same source = same output
