# Native C Extensions

MuscleMap uses native C code for performance-critical operations. These extensions provide 10-100x speedups over pure JavaScript implementations.

## Constraint Solver

The workout prescription engine uses a high-performance C-based constraint solver.

### Location

```
apps/api/native/
├── binding.gyp           # Node-GYP build configuration
├── src/
│   └── constraint-solver.c   # Main C implementation
├── index.ts              # TypeScript wrapper with JS fallback
└── package.json
```

### Build System

Uses Node-GYP with optimized compiler flags:

```gyp
{
  "targets": [{
    "target_name": "constraint_solver",
    "sources": ["src/constraint-solver.c"],
    "cflags": ["-O3", "-march=native", "-ffast-math"],
    "include_dirs": ["<!@(node -p \"require('node-addon-api').include\")"]
  }]
}
```

### Key Optimizations

1. **SIMD-Friendly Data Layout**
   - Contiguous memory for cache efficiency
   - Aligned structures for vectorization
   - Float arrays for activation data

2. **Cache-Optimized Scoring**
   - Hot path marked with `__attribute__((hot))`
   - Branch prediction hints
   - Minimal memory allocations

3. **Bitmask Operations**
   - Equipment checking via bitwise AND
   - Location filtering via bitmasks
   - Exercise exclusion via 512-bit bitmask array

4. **Memory Pooling**
   - Static exercise cache (up to 500 exercises)
   - Pre-allocated scoring arrays
   - Zero heap allocations in hot path

### Data Structures

```c
// Exercise cache (500 max)
typedef struct {
    int32_t id;
    int32_t difficulty;           // 1-5
    int32_t is_compound;          // 0 or 1
    int32_t movement_pattern;     // enum: push, pull, squat, hinge, carry, core, isolation
    int32_t estimated_seconds;
    int32_t rest_seconds;
    float activations[50];        // Activation % for each muscle
    int32_t primary_muscles_mask; // Bitmask
    int32_t locations_mask;       // Bitmask
    int32_t equipment_required_mask;
} Exercise;

// Solver request
typedef struct {
    int32_t time_available_seconds;
    int32_t location;             // enum: gym, home, park, hotel, office, travel
    int32_t equipment_mask;
    int32_t goals_mask;           // strength, hypertrophy, endurance, mobility, fat_loss
    int32_t fitness_level;        // beginner, intermediate, advanced
    int32_t excluded_exercises_mask[16];  // Up to 512 exercises
    int32_t excluded_muscles_mask;
    int32_t recent_24h_muscles_mask;
    int32_t recent_48h_muscles_mask;
    ScoringWeights weights;
} SolverRequest;

// Scoring weights
typedef struct {
    float goal_alignment;         // +10 for matching goal patterns
    float compound_preference;    // +5 for compound exercises
    float recovery_penalty_24h;   // -20 for recently worked muscles
    float recovery_penalty_48h;   // -10 for muscles worked 24-48h ago
    float fitness_level_match;    // +5 for appropriate difficulty
    float muscle_coverage_gap;    // +15 for uncovered muscles
} ScoringWeights;
```

### N-API Functions

| Function | Description |
|----------|-------------|
| `initExercises(exercises[])` | Load exercise data into native cache |
| `solve(request)` | Generate optimal workout prescription |
| `scoreBatch(indices[], request)` | Score multiple exercises (debugging) |
| `getExerciseCount()` | Return cached exercise count |

### JavaScript Integration

```typescript
// apps/api/native/index.ts
import bindings from 'bindings';

let nativeSolver: NativeSolver | null = null;

try {
  nativeSolver = bindings('constraint_solver');
} catch (e) {
  console.warn('Native solver unavailable, using JS fallback');
}

export function initExercises(exercises: Exercise[]): number {
  if (nativeSolver) {
    return nativeSolver.initExercises(prepareForNative(exercises));
  }
  return initExercisesJS(exercises);
}

export function solve(request: SolverRequest): SolverResult[] {
  if (nativeSolver) {
    return nativeSolver.solve(request);
  }
  return solveJS(request);
}
```

### Fallback Behavior

The native module gracefully falls back to JavaScript if:
- Native binaries aren't compiled
- Platform isn't supported
- Module loading fails

This ensures the application works everywhere while providing maximum performance where possible.

### Building Native Module

```bash
# Install build tools
npm install -g node-gyp

# Build for current platform
cd apps/api/native
node-gyp configure
node-gyp build

# Or via npm
npm run build:native
```

### Performance Comparison

| Operation | JavaScript | Native C | Speedup |
|-----------|------------|----------|---------|
| Filter 500 exercises | 2.1ms | 0.02ms | 105x |
| Score 100 exercises | 1.8ms | 0.05ms | 36x |
| Full prescription | 15ms | 0.8ms | 19x |

*Benchmarks on Apple M2, Node.js 20*

## NSFW Detection

Machine learning-based content moderation using TensorFlow.js.

### Location

```
apps/api/src/lib/nsfw-detector.ts
```

### Implementation

Uses NSFWJS with a pre-trained MobileNet model:

```typescript
import * as tf from '@tensorflow/tfjs-node';
import * as nsfwjs from 'nsfwjs';

class NSFWDetector {
  private model: nsfwjs.NSFWJS | null = null;

  async init(): Promise<void> {
    // Lazy load 200MB+ model
    this.model = await nsfwjs.load();
  }

  async classify(imageBuffer: Buffer): Promise<ClassificationResult> {
    const tensor = tf.node.decodeImage(imageBuffer, 3);
    try {
      const predictions = await this.model!.classify(tensor);
      return this.interpretResults(predictions);
    } finally {
      tensor.dispose(); // Prevent memory leaks
    }
  }
}
```

### Classification Thresholds

| Category | Block (>0.7) | Warn (>0.4) | Safe (<0.6) |
|----------|--------------|-------------|-------------|
| Porn | Block upload | Flag for review | Allow |
| Sexy | Block upload | Flag for review | Allow |
| Hentai | Block upload | Flag for review | Allow |
| Drawing | Allow | Allow | Allow |
| Neutral | Allow | Allow | Allow |

### Memory Management

- Lazy model loading to reduce startup time
- Explicit tensor disposal after each classification
- GPU memory cleanup on server shutdown

## Future Native Extensions

### Planned

1. **Muscle Activation Heatmap Generator**
   - GPU-accelerated image generation
   - WebGL shader compilation

2. **Workout Analytics**
   - Time-series analysis
   - Statistical calculations

3. **Compression**
   - Workout history compression
   - Image optimization

### Contributing

To add a new native extension:

1. Create directory in `apps/api/native/`
2. Add `binding.gyp` with targets
3. Implement N-API bindings
4. Create TypeScript wrapper with fallback
5. Add to build pipeline
