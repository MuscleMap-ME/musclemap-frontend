# Biometric Inputs & Future Integrations

This document outlines the architecture for integrating biometric data into MuscleMap, providing a roadmap for future-proofing the platform against upcoming wearable technologies and health data sources.

## Overview

MuscleMap is designed to accept and process biometric data from multiple sources to enhance workout personalization, recovery recommendations, and progress tracking. The architecture supports both real-time streaming and batch synchronization patterns.

## Data Sources

### Current Support

| Source | Status | Data Types |
|--------|--------|------------|
| Manual Input | Active | Weight, measurements, RPE |
| Workout Logging | Active | Sets, reps, rest periods |

### Planned Integrations

| Source | Priority | Data Types | Integration Method |
|--------|----------|------------|-------------------|
| Apple HealthKit | High | Heart rate, HRV, sleep, calories | iOS SDK |
| Google Fit | High | Heart rate, steps, sleep | REST API |
| Garmin Connect | Medium | HR zones, training load, recovery | OAuth API |
| Whoop | Medium | Strain, recovery, sleep | OAuth API |
| Oura Ring | Medium | Readiness, sleep, HRV | OAuth API |
| Fitbit | Medium | Heart rate, sleep, SpO2 | OAuth API |
| Polar | Low | Training load, orthostatic test | OAuth API |
| Samsung Health | Low | Heart rate, stress, SpO2 | REST API |

---

## Biometric Data Model

### Core Metrics

```typescript
interface BiometricReading {
  id: string;
  userId: string;
  source: BiometricSource;
  metric: BiometricMetric;
  value: number;
  unit: string;
  timestamp: Date;
  confidence?: number;        // 0-1, device-reported accuracy
  metadata?: Record<string, unknown>;
}

type BiometricSource =
  | 'manual'
  | 'apple_health'
  | 'google_fit'
  | 'garmin'
  | 'whoop'
  | 'oura'
  | 'fitbit'
  | 'polar'
  | 'samsung'
  | 'plugin';                 // Third-party plugin

type BiometricMetric =
  // Body Composition
  | 'weight'
  | 'body_fat_percentage'
  | 'muscle_mass'
  | 'bone_mass'
  | 'water_percentage'
  | 'visceral_fat'
  | 'bmr'                     // Basal metabolic rate
  // Cardiovascular
  | 'resting_heart_rate'
  | 'heart_rate'
  | 'hrv_rmssd'               // Heart rate variability
  | 'hrv_sdnn'
  | 'blood_pressure_systolic'
  | 'blood_pressure_diastolic'
  | 'spo2'                    // Blood oxygen
  | 'respiratory_rate'
  // Recovery
  | 'sleep_duration'
  | 'sleep_quality'           // 0-100 score
  | 'deep_sleep_duration'
  | 'rem_sleep_duration'
  | 'sleep_latency'
  | 'recovery_score'          // Platform-specific (Whoop, etc.)
  | 'readiness_score'
  // Activity
  | 'steps'
  | 'active_calories'
  | 'total_calories'
  | 'training_load'
  | 'strain_score'
  // Measurements
  | 'chest_circumference'
  | 'waist_circumference'
  | 'hip_circumference'
  | 'arm_circumference'
  | 'thigh_circumference'
  | 'calf_circumference'
  | 'neck_circumference';
```

### Database Schema

```sql
-- Core biometric readings table
CREATE TABLE biometric_readings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  source TEXT NOT NULL,
  metric TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  confidence NUMERIC,
  metadata JSONB,
  UNIQUE(user_id, source, metric, recorded_at)
);

-- Indexes for common queries
CREATE INDEX idx_bio_user_metric ON biometric_readings(user_id, metric);
CREATE INDEX idx_bio_user_time ON biometric_readings(user_id, recorded_at DESC);
CREATE INDEX idx_bio_source ON biometric_readings(source, synced_at);

-- Connected health platforms
CREATE TABLE health_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  platform TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  sync_enabled BOOLEAN DEFAULT true,
  permissions TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Aggregated daily summaries
CREATE TABLE biometric_daily_summary (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  avg_resting_hr NUMERIC,
  avg_hrv NUMERIC,
  sleep_score NUMERIC,
  recovery_score NUMERIC,
  training_readiness NUMERIC,
  steps INTEGER,
  active_calories INTEGER,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);
```

---

## Integration Architecture

### OAuth Flow

