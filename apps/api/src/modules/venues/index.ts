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
 */

export * from './types';
export { venueService } from './venue.service';
export { checkinService } from './checkin.service';
export { recordClaimService } from './record-claim.service';
export { locationVerificationService } from './location-verification.service';

// Re-export for convenience
export { venueService as default } from './venue.service';
