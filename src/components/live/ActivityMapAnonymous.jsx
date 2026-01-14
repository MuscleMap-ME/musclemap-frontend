/**
 * ActivityMapAnonymous Component
 *
 * Anonymous activity map showing clustered workout locations.
 * No individual user data - only aggregated counts per region.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { MapPin, Layers, ZoomIn, ZoomOut } from 'lucide-react';

// City coordinates for demo (in production, this would come from the API)
const CITY_COORDS = {
  'US': { lat: 39.8, lng: -98.5, name: 'United States' },
  'GB': { lat: 54.0, lng: -2.0, name: 'United Kingdom' },
  'CA': { lat: 56.1, lng: -106.3, name: 'Canada' },
  'AU': { lat: -25.3, lng: 133.8, name: 'Australia' },
  'DE': { lat: 51.2, lng: 10.4, name: 'Germany' },
  'JP': { lat: 36.2, lng: 138.3, name: 'Japan' },
  'BR': { lat: -14.2, lng: -51.9, name: 'Brazil' },
  'FR': { lat: 46.2, lng: 2.2, name: 'France' },
  'IN': { lat: 20.6, lng: 79.0, name: 'India' },
  'MX': { lat: 23.6, lng: -102.5, name: 'Mexico' },
};

function ActivityMapAnonymous({ mapData = [], onRegionClick, className = '' }) {
  const canvasRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [hoveredMarker, setHoveredMarker] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Process map data into markers
  const markers = useMemo(() => {
    const result = [];
    const countryTotals = {};

    // Aggregate by country
    for (const item of mapData) {
      const country = item.country || 'Unknown';
      if (!countryTotals[country]) {
        countryTotals[country] = { count: 0, cities: new Set() };
      }
      countryTotals[country].count += item.count;
      if (item.city) {
        countryTotals[country].cities.add(item.city);
      }
    }

    // Create markers
    for (const [country, data] of Object.entries(countryTotals)) {
      const coords = CITY_COORDS[country];
      if (coords) {
        result.push({
          id: country,
          lat: coords.lat,
          lng: coords.lng,
          count: data.count,
          name: coords.name,
          cities: Array.from(data.cities),
        });
      }
    }

    return result;
  }, [mapData]);

  // Convert lat/lng to canvas coordinates (simple equirectangular projection)
  const latLngToCanvas = (lat, lng, width, height) => {
    const x = ((lng + 180) / 360) * width * zoom + offset.x;
    const y = ((90 - lat) / 180) * height * zoom + offset.y;
    return { x, y };
  };

  // Draw the map
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    // Latitude lines
    for (let lat = -80; lat <= 80; lat += 20) {
      const { y } = latLngToCanvas(lat, 0, width, height);
      if (y >= 0 && y <= height) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    // Longitude lines
    for (let lng = -180; lng <= 180; lng += 30) {
      const { x } = latLngToCanvas(0, lng, width, height);
      if (x >= 0 && x <= width) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
    }

    // Draw markers
    for (const marker of markers) {
      const { x, y } = latLngToCanvas(marker.lat, marker.lng, width, height);

      // Skip if outside viewport
      if (x < -50 || x > width + 50 || y < -50 || y > height + 50) continue;

      // Size based on count (logarithmic scale)
      const size = Math.min(30, Math.max(10, Math.log10(marker.count + 1) * 15));

      // Draw glow
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, size * 2, 0, Math.PI * 2);
      ctx.fill();

      // Draw marker
      const isHovered = hoveredMarker?.id === marker.id;
      ctx.fillStyle = isHovered ? '#60a5fa' : '#3b82f6';
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();

      // Draw count
      if (size >= 15 || isHovered) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(10, size * 0.6)}px Inter`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(marker.count.toString(), x, y);
      }
    }

    // Draw hovered marker tooltip
    if (hoveredMarker) {
      const { x, y } = latLngToCanvas(hoveredMarker.lat, hoveredMarker.lng, width, height);
      const tooltipX = Math.min(x + 20, width - 150);
      const tooltipY = Math.max(y - 40, 10);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(tooltipX, tooltipY, 140, 50, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Inter';
      ctx.textAlign = 'left';
      ctx.fillText(hoveredMarker.name, tooltipX + 10, tooltipY + 18);

      ctx.fillStyle = '#a1a1aa';
      ctx.font = '11px Inter';
      ctx.fillText(`${hoveredMarker.count} workouts`, tooltipX + 10, tooltipY + 35);
    }
  }, [markers, zoom, offset, hoveredMarker]);

  // Handle mouse events
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Handle dragging
    if (isDragging) {
      setOffset({
        x: offset.x + (mouseX - dragStart.x),
        y: offset.y + (mouseY - dragStart.y),
      });
      setDragStart({ x: mouseX, y: mouseY });
      return;
    }

    // Check for marker hover
    let found = null;
    for (const marker of markers) {
      const { x, y } = latLngToCanvas(marker.lat, marker.lng, canvas.width, canvas.height);
      const size = Math.min(30, Math.max(10, Math.log10(marker.count + 1) * 15));
      const dist = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2);
      if (dist <= size) {
        found = marker;
        break;
      }
    }
    setHoveredMarker(found);
  };

  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleClick = () => {
    if (hoveredMarker && onRegionClick) {
      onRegionClick(hoveredMarker);
    }
  };

  const handleZoomIn = () => {
    setZoom((z) => Math.min(z * 1.5, 5));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(z / 1.5, 0.5));
  };

  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div className={`relative bg-black/20 rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full border border-white/10">
          <MapPin className="w-4 h-4 text-blue-400" />
          <span className="text-xs text-white/70">
            {markers.length} regions active
          </span>
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="p-2 bg-black/60 backdrop-blur-sm rounded-lg border border-white/10 text-white/70 hover:text-white hover:bg-black/80 transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 bg-black/60 backdrop-blur-sm rounded-lg border border-white/10 text-white/70 hover:text-white hover:bg-black/80 transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleReset}
          className="p-2 bg-black/60 backdrop-blur-sm rounded-lg border border-white/10 text-white/70 hover:text-white hover:bg-black/80 transition-colors"
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>

      {/* Map canvas */}
      <canvas
        ref={canvasRef}
        width={800}
        height={400}
        className="w-full h-auto cursor-grab"
        style={{ cursor: isDragging ? 'grabbing' : hoveredMarker ? 'pointer' : 'grab' }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
      />

      {/* Empty state */}
      {markers.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/50 text-sm">No activity data available</p>
            <p className="text-white/30 text-xs mt-1">Workouts will appear here in real-time</p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 px-3 py-2 bg-black/60 backdrop-blur-sm rounded-lg border border-white/10">
        <p className="text-xs text-white/50">
          Marker size = workout count (anonymous data only)
        </p>
      </div>
    </div>
  );
}

export default ActivityMapAnonymous;
