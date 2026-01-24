/**
 * Venue Records Module
 *
 * Location-based achievement records system for fitness venues.
 *
 * Features:
 * - Fitness venue management (parks, gyms, rec centers)
 * - Record claims with GPS verification
 * - Witness attestation system
 * - Video proof upload and validation
 * - Venue leaderboards
 * - Check-in/check-out tracking
 * - Anti-spoofing measures
 * - Economy integration (credit fees and rewards)
 * - NYC Open Data integration (recreation centers, parks)
 * - OpenStreetMap integration (fitness stations)
 * - Crowdsourced venue submissions and verification
 */

export * from './types';
export { venueService } from './venue.service';
export { checkinService } from './checkin.service';
export { recordClaimService } from './record-claim.service';
export { locationVerificationService } from './location-verification.service';

// Data ingestion services
export { nycDataIngestionService } from './nyc-data-ingestion.service';
export { osmDataIngestionService } from './osm-data-ingestion.service';

// Crowdsourcing service
export { crowdsourcingService } from './crowdsourcing.service';
export type {
  VenueSubmission,
  VenueContribution,
  VenuePhoto,
  VenueReport,
  ContributorStats,
} from './crowdsourcing.service';

// Re-export for convenience
export { venueService as default } from './venue.service';
