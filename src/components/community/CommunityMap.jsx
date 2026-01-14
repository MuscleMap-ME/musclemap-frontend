/**
 * CommunityMap Component
 *
 * Map view showing user activity by geographic location.
 * Uses Leaflet for rendering with OpenStreetMap tiles.
 */

import React, { useEffect, useState, useRef } from 'react';

// Geo bucket centroids (city-level approximations)
// In production, these would be fetched from an API or computed from the bucket name
const GEO_BUCKET_COORDS = {
  'US-NY': [40.7128, -74.006],
  'US-LA': [34.0522, -118.2437],
  'US-CHI': [41.8781, -87.6298],
  'US-HOU': [29.7604, -95.3698],
  'US-PHX': [33.4484, -112.074],
  'UK-LON': [51.5074, -0.1278],
  'DE-BER': [52.52, 13.405],
  'FR-PAR': [48.8566, 2.3522],
  'JP-TKY': [35.6762, 139.6503],
  'AU-SYD': [-33.8688, 151.2093],
  'BR-SAO': [-23.5505, -46.6333],
  'IN-MUM': [19.076, 72.8777],
  'CA-TOR': [43.6532, -79.3832],
};

// Simple fallback map when Leaflet can't be loaded
function FallbackMap({ presenceData = [] }) {
  return (
    <div className="bg-gray-800 rounded-xl p-6 min-h-[400px] flex flex-col items-center justify-center">
      <div className="text-6xl mb-4">🗺️</div>
      <h3 className="text-xl font-bold text-white mb-4">Community Activity Map</h3>

      {presenceData.length > 0 ? (
        <div className="w-full max-w-md space-y-2">
          {presenceData.slice(0, 10).map((item, i) => (
            <div
              key={item.geoBucket || i}
              className="flex justify-between items-center bg-gray-700 rounded-lg px-4 py-2"
            >
              <span className="text-gray-200">{item.geoBucket}</span>
              <span className="bg-purple-600 px-3 py-1 rounded-full text-sm font-bold">
                {item.count} active
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-400">No location data available</p>
      )}
    </div>
  );
}

// Leaflet-based map component
function LeafletMap({ presenceData = [] }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    // Dynamic import of Leaflet to avoid SSR issues
    const initMap = async () => {
      try {
        const L = await import('leaflet');
        await import('leaflet/dist/leaflet.css');

        if (!mapRef.current || mapInstanceRef.current) return;

        // Create map
        const map = L.map(mapRef.current).setView([20, 0], 2);
        mapInstanceRef.current = map;

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 18,
        }).addTo(map);

        // Custom marker icon
        const createIcon = (count) => {
          const size = Math.min(50, 20 + count * 2);
          return L.divIcon({
            className: 'custom-marker',
            html: `
              <div style="
                width: ${size}px;
                height: ${size}px;
                background: linear-gradient(135deg, #8b5cf6, #6366f1);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: ${Math.max(10, size / 3)}px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                border: 2px solid white;
              ">
                ${count}
              </div>
            `,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          });
        };

        // Add markers for each geo bucket
        presenceData.forEach((item) => {
          const coords = GEO_BUCKET_COORDS[item.geoBucket];
          if (coords) {
            const marker = L.marker(coords, {
              icon: createIcon(item.count),
            })
              .addTo(map)
              .bindPopup(
                `<strong>${item.geoBucket}</strong><br/>${item.count} active users`
              );
            markersRef.current.push(marker);
          }
        });
      } catch (err) {
        console.error('Failed to initialize Leaflet map:', err);
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers when data changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const L = window.L;
    if (!L) return;

    // Remove existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Create custom marker icon
    const createIcon = (count) => {
      const size = Math.min(50, 20 + count * 2);
      return L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            width: ${size}px;
            height: ${size}px;
            background: linear-gradient(135deg, #8b5cf6, #6366f1);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: ${Math.max(10, size / 3)}px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            border: 2px solid white;
          ">
            ${count}
          </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
    };

    // Add new markers
    presenceData.forEach((item) => {
      const coords = GEO_BUCKET_COORDS[item.geoBucket];
      if (coords) {
        const marker = L.marker(coords, {
          icon: createIcon(item.count),
        })
          .addTo(mapInstanceRef.current)
          .bindPopup(
            `<strong>${item.geoBucket}</strong><br/>${item.count} active users`
          );
        markersRef.current.push(marker);
      }
    });
  }, [presenceData]);

  return (
    <div
      ref={mapRef}
      className="w-full h-[400px] rounded-xl overflow-hidden"
      style={{ background: '#1f2937' }}
    />
  );
}

export default function CommunityMap({ presenceData = [], loading = false }) {
  const [useLeaflet, setUseLeaflet] = useState(true);
  const [leafletError, setLeafletError] = useState(false);

  useEffect(() => {
    // Check if Leaflet can be loaded
    import('leaflet')
      .then(() => setUseLeaflet(true))
      .catch(() => {
        console.warn('Leaflet not available, using fallback');
        setLeafletError(true);
        setUseLeaflet(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl min-h-[400px] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (leafletError || !useLeaflet) {
    return <FallbackMap presenceData={presenceData} />;
  }

  return (
    <div className="relative">
      <LeafletMap presenceData={presenceData} />

      {/* Overlay Stats */}
      <div className="absolute top-4 right-4 bg-gray-900/90 backdrop-blur rounded-lg p-3 z-[1000]">
        <div className="text-sm text-gray-400 mb-1">Active Regions</div>
        <div className="text-2xl font-bold text-white">{presenceData.length}</div>
      </div>
    </div>
  );
}
