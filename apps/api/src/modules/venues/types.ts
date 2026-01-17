/**
 * Venue Records System Types
 *
 * Type definitions for the location-based achievement records system.
 */

// ============================================
// ENUMS
// ============================================

export type VenueType =
  | 'park'
  | 'recreation_center'
  | 'outdoor_gym'
  | 'calisthenics_park'
  | 'public_gym'
  | 'track'
  | 'beach'
  | 'playground'
  | 'custom';

export type RecordCategory =
  | 'calisthenics_reps'
  | 'calisthenics_hold'
  | 'weight_lift'
  | 'gymnastics_skill'
  | 'parkour_move'
  | 'endurance'
  | 'bodyweight_weighted';

export type MetricType = 'count' | 'weight_kg' | 'weight_lbs' | 'time_seconds' | 'distance_meters' | 'boolean';

export type RecordDirection = 'higher' | 'lower';

export type VenueRecordStatus =
  | 'pending_witness'
  | 'pending_review'
  | 'verified'
  | 'rejected'
  | 'disputed'
  | 'expired'
  | 'superseded';

export type LocationVerificationMethod = 'gps' | 'wifi' | 'cell_tower' | 'manual_override';

export type VenueMemberRole = 'member' | 'regular' | 'moderator' | 'admin';

export type DisputeReason =
  | 'video_manipulation'
  | 'form_violation'
  | 'equipment_assistance'
  | 'false_count'
  | 'location_mismatch'
  | 'witness_collusion'
  | 'other';

export type DisputeStatus = 'pending' | 'under_review' | 'resolved_upheld' | 'resolved_revoked' | 'dismissed';

export type EquipmentType =
  | 'pull_up_bar'
  | 'dip_bars'
  | 'parallel_bars'
  | 'monkey_bars'
  | 'vertical_pole'
  | 'bench_press'
  | 'squat_rack'
  | 'barbell'
  | 'dumbbells'
  | 'cable_machine'
  | 'weight_belt'
  | 'climbing_boulder';

// ============================================
// VENUE INTERFACES
// ============================================

export interface FitnessVenue {
  id: string;
  name: string;
  slug: string;
  description?: string;
  venueType: VenueType;

  // Location
  latitude: number;
  longitude: number;
  address?: string;
  city: string;
  stateProvince?: string;
  country: string;
  postalCode?: string;

  // Geofencing
  radiusMeters: number;
  boundaryPolygon?: unknown;

  // Equipment
  equipment: EquipmentType[];

  // Features
  hasFreeWeights: boolean;
  hasCalisthenicsEquipment: boolean;
  hasCardioEquipment: boolean;
  hasParkourFeatures: boolean;
  isIndoor: boolean;
  is24Hour: boolean;
  isFree: boolean;

  // Media
  photos: string[];
  coverPhotoUrl?: string;

  // Stats
  memberCount: number;
  activeRecordCount: number;
  totalRecordClaims: number;
  checkinCountToday: number;
  checkinCountTotal: number;

  // Verification
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;

  // Moderation
  isActive: boolean;
  isFlagged: boolean;
  flagReason?: string;

  // Metadata
  hoursOfOperation?: Record<string, string>;
  amenities: string[];
  externalLinks: Record<string, string>;

  // Ownership
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VenueRecordType {
  id: string;
  name: string;
  key: string;
  description?: string;
  icon?: string;
  category: RecordCategory;
  metricType: MetricType;
  unit: string;
  direction: RecordDirection;
  requiresVideo: boolean;
  requiresWitness: boolean;
  requiresLocationVerification: boolean;
  minVideoDurationSeconds: number;
  maxVideoDurationSeconds: number;
  exerciseId?: string;
  requiredEquipment: EquipmentType[];
  displayOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: Date;
}

export interface VenueRecord {
  id: string;
  venueId: string;
  recordTypeId: string;
  userId: string;
  value: number;
  previousRecordValue?: number;
  previousRecordHolderId?: string;

  // Video proof
  videoUrl?: string;
  videoAssetId?: string;
  thumbnailUrl?: string;
  videoDurationSeconds?: number;

  // Location verification
  claimLatitude: number;
  claimLongitude: number;
  distanceFromVenueMeters?: number;
  locationVerified: boolean;
  locationVerificationMethod?: LocationVerificationMethod;

