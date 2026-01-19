/**
 * Marketplace Module
 *
 * Central export for all marketplace-related services including:
 * - Marketplace listings and transactions
 * - Trading system for peer-to-peer exchanges
 * - Gift service for cosmetic gifting
 * - Mystery box service with pity system
 * - Collection management and showcases
 * - Health multiplier bonuses
 */

export { marketplaceService } from './marketplace.service';
export type { CreateListingInput, ListingFilters, MakeOfferInput } from './marketplace.service';

export { tradingService } from './trading.service';
export type { CreateTradeInput } from './trading.service';

export { giftService } from './gift.service';
export type { CreateGiftInput } from './gift.service';

export { mysteryBoxService } from './mystery-box.service';
export type { DropRates, BoxOpeningResult } from './mystery-box.service';

export { collectionService } from './collection.service';

export { healthMultiplierService } from './health-multiplier.service';
