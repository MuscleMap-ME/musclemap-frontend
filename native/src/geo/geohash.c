/**
 * High-performance Geohash Implementation
 *
 * Compile: gcc -O3 -march=native -fPIC -shared -o libgeo.so geohash.c -lm
 *
 * Features:
 * - Encode lat/lng to geohash string
 * - Decode geohash to lat/lng
 * - Find neighboring geohashes
 * - Haversine distance calculation
 */

#include <stdint.h>
#include <string.h>
#include <math.h>
#include <stdbool.h>
#include <stdlib.h>

#ifdef _WIN32
#define EXPORT __declspec(dllexport)
#else
#define EXPORT __attribute__((visibility("default")))
#endif

/* Base32 alphabet for geohash encoding */
static const char BASE32[] = "0123456789bcdefghjkmnpqrstuvwxyz";

/* Latitude/longitude error margins for each precision level */
static const double LAT_ERR[] = {
    23.0, 23.0, 2.8, 2.8, 0.35, 0.35,
    0.044, 0.044, 0.0055, 0.0055, 0.00068, 0.00068
};

static const double LNG_ERR[] = {
    23.0, 5.6, 5.6, 0.7, 0.7, 0.087,
    0.087, 0.011, 0.011, 0.0014, 0.0014, 0.00017
};

/* Decode table for base32 characters */
static const int8_t DECODE[128] = {
    -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
     0, 1, 2, 3, 4, 5, 6, 7, 8, 9,-1,-1,-1,-1,-1,-1,  /* 0-9 */
    -1,-1,10,11,12,13,14,15,16,-1,17,18,-1,19,20,-1,  /* A-O (upper) */
    21,22,23,24,25,26,27,28,29,30,31,-1,-1,-1,-1,-1,  /* P-Z (upper) */
    -1,-1,10,11,12,13,14,15,16,-1,17,18,-1,19,20,-1,  /* a-o (lower) */
    21,22,23,24,25,26,27,28,29,30,31,-1,-1,-1,-1,-1   /* p-z (lower) */
};

/**
 * Encode latitude/longitude to geohash string
 *
 * @param lat Latitude (-90 to 90)
 * @param lng Longitude (-180 to 180)
 * @param precision Number of characters (1-12)
 * @param out Output buffer (must be at least precision+1 bytes)
 * @return Number of characters written, or -1 on error
 */
EXPORT
__attribute__((hot, nonnull))
int geohash_encode(double lat, double lng, int precision, char* restrict out) {
    /* Validate and clamp precision */
    if (precision < 1) precision = 1;
    if (precision > 12) precision = 12;

    /* Validate inputs */
    if (lat < -90.0 || lat > 90.0 || lng < -180.0 || lng > 180.0 || !out) {
        return -1;
    }

    double lat_range[2] = {-90.0, 90.0};
    double lng_range[2] = {-180.0, 180.0};
    bool is_lng = true;
    int bit = 0;
    int ch = 0;
    int i = 0;

    while (i < precision) {
        double *range = is_lng ? lng_range : lat_range;
        double val = is_lng ? lng : lat;
        double mid = (range[0] + range[1]) * 0.5;

        if (val >= mid) {
            ch |= (1 << (4 - bit));
            range[0] = mid;
        } else {
            range[1] = mid;
        }

        is_lng = !is_lng;

        if (++bit == 5) {
            out[i++] = BASE32[ch];
            bit = 0;
            ch = 0;
        }
    }

    out[i] = '\0';
    return i;
}

/**
 * Decode geohash string to latitude/longitude
 *
 * @param hash Geohash string (1-12 characters)
 * @param lat Output latitude
 * @param lng Output longitude
 * @return 0 on success, -1 on error
 */
EXPORT
__attribute__((hot, nonnull))
int geohash_decode(const char* restrict hash, double* restrict lat, double* restrict lng) {
    if (!hash || !lat || !lng) {
        return -1;
    }

    double lat_range[2] = {-90.0, 90.0};
    double lng_range[2] = {-180.0, 180.0};
    bool is_lng = true;

    for (int i = 0; hash[i] && i < 12; i++) {
        unsigned char c = (unsigned char)hash[i];

        if (c >= 128) {
            return -1;
        }

        int val = DECODE[c];
        if (val < 0) {
            return -1;
        }

        for (int bit = 4; bit >= 0; bit--) {
            double *range = is_lng ? lng_range : lat_range;
            double mid = (range[0] + range[1]) * 0.5;

            if (val & (1 << bit)) {
                range[0] = mid;
            } else {
                range[1] = mid;
            }

            is_lng = !is_lng;
        }
    }

    *lat = (lat_range[0] + lat_range[1]) * 0.5;
    *lng = (lng_range[0] + lng_range[1]) * 0.5;

    return 0;
}

/**
 * Get error bounds for a geohash precision
 *
 * @param precision Geohash precision (1-12)
 * @param lat_err Output latitude error
 * @param lng_err Output longitude error
 * @return 0 on success, -1 on error
 */
EXPORT
int geohash_precision_error(int precision, double* lat_err, double* lng_err) {
    if (precision < 1 || precision > 12 || !lat_err || !lng_err) {
        return -1;
    }

    *lat_err = LAT_ERR[precision - 1];
    *lng_err = LNG_ERR[precision - 1];

    return 0;
}

/**
 * Find the 8 neighboring geohashes
 *
 * @param hash Input geohash
 * @param neighbors Output array of 8 neighbor strings (each 13 bytes)
 *                  Order: N, NE, E, SE, S, SW, W, NW
 * @return 0 on success, -1 on error
 */