```
┌─────────┐     ┌───────────────┐     ┌────────────────┐
│  User   │────▶│ MuscleMap UI  │────▶│ /auth/connect  │
└─────────┘     └───────────────┘     └───────┬────────┘
                                              │
                                              ▼
                                    ┌────────────────────┐
                                    │ Platform OAuth URL │
                                    │ (Garmin, Whoop...) │
                                    └─────────┬──────────┘
                                              │
                                              ▼
                                    ┌────────────────────┐
                                    │ User authorizes    │
                                    └─────────┬──────────┘
                                              │
                                              ▼
                                    ┌────────────────────┐
                                    │ Callback with code │
                                    │ /auth/callback     │
                                    └─────────┬──────────┘
                                              │
                                              ▼
                                    ┌────────────────────┐
                                    │ Exchange for token │
                                    │ Store in DB        │
                                    └─────────┬──────────┘
                                              │
                                              ▼
                                    ┌────────────────────┐
                                    │ Initial sync       │
                                    │ Schedule recurring │
                                    └────────────────────┘
```

### Sync Patterns

#### Pull-Based Sync
Most platforms require periodic polling:

```typescript
interface SyncJob {
  userId: string;
  platform: BiometricSource;
  lastSyncAt: Date;
  syncInterval: number;  // minutes
}

// Scheduled sync job (runs every 15 minutes)
async function syncBiometrics(job: SyncJob) {
  const connection = await getConnection(job.userId, job.platform);
  if (!connection.syncEnabled) return;

  const client = createPlatformClient(job.platform, connection);
  const since = job.lastSyncAt || subDays(new Date(), 7);

  const readings = await client.fetchReadings(since);
  await storeBiometricReadings(job.userId, readings);

  await updateLastSync(job.userId, job.platform);
}
```

#### Push-Based Webhooks
Some platforms support real-time updates:

```typescript
// POST /webhooks/garmin
app.post('/webhooks/garmin', async (req, res) => {
  const { userId, activities, wellness } = req.body;

  if (wellness) {
    await processBiometricWebhook('garmin', userId, wellness);
  }

  res.status(200).send('OK');
});
```

---

## API Endpoints

### Health Connections

```
GET  /health/connections           # List connected platforms
POST /health/connect/:platform     # Initiate OAuth flow
GET  /health/callback/:platform    # OAuth callback
POST /health/disconnect/:platform  # Revoke access
POST /health/sync/:platform        # Force manual sync
```

### Biometric Data

```
GET  /biometrics                   # Get readings (filterable)
GET  /biometrics/latest            # Get latest values per metric
GET  /biometrics/summary           # Get daily/weekly summaries
POST /biometrics                   # Manual entry
GET  /biometrics/trends/:metric    # Get trend analysis
```

### Query Parameters

```typescript
interface BiometricsQuery {
  metrics?: BiometricMetric[];  // Filter by metrics
  sources?: BiometricSource[];  // Filter by sources
  from?: Date;                  // Start date
  to?: Date;                    // End date
  limit?: number;               // Max results
  aggregation?: 'raw' | 'hourly' | 'daily' | 'weekly';
}
```

---

## Recovery & Readiness Scoring

### Training Readiness Algorithm

MuscleMap computes a training readiness score (0-100) based on available biometric data:

```typescript
interface ReadinessFactors {
  sleepScore: number;         // Weight: 30%
  hrvStatus: number;          // Weight: 25%
  restingHRStatus: number;    // Weight: 15%
  recoveryTime: number;       // Weight: 20% (hours since last workout)
  muscleRecovery: number;     // Weight: 10% (based on TU decay)
}

function computeReadinessScore(factors: ReadinessFactors): number {
  const weights = {
    sleepScore: 0.30,
    hrvStatus: 0.25,
    restingHRStatus: 0.15,
    recoveryTime: 0.20,
    muscleRecovery: 0.10,
  };

  let score = 0;
  let totalWeight = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const value = factors[key as keyof ReadinessFactors];
    if (value !== undefined && value !== null) {
      score += value * weight;
      totalWeight += weight;
    }
  }

  // Normalize if some factors are missing
  return totalWeight > 0 ? Math.round((score / totalWeight) * 100) / 100 : null;
}
```

### HRV Status Interpretation

```typescript
function interpretHRV(
  currentHRV: number,
  baseline7Day: number,
  baseline30Day: number
): number {
  // Score 0-100 based on deviation from baseline
  const deviation7 = (currentHRV - baseline7Day) / baseline7Day;
  const deviation30 = (currentHRV - baseline30Day) / baseline30Day;

  // Positive deviation = better recovery
  // Weight recent baseline more heavily
  const combinedDeviation = (deviation7 * 0.7) + (deviation30 * 0.3);

  // Map to 0-100 scale
  // -20% deviation = 0, 0% = 50, +20% = 100
  return Math.max(0, Math.min(100, 50 + (combinedDeviation * 250)));
}
```

---

## Workout Prescription Integration

Biometric data influences workout generation:

```typescript
interface PrescriptionModifiers {
  // Based on readiness score
  intensityMultiplier: number;    // 0.7 - 1.2
  volumeMultiplier: number;       // 0.7 - 1.2

  // Based on sleep
  excludeHighIntensity: boolean;  // If sleep < 6 hours

  // Based on HRV
  preferRecoveryWork: boolean;    // If HRV significantly below baseline

  // Based on recent muscle work
  muscleExclusions: string[];     // Recently taxed muscles
}

function computePrescriptionModifiers(
  biometrics: BiometricDailySummary,
  recentWorkouts: Workout[]
): PrescriptionModifiers {
  const readiness = biometrics.training_readiness ?? 75;

  return {
    // Scale intensity with readiness
    intensityMultiplier: 0.7 + (readiness / 100) * 0.5,
    volumeMultiplier: 0.7 + (readiness / 100) * 0.5,

    // Poor sleep = no max efforts
    excludeHighIntensity: (biometrics.sleep_score ?? 80) < 50,

    // Low HRV = prioritize mobility/recovery
    preferRecoveryWork: (biometrics.avg_hrv ?? 50) <
      (biometrics.hrv_baseline_7d ?? 50) * 0.85,

    // Standard 24-48h muscle recovery
    muscleExclusions: getMuscleExclusions(recentWorkouts),
  };
}
```

---

## Privacy & Data Handling

### Data Retention

| Data Type | Retention | Aggregation |
|-----------|-----------|-------------|
| Raw readings | 90 days | Then aggregate to daily |
| Daily summaries | 2 years | Permanent |
| Trends/baselines | Permanent | Computed from summaries |

### User Controls

```typescript
interface BiometricPrivacySettings {
  shareWithTrainer: boolean;
  shareInCommunity: boolean;
  enabledSources: BiometricSource[];
  enabledMetrics: BiometricMetric[];
  retentionDays: number;           // 30-365
}
```

### Data Export

Users can export all biometric data in standard formats:
- JSON (full fidelity)
- CSV (tabular)
- HealthKit XML (Apple ecosystem)
- FHIR R4 (healthcare interoperability)

---

## Plugin Extension Points

Third-party plugins can provide biometric data:

```typescript
// Plugin biometric provider
module.exports = definePlugin((ctx) => {
  return {
    registerBiometricProvider: () => ({
      id: 'my-device',
      name: 'My Device Integration',

      // Fetch readings from external source
      async fetchReadings(userId: string, since: Date): Promise<BiometricReading[]> {
        // Implement device-specific sync
      },

      // Optional: receive webhooks
      webhookHandler: async (payload: unknown) => {
        // Process incoming data
      },

      // Supported metrics
      supportedMetrics: ['heart_rate', 'hrv_rmssd', 'sleep_duration'],
    }),
  };
});
```

---

## Future Considerations

### Emerging Technologies

| Technology | Timeline | Use Case |
|------------|----------|----------|
| CGM (Continuous Glucose) | 2025 | Nutrition timing, energy availability |
| Smart clothing (EMG) | 2026 | Real-time muscle activation feedback |
| Smart rings (expanded) | 2025 | Temperature, SpO2, stress |
| EEG headbands | 2027 | Focus, fatigue detection |
| Lactate sensors | 2026 | Training zone accuracy |

### AI/ML Integration

```typescript
interface BiometricPredictions {
  // Predicted recovery completion time
  recoveryEstimate: Date;

  // Optimal training windows this week
  optimalTrainingWindows: TimeWindow[];

  // Injury risk indicators
  injuryRiskFactors: RiskFactor[];

  // Performance predictions
  expectedPerformance: PerformanceEstimate;
}
```

### Research & Insights

Anonymous, aggregated biometric data enables:
- Population-level training response analysis
- Recovery time optimization research
- Sleep/performance correlation studies
- Archetype-specific recovery patterns

---

## Implementation Roadmap

### Phase 1: Foundation (Q1)
- [ ] Biometric data model and database schema
- [ ] Manual entry API
- [ ] Basic readiness score display

### Phase 2: Apple HealthKit (Q2)
- [ ] iOS app HealthKit integration
- [ ] Background sync
- [ ] Workout import

### Phase 3: Major Platforms (Q3)
- [ ] Google Fit integration
- [ ] Garmin Connect integration
- [ ] Whoop integration

### Phase 4: Advanced Features (Q4)
- [ ] AI-powered readiness predictions
- [ ] Prescription auto-adjustment
- [ ] Community insights (opt-in)

### Phase 5: Extended Platform (Q1 Next Year)
- [ ] Oura Ring
- [ ] Fitbit
- [ ] Plugin biometric providers
