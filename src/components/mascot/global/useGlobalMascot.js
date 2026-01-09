/**
 * useGlobalMascot Hook
 *
 * Provides global mascot configuration and placement data.
 * The global mascot is static and site-wide (not user-specific).
 */

import { useState, useEffect, useMemo, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export function useGlobalMascot() {
  const [config, setConfig] = useState(null);
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Check for WebGL support
  const hasWebGL = useMemo(() => {
    if (typeof window === 'undefined') return false;
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('webgl2'));
    } catch {
      return false;
    }
  }, []);

  // Whether to use 3D rendering
  const use3D = hasWebGL && !prefersReducedMotion;

  // Fetch config and placements
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [configRes, placementsRes] = await Promise.all([
          fetch(`${API_BASE}/api/mascot/global/config`),
          fetch(`${API_BASE}/api/mascot/global/placements`),
        ]);

        if (configRes.ok) {
          const configData = await configRes.json();
          setConfig(configData.data);
        }

        if (placementsRes.ok) {
          const placementsData = await placementsRes.json();
          setPlacements(placementsData.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch global mascot data:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get placement by location
  const getPlacement = useCallback(
    (location) => placements.find((p) => p.location === location),
    [placements]
  );

  return {
    config,
    placements,
    loading,
    error,
    prefersReducedMotion,
    hasWebGL,
    use3D,
    getPlacement,
  };
}

export default useGlobalMascot;
