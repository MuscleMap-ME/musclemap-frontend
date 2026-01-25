/**
 * EquipmentMap Component
 *
 * Interactive map showing outdoor fitness equipment locations in NYC.
 * Uses Leaflet for rendering with server-side clustering.
 */

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client/core';
import { Filter, Locate, Layers, X, ChevronRight, Camera, CheckCircle } from 'lucide-react';

// GraphQL queries - clusters for future use
const _GET_VENUE_CLUSTERS = gql`
  query GetVenueClusters($input: ClusterInput!) {
    venueMapClusters(input: $input) {
      id
      latitude
      longitude
      count
      expansion_zoom
      venues {
        id
        name
        slug
        venueType
        isVerified
      }
    }
  }
`;

const GET_VENUE_GEOJSON = gql`
  query GetVenueGeoJSON($input: GeoJSONInput) {
    venueMapGeoJSON(input: $input) {
      type
      features {
        type
        geometry {
          type
          coordinates
        }
        properties {
          id
          name
          slug
          venueType
          equipmentCount
          hasPhotos
          isVerified
        }
      }
      totalCount
      bounds {
        north
        south
        east
        west
      }
    }
  }
`;

const GET_EQUIPMENT_TYPES = gql`
  query GetEquipmentTypes {
    outdoorEquipmentTypes {
      id
      name
      slug
      category
      iconName
    }
  }
`;

// NYC bounds
const NYC_BOUNDS = {
  north: 40.92,
  south: 40.49,
  east: -73.68,
  west: -74.27,
};

const NYC_CENTER: [number, number] = [40.7128, -74.006];

interface EquipmentMapProps {
  className?: string;
  onVenueSelect?: (venueId: string) => void;
  initialFilters?: {
    equipmentTypes?: string[];
    verifiedOnly?: boolean;
  };
  showFilters?: boolean;
  showControls?: boolean;
  height?: string | number;
}

// Fallback map when Leaflet can't load
function FallbackMap({ totalCount }: { totalCount: number }) {
  return (
    <div className="bg-gray-800 rounded-xl p-6 min-h-[400px] flex flex-col items-center justify-center">
      <div className="text-6xl mb-4">🗺️</div>
      <h3 className="text-xl font-bold text-white mb-4">NYC Outdoor Equipment Map</h3>
      <p className="text-gray-400 mb-4">
        {totalCount > 0 ? `${totalCount} locations available` : 'Loading locations...'}
      </p>
      <p className="text-sm text-gray-500">Map loading...</p>
    </div>
  );
}

