/**
 * Geo Service
 *
 * Location-based services using PostGIS:
 * - Find nearby hangouts with efficient spatial queries
 * - Geohash-based clustering
 * - Distance calculations
 * - Bounding box queries
 */

import { queryOne, queryAll } from '../db/client';
import { loggers } from '../lib/logger';
import cacheService, { CACHE_TTL, CACHE_PREFIX } from '../lib/cache.service';

const _log = loggers.core;

// Import geohash utilities (pure JS fallback)
import { geohash, distance } from '@musclemap/native';

interface NearbyQuery {
  lat: number;
  lng: number;
  radiusM: number;
  typeId?: number;
  limit?: number;
  cursor?: string;
  userId?: string; // For personalized results
}

interface HangoutResult {
  id: number;
  name: string;
  typeId: number;
  typeName: string;
  typeSlug: string;
  distanceM: number;
  memberCount: number;
  postCount: number;
  isVerified: boolean;
  location: { lat: number; lng: number };
  coverImageUrl?: string;
  description?: string;
  city?: string;
  countryCode?: string;
  isMember?: boolean;
}

interface GeoStats {
  hangoutCount: number;
  memberCount: number;
  postCount: number;
}

/**
 * Check if PostGIS is available
 */
async function hasPostGIS(): Promise<boolean> {
  try {
    const result = await queryOne<{ has: boolean }>(
      "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'postgis') as has"
    );
    return result?.has ?? false;
  } catch {
    return false;
  }
}

