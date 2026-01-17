/**
 * MapExplore Page
 *
 * Full-page interactive map navigation with three visualization modes.
 */

import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Maximize2, Minimize2 } from 'lucide-react';
import { MapMenu } from '../components/map-menu';

export default function MapExplore() {
  const location = useLocation();
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  // Toggle fullscreen
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-void-base"
    >
      {/* Header */}
      <header className="
        fixed top-0 left-0 right-0 z-50
        bg-glass-dark-30 backdrop-blur-glass-lg
        border-b border-glass-default
      ">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Back button */}
          <Link
            to="/dashboard"
            className="
              flex items-center gap-2 px-3 py-1.5 rounded-glass-md
              text-white/70 hover:text-white hover:bg-glass-white-5
              transition-colors duration-fast
            "
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </Link>

          {/* Title */}
          <h1 className="text-white font-semibold">
            Explore MuscleMap
          </h1>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="
              flex items-center gap-2 px-3 py-1.5 rounded-glass-md
              text-white/70 hover:text-white hover:bg-glass-white-5
              transition-colors duration-fast
            "
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </header>

      {/* Map container */}
      <main className="pt-14 h-screen">
        <MapMenu
          mode="full"
          currentRoute={location.pathname}
          className="h-full rounded-none"
        />
      </main>
    </motion.div>
  );
}