export function EquipmentMap({
  className = '',
  onVenueSelect,
  initialFilters = {},
  showFilters = true,
  showControls = true,
  height = 500,
}: EquipmentMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [L, setL] = useState<any>(null);

  // Map state
  const [_zoom, setZoom] = useState(11);
  const [bounds, setBounds] = useState(NYC_BOUNDS);
  const [selectedVenue, setSelectedVenue] = useState<any>(null);

  // Filters
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [equipmentFilter, setEquipmentFilter] = useState<string[]>(initialFilters.equipmentTypes || []);
  const [verifiedOnly, setVerifiedOnly] = useState(initialFilters.verifiedOnly || false);

  // Queries
  const { data: equipmentTypesData } = useQuery(GET_EQUIPMENT_TYPES);
  const { data: geoJsonData, loading: loadingGeoJson } = useQuery(GET_VENUE_GEOJSON, {
    variables: {
      input: {
        bounds,
        equipmentTypes: equipmentFilter.length > 0 ? equipmentFilter : undefined,
        verifiedOnly,
      },
    },
    skip: !mapReady,
  });

  // Initialize Leaflet
  useEffect(() => {
    const initLeaflet = async () => {
      try {
        const leaflet = await import('leaflet');
        await import('leaflet/dist/leaflet.css');
        setL(leaflet);
        setLeafletLoaded(true);
      } catch (err) {
        console.error('Failed to load Leaflet:', err);
      }
    };
    initLeaflet();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!leafletLoaded || !L || !mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: NYC_CENTER,
      zoom: 11,
      minZoom: 10,
      maxZoom: 18,
      maxBounds: L.latLngBounds(
        L.latLng(NYC_BOUNDS.south - 0.1, NYC_BOUNDS.west - 0.1),
        L.latLng(NYC_BOUNDS.north + 0.1, NYC_BOUNDS.east + 0.1)
      ),
    });

    // Add tile layer (CartoDB Positron for cleaner look)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // Map events
    map.on('moveend', () => {
      const mapBounds = map.getBounds();
      setBounds({
        north: mapBounds.getNorth(),
        south: mapBounds.getSouth(),
        east: mapBounds.getEast(),
        west: mapBounds.getWest(),
      });
      setZoom(map.getZoom());
    });

    mapInstanceRef.current = map;
    setMapReady(true);

    // Initial bounds
    const initialBounds = map.getBounds();
    setBounds({
      north: initialBounds.getNorth(),
      south: initialBounds.getSouth(),
      east: initialBounds.getEast(),
      west: initialBounds.getWest(),
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [leafletLoaded, L]);

  // Update markers when data changes
  useEffect(() => {
    if (!mapReady || !L || !mapInstanceRef.current || !geoJsonData?.venueMapGeoJSON?.features) return;

    const map = mapInstanceRef.current;

    // Clear existing markers
    markersRef.current.forEach((marker) => map.removeLayer(marker));
    markersRef.current = [];

    // Add new markers
    geoJsonData.venueMapGeoJSON.features.forEach((feature: any) => {
      const [lng, lat] = feature.geometry.coordinates;
      const props = feature.properties;

      // Create custom icon
      const iconSize = props.equipmentCount > 5 ? 36 : 28;
      const iconColor = props.isVerified ? '#22c55e' : '#FF6B00';

      const icon = L.divIcon({
        className: 'equipment-marker',
        html: `
          <div style="
            width: ${iconSize}px;
            height: ${iconSize}px;
            background: ${iconColor};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            border: 2px solid white;
            cursor: pointer;
            transition: transform 0.2s;
          "
          onmouseover="this.style.transform='scale(1.2)'"
          onmouseout="this.style.transform='scale(1)'"
          >
            ${props.equipmentCount}
          </div>
        `,
        iconSize: [iconSize, iconSize],
        iconAnchor: [iconSize / 2, iconSize / 2],
      });

      const marker = L.marker([lat, lng], { icon }).addTo(map);

      // Popup content
      const popupContent = `
        <div style="min-width: 180px; padding: 8px;">
          <h4 style="margin: 0 0 8px 0; font-weight: 600; font-size: 14px; color: #1f2937;">
            ${props.name}
          </h4>
          <div style="display: flex; gap: 8px; margin-bottom: 8px;">
            ${props.isVerified ? '<span style="background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 9999px; font-size: 11px;">✓ Verified</span>' : ''}
            ${props.hasPhotos ? '<span style="background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 9999px; font-size: 11px;">📷 Photos</span>' : ''}
          </div>
          <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280;">
            ${props.equipmentCount} equipment items
          </p>
          <button
            onclick="window.dispatchEvent(new CustomEvent('venueSelect', { detail: '${props.id}' }))"
            style="
              background: #FF6B00;
              color: white;
              border: none;
              padding: 6px 12px;
              border-radius: 6px;
              font-size: 12px;
              cursor: pointer;
              width: 100%;
            "
          >
            View Details
          </button>
        </div>
      `;

      marker.bindPopup(popupContent, {
        closeButton: true,
        className: 'equipment-popup',
      });

      marker.on('click', () => {
        setSelectedVenue(props);
      });

      markersRef.current.push(marker);
    });
  }, [mapReady, L, geoJsonData]);

  // Listen for venue select events from popups
  useEffect(() => {
    const handleVenueSelect = (e: CustomEvent) => {
      if (onVenueSelect) {
        onVenueSelect(e.detail);
      }
    };

    window.addEventListener('venueSelect', handleVenueSelect as EventListener);
    return () => {
      window.removeEventListener('venueSelect', handleVenueSelect as EventListener);
    };
  }, [onVenueSelect]);

  // Center on user location
  const handleLocate = useCallback(() => {
    if (!mapInstanceRef.current || !L) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        mapInstanceRef.current.setView([latitude, longitude], 15);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        // Default to NYC center
        mapInstanceRef.current.setView(NYC_CENTER, 12);
      }
    );
  }, [L]);

  // Reset view
  const handleResetView = useCallback(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView(NYC_CENTER, 11);
  }, []);

  // Toggle equipment filter
  const toggleEquipmentFilter = useCallback((typeId: string) => {
    setEquipmentFilter((prev) =>
      prev.includes(typeId) ? prev.filter((id) => id !== typeId) : [...prev, typeId]
    );
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setEquipmentFilter([]);
    setVerifiedOnly(false);
  }, []);

  // Group equipment types by category
  const equipmentByCategory = useMemo(() => {
    if (!equipmentTypesData?.outdoorEquipmentTypes) return {};

    return equipmentTypesData.outdoorEquipmentTypes.reduce((acc: Record<string, any[]>, type: any) => {
      const category = type.category || 'other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(type);
      return acc;
    }, {});
  }, [equipmentTypesData]);

  const totalLocations = geoJsonData?.venueMapGeoJSON?.totalCount || 0;
  const activeFiltersCount = equipmentFilter.length + (verifiedOnly ? 1 : 0);

  if (!leafletLoaded) {
    return <FallbackMap totalCount={0} />;
  }

  return (
    <div className={`relative ${className}`} style={{ height }}>
      {/* Map container */}
      <div ref={mapRef} className="w-full h-full rounded-xl overflow-hidden" />

      {/* Loading overlay */}
      {loadingGeoJson && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-10">
          <div className="bg-white rounded-lg px-4 py-2 shadow-lg">
            <span className="text-sm text-gray-700">Loading locations...</span>
          </div>
        </div>
      )}

      {/* Top info bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex justify-between items-start pointer-events-none">
        <div className="bg-black/70 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm pointer-events-auto">
          <span className="font-medium">{totalLocations}</span> locations
          {activeFiltersCount > 0 && (
            <span className="text-orange-400 ml-2">({activeFiltersCount} filters)</span>
          )}
        </div>
      </div>

      {/* Controls */}
      {showControls && (
        <div className="absolute right-3 top-16 z-[1000] flex flex-col gap-2">
          <button
            onClick={handleLocate}
            className="bg-white p-3 rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
            title="My Location"
          >
            <Locate className="w-5 h-5 text-gray-700" />
          </button>
          <button
            onClick={handleResetView}
            className="bg-white p-3 rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
            title="Reset View"
          >
            <Layers className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      )}

      {/* Filter toggle button */}
      {showFilters && (
        <button
          onClick={() => setShowFilterPanel(!showFilterPanel)}
          className={`absolute left-3 bottom-3 z-10 flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg transition-colors ${
            showFilterPanel || activeFiltersCount > 0
              ? 'bg-orange-500 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filter</span>
          {activeFiltersCount > 0 && (
            <span className="bg-white text-orange-500 text-xs font-bold px-1.5 py-0.5 rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </button>
      )}

      {/* Filter panel */}
      {showFilterPanel && (
        <div className="absolute left-3 bottom-16 z-20 bg-white rounded-xl shadow-xl w-72 max-h-96 overflow-y-auto">
          <div className="sticky top-0 bg-white border-b p-3 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">Filters</h3>
            <div className="flex items-center gap-2">
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-orange-500 hover:text-orange-600"
                >
                  Clear all
                </button>
              )}
              <button
                onClick={() => setShowFilterPanel(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="p-3 space-y-4">
            {/* Verified filter */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="w-4 h-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500"
              />
              <span className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Verified locations only
              </span>
            </label>

            {/* Equipment types by category */}
            {Object.entries(equipmentByCategory).map(([category, types]) => (
              <div key={category}>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {category.replace(/_/g, ' ')}
                </h4>
                <div className="space-y-1">
                  {(types as any[]).map((type) => (
                    <label
                      key={type.id}
                      className="flex items-center gap-2 cursor-pointer py-1 px-2 rounded hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={equipmentFilter.includes(type.id)}
                        onChange={() => toggleEquipmentFilter(type.id)}
                        className="w-4 h-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500"
                      />
                      <span className="text-sm text-gray-700">{type.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected venue panel */}
      {selectedVenue && (
        <div className="absolute right-3 bottom-3 z-10 bg-white rounded-xl shadow-xl w-72 overflow-hidden">
          <div className="p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-gray-800 pr-6">{selectedVenue.name}</h3>
              <button
                onClick={() => setSelectedVenue(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="flex gap-2 mb-3">
              {selectedVenue.isVerified && (
                <span className="flex items-center gap-1 bg-green-50 text-green-700 text-xs px-2 py-1 rounded-full">
                  <CheckCircle className="w-3 h-3" />
                  Verified
                </span>
              )}
              {selectedVenue.hasPhotos && (
                <span className="flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full">
                  <Camera className="w-3 h-3" />
                  Photos
                </span>
              )}
            </div>

            <p className="text-sm text-gray-600 mb-3">
              {selectedVenue.equipmentCount} equipment items
            </p>

            <button
              onClick={() => onVenueSelect?.(selectedVenue.id)}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg transition-colors"
            >
              <span>View Details</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Custom styles */}
      <style>{`
        .equipment-marker {
          background: transparent !important;
          border: none !important;
        }
        .equipment-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        .equipment-popup .leaflet-popup-content {
          margin: 0;
        }
        .equipment-popup .leaflet-popup-tip {
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        /* Move Leaflet attribution to bottom-left to not cover controls */
        .leaflet-control-attribution {
          position: absolute !important;
          left: 0 !important;
          right: auto !important;
          bottom: 0 !important;
          background: rgba(255,255,255,0.7) !important;
          font-size: 10px !important;
          padding: 2px 5px !important;
        }
        /* Ensure zoom controls don't interfere */
        .leaflet-control-zoom {
          margin-top: 60px !important;
        }
      `}</style>
    </div>
  );
}

export default EquipmentMap;