EXPORT
__attribute__((nonnull))
int geohash_neighbors(const char* restrict hash, char neighbors[8][13]) {
    if (!hash || !neighbors) {
        return -1;
    }

    int precision = (int)strlen(hash);
    if (precision < 1 || precision > 12) {
        return -1;
    }

    double lat, lng;
    if (geohash_decode(hash, &lat, &lng) < 0) {
        return -1;
    }

    double lat_err = LAT_ERR[precision - 1];
    double lng_err = LNG_ERR[precision - 1];

    /* Direction offsets: N, NE, E, SE, S, SW, W, NW */
    static const int8_t OFFSETS[8][2] = {
        { 1,  0}, /* N */
        { 1,  1}, /* NE */
        { 0,  1}, /* E */
        {-1,  1}, /* SE */
        {-1,  0}, /* S */
        {-1, -1}, /* SW */
        { 0, -1}, /* W */
        { 1, -1}  /* NW */
    };

    for (int i = 0; i < 8; i++) {
        double nlat = lat + OFFSETS[i][0] * lat_err * 2.0;
        double nlng = lng + OFFSETS[i][1] * lng_err * 2.0;

        /* Wrap longitude */
        while (nlng > 180.0) nlng -= 360.0;
        while (nlng < -180.0) nlng += 360.0;

        /* Clamp latitude */
        if (nlat > 90.0) nlat = 90.0;
        if (nlat < -90.0) nlat = -90.0;

        if (geohash_encode(nlat, nlng, precision, neighbors[i]) < 0) {
            return -1;
        }
    }

    return 0;
}

/**
 * Calculate distance between two points using Haversine formula
 *
 * @param lat1 Latitude of first point
 * @param lng1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lng2 Longitude of second point
 * @return Distance in meters
 */
EXPORT
__attribute__((hot, const))
double haversine_meters(double lat1, double lng1, double lat2, double lng2) {
    static const double R = 6371000.0;  /* Earth's radius in meters */
    static const double DEG2RAD = 0.017453292519943295;  /* PI / 180 */

    double phi1 = lat1 * DEG2RAD;
    double phi2 = lat2 * DEG2RAD;
    double dphi = (lat2 - lat1) * DEG2RAD;
    double dlam = (lng2 - lng1) * DEG2RAD;

    double sin_dphi = sin(dphi * 0.5);
    double sin_dlam = sin(dlam * 0.5);

    double a = sin_dphi * sin_dphi + cos(phi1) * cos(phi2) * sin_dlam * sin_dlam;

    return R * 2.0 * atan2(sqrt(a), sqrt(1.0 - a));
}

/**
 * Check if a point is within a radius of another point
 *
 * @param lat1 Center latitude
 * @param lng1 Center longitude
 * @param lat2 Point latitude
 * @param lng2 Point longitude
 * @param radius_meters Maximum distance in meters
 * @return 1 if within radius, 0 if not
 */
EXPORT
__attribute__((hot))
int is_within_radius(double lat1, double lng1, double lat2, double lng2, double radius_meters) {
    return haversine_meters(lat1, lng1, lat2, lng2) <= radius_meters;
}

/**
 * Calculate bounding box for a point and radius
 *
 * @param lat Center latitude
 * @param lng Center longitude
 * @param radius_meters Radius in meters
 * @param min_lat Output minimum latitude
 * @param max_lat Output maximum latitude
 * @param min_lng Output minimum longitude
 * @param max_lng Output maximum longitude
 * @return 0 on success
 */
EXPORT
int bounding_box(
    double lat, double lng, double radius_meters,
    double* min_lat, double* max_lat,
    double* min_lng, double* max_lng
) {
    static const double R = 6371000.0;
    static const double DEG2RAD = 0.017453292519943295;
    static const double RAD2DEG = 57.29577951308232;

    double lat_delta = (radius_meters / R) * RAD2DEG;
    double lng_delta = (radius_meters / (R * cos(lat * DEG2RAD))) * RAD2DEG;

    *min_lat = lat - lat_delta;
    *max_lat = lat + lat_delta;
    *min_lng = lng - lng_delta;
    *max_lng = lng + lng_delta;

    /* Clamp values */
    if (*min_lat < -90.0) *min_lat = -90.0;
    if (*max_lat > 90.0) *max_lat = 90.0;

    return 0;
}

/**
 * Get optimal geohash precision for a given radius
 *
 * @param radius_meters Search radius in meters
 * @return Recommended precision (1-12)
 */
EXPORT
int optimal_precision(double radius_meters) {
    /* Approximate cell widths in meters for each precision */
    static const double CELL_WIDTHS[] = {
        5009400.0,  /* 1: 5009.4 km */
        1252350.0,  /* 2: 1252.35 km */
        156543.0,   /* 3: 156.54 km */
        39135.8,    /* 4: 39.14 km */
        4891.97,    /* 5: 4.89 km */
        1222.99,    /* 6: 1.22 km */
        152.87,     /* 7: 152.87 m */
        38.22,      /* 8: 38.22 m */
        4.78,       /* 9: 4.78 m */
        1.19,       /* 10: 1.19 m */
        0.149,      /* 11: 0.149 m */
        0.037       /* 12: 0.037 m */
    };

    for (int i = 0; i < 12; i++) {
        if (radius_meters >= CELL_WIDTHS[i]) {
            return i + 1;
        }
    }

    return 12;
}