  // Witness verification
  witnessUserId?: string;
  witnessVerified: boolean;
  witnessAttestation?: string;
  witnessLocationLatitude?: number;
  witnessLocationLongitude?: number;
  witnessDistanceMeters?: number;
  witnessVerifiedAt?: Date;

  // Status
  status: VenueRecordStatus;

  // Economy
  claimFeeCredits: number;
  feeRefunded: boolean;
  creditLedgerId?: string;

  // Timestamps
  claimedAt: Date;
  witnessRequestedAt?: Date;
  verifiedAt?: Date;
  expiresAt: Date;

  // Additional
  additionalPhotos: string[];
  notes?: string;
  rejectionReason?: string;
  deviceFingerprint?: string;
  ipAddress?: string;
  suspiciousFlags: string[];

  createdAt: Date;
  updatedAt: Date;

  // Joined data (optional)
  venue?: FitnessVenue;
  recordType?: VenueRecordType;
  user?: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
  witness?: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

export interface VenueRecordHistory {
  id: string;
  venueId: string;
  recordTypeId: string;
  recordId: string;
  userId: string;
  value: number;
  rankAtTime?: number;
  heldFrom: Date;
  heldUntil?: Date;
  supersededByRecordId?: string;
  createdAt: Date;
}

export interface VenueMembership {
  venueId: string;
  userId: string;
  role: VenueMemberRole;
  recordCount: number;
  currentRecordsHeld: number;
  checkinCount: number;
  lastCheckinAt?: Date;
  lastRecordClaimAt?: Date;
  notificationsEnabled: boolean;
  showInMembersList: boolean;
  joinedAt: Date;
}

export interface VenueCheckin {
  id: string;
  venueId: string;
  userId: string;
  latitude: number;
  longitude: number;
  distanceFromVenueMeters?: number;
  locationAccuracyMeters?: number;
  isActive: boolean;
  checkedInAt: Date;
  checkedOutAt?: Date;
  autoCheckout: boolean;
  workoutId?: string;
  createdAt: Date;
}

export interface VenueRecordDispute {
  id: string;
  recordId: string;
  filedByUserId: string;
  reason: DisputeReason;
  description: string;
  evidenceUrls: string[];
  status: DisputeStatus;
  reviewedBy?: string;
  adminNotes?: string;
  resolution?: string;
  filedAt: Date;
  reviewedAt?: Date;
  resolvedAt?: Date;
  appealDeadline?: Date;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface CreateVenueParams {
  name: string;
  description?: string;
  venueType: VenueType;
  latitude: number;
  longitude: number;
  address?: string;
  city: string;
  stateProvince?: string;
  country?: string;
  postalCode?: string;
  radiusMeters?: number;
  equipment?: EquipmentType[];
  hasFreeWeights?: boolean;
  hasCalisthenicsEquipment?: boolean;
  hasCardioEquipment?: boolean;
  hasParkourFeatures?: boolean;
  isIndoor?: boolean;
  is24Hour?: boolean;
  isFree?: boolean;
  coverPhotoUrl?: string;
  hoursOfOperation?: Record<string, string>;
  amenities?: string[];
}

export interface UpdateVenueParams extends Partial<CreateVenueParams> {
  isActive?: boolean;
}

export interface SearchVenuesParams {
  query?: string;
  city?: string;
  venueType?: VenueType;
  hasEquipment?: EquipmentType[];
  isFree?: boolean;
  isIndoor?: boolean;
  limit?: number;
  cursor?: { createdAt: Date; id: string };
}

export interface NearbyVenuesParams {
  latitude: number;
  longitude: number;
  radiusMiles?: number;
  venueType?: VenueType;
  limit?: number;
}

export interface CheckinParams {
  venueId: string;
  userId: string;
  latitude: number;
  longitude: number;
  locationAccuracyMeters?: number;
  workoutId?: string;
}

export interface InitiateClaimParams {
  venueId: string;
  recordTypeId: string;
  userId: string;
  value: number;
  latitude: number;
  longitude: number;
  notes?: string;
  deviceFingerprint?: string;
  ipAddress?: string;
}

export interface UploadVideoParams {
  recordId: string;
  userId: string;
  videoBuffer?: Buffer;
  videoStream?: NodeJS.ReadableStream;
  originalFilename?: string;
  fileSizeBytes?: number;
}

export interface AssignWitnessParams {
  recordId: string;
  userId: string;
  witnessUserId: string;
}

export interface WitnessAttestationParams {
  recordId: string;
  witnessUserId: string;
  confirm: boolean;
  attestationText?: string;
  latitude: number;
  longitude: number;
}

export interface FileDisputeParams {
  recordId: string;
  filedByUserId: string;
  reason: DisputeReason;
  description: string;
  evidenceUrls?: string[];
}

export interface ResolveDisputeParams {
  disputeId: string;
  reviewedByUserId: string;
  resolution: 'upheld' | 'revoked' | 'dismissed';
  adminNotes?: string;
}

// ============================================
// LOCATION VERIFICATION TYPES
// ============================================

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: Date;
}

export interface LocationVerificationResult {
  verified: boolean;
  distanceMeters: number;
  confidence: 'high' | 'medium' | 'low';
  method: LocationVerificationMethod;
  warning?: string;
  suspiciousFlags: string[];
}

export interface GpsSpoofingCheckResult {
  isSuspicious: boolean;
  reasons: string[];
  confidence: number;
}

// ============================================
// LEADERBOARD TYPES
// ============================================

export interface VenueLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  value: number;
  recordId: string;
  verifiedAt: Date;
  isCurrentUser?: boolean;
}

export interface VenueLeaderboard {
  venueId: string;
  recordTypeId: string;
  recordTypeName: string;
  unit: string;
  entries: VenueLeaderboardEntry[];
  totalEntries: number;
  currentRecord?: VenueLeaderboardEntry;
}

// ============================================
// CONSTANTS
// ============================================

export const VENUE_CONSTANTS = {
  // Claim limits
  MAX_PENDING_CLAIMS_PER_USER: 2,
  CLAIM_EXPIRY_DAYS: 7,

  // Witness requirements
  MIN_WITNESS_ACCOUNT_AGE_DAYS: 30,
  WITNESS_COOLDOWN_HOURS: 24,
  MAX_WITNESS_DISTANCE_METERS: 50,

  // Location verification
  DEFAULT_VENUE_RADIUS_METERS: 100,
  MAX_VENUE_RADIUS_METERS: 500,
  MIN_LOCATION_CONFIDENCE_METERS: 100,

  // Video requirements
  MIN_VIDEO_DURATION_SECONDS: 5,
  MAX_VIDEO_DURATION_SECONDS: 120,
  MAX_VIDEO_SIZE_BYTES: 100 * 1024 * 1024, // 100MB

  // Economy
  CLAIM_FEE_CREDITS: 15,
  VERIFIED_RECORD_REWARD: 100,
  RECORD_BREAKER_BONUS: 500,
  WITNESS_REWARD: 25,

  // Anti-cheat
  MAX_LOCATION_JUMP_METERS_PER_SECOND: 100,
  SUSPICIOUS_DEVICE_COOLDOWN_HOURS: 24,

  // Auto-checkout
  AUTO_CHECKOUT_MINUTES: 240, // 4 hours
} as const;

export const EQUIPMENT_LABELS: Record<EquipmentType, string> = {
  pull_up_bar: 'Pull-Up Bar',
  dip_bars: 'Dip Bars',
  parallel_bars: 'Parallel Bars',
  monkey_bars: 'Monkey Bars',
  vertical_pole: 'Vertical Pole',
  bench_press: 'Bench Press',
  squat_rack: 'Squat Rack',
  barbell: 'Barbell',
  dumbbells: 'Dumbbells',
  cable_machine: 'Cable Machine',
  weight_belt: 'Weight Belt',
  climbing_boulder: 'Climbing Boulder',
};

export const RECORD_CATEGORY_LABELS: Record<RecordCategory, string> = {
  calisthenics_reps: 'Calisthenics (Reps)',
  calisthenics_hold: 'Static Holds',
  weight_lift: 'Weight Lifting',
  gymnastics_skill: 'Gymnastics Skills',
  parkour_move: 'Parkour',
  endurance: 'Endurance',
  bodyweight_weighted: 'Weighted Bodyweight',
};
