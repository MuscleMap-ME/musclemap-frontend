/**
 * AdventureMapCanvas
 *
 * Main SVG container for the adventure map with pan/zoom controls.
 * Renders regions, paths, locations, and the character.
 * Supports touch gestures including pinch-to-zoom on mobile devices.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import MapRegion from './MapRegion';
import LocationNode from './LocationNode';
import MapPath from './MapPath';
import MapCharacter from './MapCharacter';
import { useCharacterMovement } from './hooks/useCharacterMovement';
import { useMapNavigation } from './hooks/useMapNavigation';
import { useAdventureMapStore, useMapView, useLocationSelection, useMapProgress } from '../../store/adventureMapStore';
import { REGIONS, getAllRegions } from './data/regions';
import { getAllLocations, PATH_CONNECTIONS } from './data/mapLayout';
import type { AdventureMapCanvasProps, Position, CompanionData } from './types';

// Map dimensions
const MAP_WIDTH = 1000;
const MAP_HEIGHT = 800;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;

// Touch gesture utilities
interface TouchState {
  touches: { x: number; y: number }[];
  initialDistance: number | null;
  initialZoom: number;
  initialPan: Position;
  lastCenter: Position;
}

function getDistance(touches: { x: number; y: number }[]): number {
  if (touches.length < 2) return 0;
  const dx = touches[1].x - touches[0].x;
  const dy = touches[1].y - touches[0].y;
  return Math.sqrt(dx * dx + dy * dy);
}

function getCenter(touches: { x: number; y: number }[]): Position {
  if (touches.length === 0) return { x: 0, y: 0 };
  if (touches.length === 1) return touches[0];
  return {
    x: (touches[0].x + touches[1].x) / 2,
    y: (touches[0].y + touches[1].y) / 2,
  };
}

export default function AdventureMapCanvas({
  className = '',
  initialPosition: _initialPosition,
  onLocationEnter,
  onCharacterMove,
  showHUD: _showHUD = true,
  isFullscreen: _isFullscreen = false,
  reducedMotion = false,
}: AdventureMapCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position | null>(null);
  const [touchState, setTouchState] = useState<TouchState>({
    touches: [],
    initialDistance: null,
    initialZoom: 1,
    initialPan: { x: 0, y: 0 },
    lastCenter: { x: 0, y: 0 },
  });

  // Store hooks
  const { zoom, pan, setZoom, setPan, zoomIn, zoomOut, center, reset } = useMapView();
  const { selected, hovered, setHovered } = useLocationSelection();
  const { visited, hasVisited } = useMapProgress();
  const currentRegion = useAdventureMapStore((s) => s.currentRegion);

  // Navigation hook
  const { navigateToLocation, canNavigate } = useMapNavigation({
    onBeforeNavigate: onLocationEnter
      ? (id, route) => {
          onLocationEnter(id, route);
          return true;
        }
      : undefined,
  });

  // Movement hook
  const {
    position,
    isMoving,
    isTeleporting,
    moveToLocation,
    handleKeyDown,
    handleMapClick,
  } = useCharacterMovement({
    enabled: true,
    reducedMotion,
    onLocationReached: (locationId, _route) => {
      navigateToLocation(locationId);
    },
  });

  // Companion data (would come from context in real app)
  const companionData: CompanionData = {
    stage: 3,
    name: 'Buddy',
    equipped: {
      aura: 'aura-cosmic',
    },
  };

  // Keyboard event listener
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Only handle if map is focused
      if (document.activeElement !== containerRef.current &&
          !containerRef.current?.contains(document.activeElement)) {
        return;
      }
      handleKeyDown(e);
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKeyDown]);

  // Focus container on mount
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  // Notify parent of character position changes
  useEffect(() => {
    if (onCharacterMove) {
      onCharacterMove(position);
    }
  }, [position, onCharacterMove]);

  // Mouse/touch handlers for pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragStart) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart, setPan]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta)));
  }, [zoom, setZoom]);

  // Touch event handlers for mobile pinch-to-zoom and pan
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touches = Array.from(e.touches).map((t) => ({
      x: t.clientX,
      y: t.clientY,
    }));

    if (touches.length === 2) {
      // Pinch zoom start
      const distance = getDistance(touches);
      const center = getCenter(touches);
      setTouchState({
        touches,
        initialDistance: distance,
        initialZoom: zoom,
        initialPan: pan,
        lastCenter: center,
      });
    } else if (touches.length === 1) {
      // Single touch pan start
      setIsDragging(true);
      setDragStart({ x: touches[0].x - pan.x, y: touches[0].y - pan.y });
      setTouchState((prev) => ({ ...prev, touches, lastCenter: touches[0] }));
    }
  }, [zoom, pan]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault(); // Prevent page scroll during map interaction

    const touches = Array.from(e.touches).map((t) => ({
      x: t.clientX,
      y: t.clientY,
    }));

    if (touches.length === 2 && touchState.initialDistance) {
      // Pinch zoom
      const distance = getDistance(touches);
      const scale = distance / touchState.initialDistance;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, touchState.initialZoom * scale));

      // Pan with center point
      const center = getCenter(touches);
      const panDelta = {
        x: center.x - touchState.lastCenter.x,
        y: center.y - touchState.lastCenter.y,
      };

      setZoom(newZoom);
      setPan({
        x: touchState.initialPan.x + panDelta.x,
        y: touchState.initialPan.y + panDelta.y,
      });
    } else if (touches.length === 1 && isDragging && dragStart) {
      // Single touch pan
      setPan({
        x: touches[0].x - dragStart.x,
        y: touches[0].y - dragStart.y,
      });
    }
  }, [touchState, isDragging, dragStart, setZoom, setPan]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      // All fingers lifted
      setIsDragging(false);
      setDragStart(null);
      setTouchState({
        touches: [],
        initialDistance: null,
        initialZoom: zoom,
        initialPan: pan,
        lastCenter: { x: 0, y: 0 },
      });
    } else if (e.touches.length === 1) {
      // One finger left - switch to pan mode
      const touch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setIsDragging(true);
      setDragStart({ x: touch.x - pan.x, y: touch.y - pan.y });
      setTouchState({
        touches: [touch],
        initialDistance: null,
        initialZoom: zoom,
        initialPan: pan,
        lastCenter: touch,
      });
    }
  }, [zoom, pan]);

  // Handle touch tap to move character (for future use with tap detection)
  const _handleTouchTap = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    // Only process if it's a quick tap (not drag)
    if (isDragging) return;

    const svg = svgRef.current;
    if (!svg) return;

    const touch = e.changedTouches[0];
    if (!touch) return;

    // Convert touch coordinates to SVG coordinates
    const rect = svg.getBoundingClientRect();
    const x = (touch.clientX - rect.left - pan.x) / zoom;
    const y = (touch.clientY - rect.top - pan.y) / zoom;

    handleMapClick({ x, y });
  }, [isDragging, pan, zoom, handleMapClick]);

  // Click on map to move character
  const handleSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging) return;

    const svg = svgRef.current;
    if (!svg) return;

    // Convert screen coordinates to SVG coordinates
    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    handleMapClick({ x, y });
  }, [isDragging, pan, zoom, handleMapClick]);

  // Check if character is near a location
  const isCharacterNearLocation = useCallback((locationId: string): boolean => {
    const location = getAllLocations().find((l) => l.id === locationId);
    if (!location) return false;

    const dx = position.x - location.position.x;
    const dy = position.y - location.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance < 40;
  }, [position]);

  // Get regions to render
  const regions = getAllRegions();

  return (
    <div
      ref={containerRef}
      className={`adventure-map-canvas relative overflow-hidden bg-gradient-to-b from-[#0a0a12] to-[#14141c] touch-none ${className}`}
      tabIndex={0}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      {/* Background stars/particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.1, 0.4, 0.1],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              repeat: Infinity,
              duration: 2 + Math.random() * 3,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* SVG Map */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        className="w-full h-full"
        onClick={handleSvgClick}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
        }}
      >
        {/* Global filters */}
        <defs>
          <filter id="map-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="10" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Paths layer (roads between locations) */}
        <g className="paths-layer">
          {PATH_CONNECTIONS.map((path, index) => (
            <MapPath
              key={`${path.from}-${path.to}-${index}`}
              path={{ id: `${path.from}-${path.to}`, from: path.from, to: path.to, style: path.style }}
              isActive={isMoving && (path.from === selected || path.to === selected)}
              isHighlighted={path.from === hovered || path.to === hovered}
            />
          ))}
        </g>

        {/* Regions layer */}
        <g className="regions-layer">
          {regions.map((region) => (
            <MapRegion
              key={region.id}
              region={region}
              isActive={currentRegion === region.id}
            >
              {/* Locations within this region */}
              {getAllLocations().filter((loc) => loc.region === region.id).map((location) => (
                <LocationNode
                  key={location.id}
                  location={location}
                  isSelected={selected === location.id}
                  isHovered={hovered === location.id}
                  isVisited={hasVisited(location.id)}
                  isCharacterNearby={isCharacterNearLocation(location.id)}
                  onClick={() => {
                    if (canNavigate(location.id)) {
                      moveToLocation(location.id);
                    }
                  }}
                  onHover={(hovering) => setHovered(hovering ? location.id : null)}
                />
              ))}
            </MapRegion>
          ))}
        </g>

        {/* Character layer */}
        <g className="character-layer">
          <MapCharacter
            position={position}
            state={isMoving ? 'walking' : isTeleporting ? 'teleporting' : 'idle'}
            companionData={companionData}
            reducedMotion={reducedMotion}
          />
        </g>
      </svg>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
        <button
          onClick={() => zoomIn()}
          className="w-10 h-10 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 text-white hover:bg-white/10 transition-colors flex items-center justify-center"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          onClick={() => zoomOut()}
          className="w-10 h-10 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 text-white hover:bg-white/10 transition-colors flex items-center justify-center"
          aria-label="Zoom out"
        >
          -
        </button>
        <button
          onClick={() => center()}
          className="w-10 h-10 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 text-white hover:bg-white/10 transition-colors flex items-center justify-center text-lg"
          aria-label="Center on character"
        >
          ◎
        </button>
        <button
          onClick={() => reset()}
          className="w-10 h-10 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 text-white hover:bg-white/10 transition-colors flex items-center justify-center text-sm"
          aria-label="Reset view"
        >
          ↺
        </button>
      </div>

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg border border-white/10 p-3 z-10">
        <div className="text-white/60 text-xs mb-2 font-medium">CONTROLS</div>
        <div className="text-white/80 text-xs space-y-1">
          <div>Arrow/WASD - Move</div>
          <div>Click - Go to location</div>
          <div>Enter - Enter location</div>
          <div>Drag - Pan map</div>
          <div>Scroll - Zoom</div>
        </div>
      </div>

      {/* Current region indicator */}
      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg border border-white/10 px-4 py-2 z-10">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{REGIONS[currentRegion]?.icon || '🏰'}</span>
          <div>
            <div className="text-white font-medium text-sm">
              {REGIONS[currentRegion]?.name || 'Unknown'}
            </div>
            <div className="text-white/50 text-xs">
              {visited.length} / {getAllLocations().filter((l) => !l.requiredRole).length} discovered
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