export const geoService = {
  /**
   * Find nearby hangouts with cursor-based pagination
   */
  async findNearby(query: NearbyQuery): Promise<{ hangouts: HangoutResult[]; nextCursor?: string }> {
    const { lat, lng, radiusM, typeId, limit = 20, cursor, userId } = query;

    // Validate coordinates
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new Error('Invalid coordinates');
    }

    if (radiusM <= 0 || radiusM > 100000) {
      throw new Error('Radius must be between 1 and 100,000 meters');
    }

    // Parse cursor
    let lastDistance = 0;
    let lastId = 0;
    if (cursor) {
      try {
        const decoded = Buffer.from(cursor, 'base64url').toString();
        const [d, i] = decoded.split(':');
        lastDistance = parseFloat(d);
        lastId = parseInt(i, 10);
      } catch {
        // Invalid cursor, start from beginning
      }
    }

    // Check for PostGIS
    const usePostGIS = await hasPostGIS();

    let rows: Array<{
      id: number;
      name: string;
      type_id: number;
      type_name: string;
      type_slug: string;
      distance_m: number;
      member_count: number;
      post_count: number;
      is_verified: boolean;
      lat: number;
      lng: number;
      cover_image_url: string | null;
      description: string | null;
      city: string | null;
      country_code: string | null;
      is_member: boolean | null;
    }>;

    if (usePostGIS) {
      // PostGIS spatial query
      const typeFilter = typeId ? 'AND h.type_id = $6' : '';
      const userJoin = userId
        ? `LEFT JOIN hangout_memberships hm ON hm.hangout_id = h.id AND hm.user_id = '${userId}'`
        : '';
      const memberSelect = userId ? ', (hm.user_id IS NOT NULL) as is_member' : ', NULL as is_member';

      const result = await queryAll<{
        id: number;
        name: string;
        type_id: number;
        type_name: string;
        type_slug: string;
        distance_m: number;
        member_count: number;
        post_count: number;
        is_verified: boolean;
        lat: number;
        lng: number;
        cover_image_url: string | null;
        description: string | null;
        city: string | null;
        country_code: string | null;
        is_member: boolean | null;
      }>(
        `
        SELECT
          h.id, h.name, h.type_id, ht.name as type_name, ht.slug as type_slug,
          ST_Distance(h.location, ST_MakePoint($1, $2)::geography) as distance_m,
          h.member_count, h.post_count, h.is_verified,
          ST_Y(h.location::geometry) as lat, ST_X(h.location::geometry) as lng,
          h.cover_image_url, h.description, h.city, h.country_code
          ${memberSelect}
        FROM hangouts h
        JOIN hangout_types ht ON ht.id = h.type_id
        ${userJoin}
        WHERE h.is_active = TRUE
          AND ST_DWithin(h.location, ST_MakePoint($1, $2)::geography, $3)
          AND (ST_Distance(h.location, ST_MakePoint($1, $2)::geography) > $4
               OR (ST_Distance(h.location, ST_MakePoint($1, $2)::geography) = $4 AND h.id > $5))
          ${typeFilter}
        ORDER BY distance_m, h.id
        LIMIT $7
        `,
        typeId
          ? [lng, lat, radiusM, lastDistance, lastId, typeId, limit + 1]
          : [lng, lat, radiusM, lastDistance, lastId, limit + 1]
      );

      rows = result;
    } else {
      // Fallback without PostGIS using lat/lng columns
      const { minLat, maxLat, minLng, maxLng } = distance.boundingBox(lat, lng, radiusM);
      const typeFilter = typeId ? 'AND h.type_id = $8' : '';
      const userJoin = userId
        ? `LEFT JOIN hangout_memberships hm ON hm.hangout_id = h.id AND hm.user_id = '${userId}'`
        : '';
      const memberSelect = userId ? ', (hm.user_id IS NOT NULL) as is_member' : ', NULL as is_member';

      const result = await queryAll<{
        id: number;
        name: string;
        type_id: number;
        type_name: string;
        type_slug: string;
        distance_m: number;
        member_count: number;
        post_count: number;
        is_verified: boolean;
        lat: number;
        lng: number;
        cover_image_url: string | null;
        description: string | null;
        city: string | null;
        country_code: string | null;
        is_member: boolean | null;
      }>(
        `
        SELECT
          h.id, h.name, h.type_id, ht.name as type_name, ht.slug as type_slug,
          0 as distance_m,
          h.member_count, h.post_count, h.is_verified,
          h.latitude as lat, h.longitude as lng,
          h.cover_image_url, h.description, h.city, h.country_code
          ${memberSelect}
        FROM hangouts h
        JOIN hangout_types ht ON ht.id = h.type_id
        ${userJoin}
        WHERE h.is_active = TRUE
          AND h.latitude BETWEEN $1 AND $2
          AND h.longitude BETWEEN $3 AND $4
          AND h.id > $5
          ${typeFilter}
        ORDER BY h.id
        LIMIT $7
        `,
        typeId
          ? [minLat, maxLat, minLng, maxLng, lastId, typeId, limit + 1]
          : [minLat, maxLat, minLng, maxLng, lastId, limit + 1]
      );

      // Calculate actual distances and filter
      rows = result
        .map((r) => ({
          ...r,
          distance_m: distance.haversine(lat, lng, r.lat, r.lng),
        }))
        .filter((r) => r.distance_m <= radiusM)
        .sort((a, b) => a.distance_m - b.distance_m || a.id - b.id);
    }

    // Handle pagination
    const hasMore = rows.length > limit;
    const resultRows = hasMore ? rows.slice(0, limit) : rows;

    const hangouts: HangoutResult[] = resultRows.map((r) => ({
      id: r.id,
      name: r.name,
      typeId: r.type_id,
      typeName: r.type_name,
      typeSlug: r.type_slug,
      distanceM: Math.round(r.distance_m),
      memberCount: r.member_count,
      postCount: r.post_count,
      isVerified: r.is_verified,
      location: { lat: r.lat, lng: r.lng },
      coverImageUrl: r.cover_image_url ?? undefined,
      description: r.description ?? undefined,
      city: r.city ?? undefined,
      countryCode: r.country_code ?? undefined,
      isMember: r.is_member ?? undefined,
    }));

    let nextCursor: string | undefined;
    if (hasMore && resultRows.length > 0) {
      const last = resultRows[resultRows.length - 1];
      nextCursor = Buffer.from(`${last.distance_m}:${last.id}`).toString('base64url');
    }

    return { hangouts, nextCursor };
  },

  /**
   * Find hangouts by geohash prefix (for clustering)
   */
  async findByGeohash(
    geohashPrefix: string,
    options: { limit?: number; typeId?: number } = {}
  ): Promise<HangoutResult[]> {
    const { limit = 100, typeId } = options;

    const typeFilter = typeId ? 'AND h.type_id = $3' : '';

    const rows = await queryAll<{
      id: number;
      name: string;
      type_id: number;
      type_name: string;
      type_slug: string;
      member_count: number;
      post_count: number;
      is_verified: boolean;
      lat: number;
      lng: number;
      cover_image_url: string | null;
      description: string | null;
      city: string | null;
      country_code: string | null;
    }>(
      `
      SELECT
        h.id, h.name, h.type_id, ht.name as type_name, ht.slug as type_slug,
        h.member_count, h.post_count, h.is_verified,
        COALESCE(ST_Y(h.location::geometry), h.latitude) as lat,
        COALESCE(ST_X(h.location::geometry), h.longitude) as lng,
        h.cover_image_url, h.description, h.city, h.country_code
      FROM hangouts h
      JOIN hangout_types ht ON ht.id = h.type_id
      WHERE h.is_active = TRUE
        AND h.geohash LIKE $1 || '%'
        ${typeFilter}
      ORDER BY h.member_count DESC
      LIMIT $2
      `,
      typeId ? [geohashPrefix, limit, typeId] : [geohashPrefix, limit]
    );

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      typeId: r.type_id,
      typeName: r.type_name,
      typeSlug: r.type_slug,
      distanceM: 0,
      memberCount: r.member_count,
      postCount: r.post_count,
      isVerified: r.is_verified,
      location: { lat: r.lat, lng: r.lng },
      coverImageUrl: r.cover_image_url ?? undefined,
      description: r.description ?? undefined,
      city: r.city ?? undefined,
      countryCode: r.country_code ?? undefined,
    }));
  },

  /**
   * Get geo stats for a region
   */
  async getStats(lat: number, lng: number, radiusM: number): Promise<GeoStats> {
    const usePostGIS = await hasPostGIS();

    if (usePostGIS) {
      const result = await queryOne<{
        hangout_count: string;
        member_count: string;
        post_count: string;
      }>(
        `
        SELECT
          COUNT(*) as hangout_count,
          COALESCE(SUM(member_count), 0) as member_count,
          COALESCE(SUM(post_count), 0) as post_count
        FROM hangouts h
        WHERE h.is_active = TRUE
          AND ST_DWithin(h.location, ST_MakePoint($1, $2)::geography, $3)
        `,
        [lng, lat, radiusM]
      );

      return {
        hangoutCount: parseInt(result?.hangout_count || '0', 10),
        memberCount: parseInt(result?.member_count || '0', 10),
        postCount: parseInt(result?.post_count || '0', 10),
      };
    }

    // Fallback
    const { minLat, maxLat, minLng, maxLng } = distance.boundingBox(lat, lng, radiusM);

    const result = await queryOne<{
      hangout_count: string;
      member_count: string;
      post_count: string;
    }>(
      `
      SELECT
        COUNT(*) as hangout_count,
        COALESCE(SUM(member_count), 0) as member_count,
        COALESCE(SUM(post_count), 0) as post_count
      FROM hangouts h
      WHERE h.is_active = TRUE
        AND h.latitude BETWEEN $1 AND $2
        AND h.longitude BETWEEN $3 AND $4
      `,
      [minLat, maxLat, minLng, maxLng]
    );

    return {
      hangoutCount: parseInt(result?.hangout_count || '0', 10),
      memberCount: parseInt(result?.member_count || '0', 10),
      postCount: parseInt(result?.post_count || '0', 10),
    };
  },

  /**
   * Get all hangout types (cached)
   */
  async getTypes(): Promise<
    Array<{
      id: number;
      slug: string;
      name: string;
      description?: string;
      iconUrl?: string;
    }>
  > {
    return cacheService.getOrSet(
      CACHE_PREFIX.HANGOUT_TYPES,
      CACHE_TTL.HANGOUT_TYPES,
      async () => {
        const rows = await queryAll<{
          id: number;
          slug: string;
          name: string;
          description: string | null;
          icon_url: string | null;
        }>('SELECT id, slug, name, description, icon_url FROM hangout_types ORDER BY name');

        return rows.map((r) => ({
          id: r.id,
          slug: r.slug,
          name: r.name,
          description: r.description ?? undefined,
          iconUrl: r.icon_url ?? undefined,
        }));
      }
    );
  },

  /**
   * Encode coordinates to geohash
   */
  encodeGeohash(lat: number, lng: number, precision: number = 9): string {
    return geohash.encode(lat, lng, precision);
  },

  /**
   * Decode geohash to coordinates
   */
  decodeGeohash(hash: string): { lat: number; lng: number } {
    return geohash.decode(hash);
  },

  /**
   * Get geohash neighbors
   */
  getGeohashNeighbors(hash: string): string[] {
    return geohash.neighbors(hash);
  },

  /**
   * Calculate distance between two points
   */
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    return distance.haversine(lat1, lng1, lat2, lng2);
  },

  /**
   * Get optimal geohash precision for a given radius
   */
  getOptimalPrecision(radiusMeters: number): number {
    const cellWidths = [5009400, 1252350, 156543, 39136, 4892, 1223, 153, 38, 5, 1, 0.15, 0.04];

    for (let i = 0; i < cellWidths.length; i++) {
      if (radiusMeters >= cellWidths[i]) {
        return i + 1;
      }
    }

    return 12;
  },
};
