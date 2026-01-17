/**
 * Anatomy Viewer - Development Page
 * For testing and previewing 3D anatomy models with muscle highlighting
 */

import React, { useState, useCallback, useMemo } from 'react';
import { AnatomyModel } from '../../components/anatomy';
import { anatomyRegistry } from '../../lib/anatomy';
import type { LODLevel } from '../../lib/anatomy';

// Muscle groups for organized highlighting
const MUSCLE_GROUPS = {
  chest: ['Pectoralis major.l', 'Pectoralis major.r', 'Pectoralis minor.l', 'Pectoralis minor.r'],
  back: ['Latissimus dorsi.l', 'Latissimus dorsi.r', 'Trapezius.l', 'Trapezius.r', 'Rhomboid major.l', 'Rhomboid major.r'],
  shoulders: ['Deltoid.l', 'Deltoid.r', 'Acromial part of deltoid muscle.l', 'Acromial part of deltoid muscle.r'],
  arms: [
    'Biceps brachii.l', 'Biceps brachii.r',
    'Triceps brachii.l', 'Triceps brachii.r',
    'Brachialis.l', 'Brachialis.r',
  ],
  forearms: [
    'Brachioradialis.l', 'Brachioradialis.r',
    'Pronator teres.l', 'Pronator teres.r',
  ],
  core: [
    'Rectus abdominis.l', 'Rectus abdominis.r',
    'External oblique muscle.l', 'External oblique muscle.r',
    'Internal oblique muscle.l', 'Internal oblique muscle.r',
  ],
  legs: [
    'Quadriceps femoris.l', 'Quadriceps femoris.r',
    'Rectus femoris.l', 'Rectus femoris.r',
    'Vastus lateralis.l', 'Vastus lateralis.r',
    'Vastus medialis.l', 'Vastus medialis.r',
    'Biceps femoris.l', 'Biceps femoris.r',
    'Semitendinosus.l', 'Semitendinosus.r',
    'Semimembranosus.l', 'Semimembranosus.r',
  ],
  glutes: [
    'Gluteus maximus.l', 'Gluteus maximus.r',
    'Gluteus medius.l', 'Gluteus medius.r',
    'Gluteus minimus.l', 'Gluteus minimus.r',
  ],
  calves: [
    'Gastrocnemius.l', 'Gastrocnemius.r',
    'Soleus.l', 'Soleus.r',
    'Tibialis anterior.l', 'Tibialis anterior.r',
  ],
};

export default function AnatomyViewer() {
  const [selectedLOD, setSelectedLOD] = useState<LODLevel>('low');
  const [autoRotate, setAutoRotate] = useState(true);
  const [highlightedMuscles, setHighlightedMuscles] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [hoveredMesh, setHoveredMesh] = useState<string | null>(null);
  const [clickedMesh, setClickedMesh] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Get available assets from registry
  const assets = useMemo(() => anatomyRegistry.listAssets(), []);
  const [selectedAsset, setSelectedAsset] = useState(assets[0]?.key || 'male_muscles');

  // Get muscle names from selected asset
  const muscleNames = useMemo(() => {
    return anatomyRegistry.getMuscleNames(selectedAsset);
  }, [selectedAsset]);

  // Filter muscle names by search
  const filteredMuscles = useMemo(() => {
    if (!searchQuery) return muscleNames.slice(0, 50); // Limit to 50 for performance
    const query = searchQuery.toLowerCase();
    return muscleNames.filter(name => name.toLowerCase().includes(query)).slice(0, 50);
  }, [muscleNames, searchQuery]);

  // Toggle muscle group highlighting
  const toggleMuscleGroup = useCallback((groupName: string) => {
    setSelectedGroups(prev => {
      const isSelected = prev.includes(groupName);
      if (isSelected) {
        const newGroups = prev.filter(g => g !== groupName);
        // Remove muscles from this group
        const groupMuscles = MUSCLE_GROUPS[groupName as keyof typeof MUSCLE_GROUPS] || [];
        setHighlightedMuscles(current => current.filter(m => !groupMuscles.includes(m)));
        return newGroups;
      } else {
        const newGroups = [...prev, groupName];
        // Add muscles from this group
        const groupMuscles = MUSCLE_GROUPS[groupName as keyof typeof MUSCLE_GROUPS] || [];
        setHighlightedMuscles(current => [...new Set([...current, ...groupMuscles])]);
        return newGroups;
      }
    });
  }, []);

  // Toggle individual muscle
  const toggleMuscle = useCallback((muscleName: string) => {
    setHighlightedMuscles(prev => {
      const isHighlighted = prev.includes(muscleName);
      if (isHighlighted) {
        return prev.filter(m => m !== muscleName);
      } else {
        return [...prev, muscleName];
      }
    });
  }, []);

  // Clear all highlights
  const clearHighlights = useCallback(() => {
    setHighlightedMuscles([]);
    setSelectedGroups([]);
  }, []);

  // Handle mesh click
  const handleMeshClick = useCallback((meshName: string) => {
    setClickedMesh(meshName);
    toggleMuscle(meshName);
  }, [toggleMuscle]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Anatomy Model Viewer</h1>
              <p className="text-sm text-white/60">Development tool for testing 3D anatomy models</p>
            </div>
            <a
              href="/dashboard"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 3D Viewer */}
          <div className="lg:col-span-2">
            <div className="bg-black/40 rounded-xl border border-white/10 overflow-hidden">
              <div className="h-[600px]">
                <AnatomyModel
                  assetKey={selectedAsset}
                  lod={selectedLOD}
                  autoRotate={autoRotate}
                  highlightedMuscles={highlightedMuscles}
                  onMeshClick={handleMeshClick}
                  onMeshHover={setHoveredMesh}
                  className="w-full h-full"
                />
              </div>

              {/* Viewer Controls */}
              <div className="p-4 border-t border-white/10 bg-black/20">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Asset Selector */}
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Asset</label>
                    <select
                      value={selectedAsset}
                      onChange={(e) => setSelectedAsset(e.target.value)}
                      className="bg-white/10 border border-white/20 rounded px-3 py-1.5 text-sm"
                    >
                      {assets.map(({ key, asset }) => (
                        <option key={key} value={key}>
                          {asset.id} ({asset.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* LOD Selector */}
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Quality (LOD)</label>
                    <div className="flex gap-1">
                      {(['low', 'medium', 'high'] as LODLevel[]).map((lod) => (
                        <button
                          key={lod}
                          onClick={() => setSelectedLOD(lod)}
                          className={`px-3 py-1.5 text-sm rounded transition-colors ${
                            selectedLOD === lod
                              ? 'bg-violet-600 text-white'
                              : 'bg-white/10 hover:bg-white/20'
                          }`}
                        >
                          {lod.charAt(0).toUpperCase() + lod.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Auto Rotate Toggle */}
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Auto Rotate</label>
                    <button
                      onClick={() => setAutoRotate(!autoRotate)}
                      className={`px-3 py-1.5 text-sm rounded transition-colors ${
                        autoRotate
                          ? 'bg-green-600 text-white'
                          : 'bg-white/10 hover:bg-white/20'
                      }`}
                    >
                      {autoRotate ? 'On' : 'Off'}
                    </button>
                  </div>

                  {/* Clear Highlights */}
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Highlights</label>
                    <button
                      onClick={clearHighlights}
                      className="px-3 py-1.5 text-sm rounded bg-red-600/20 hover:bg-red-600/40 text-red-400 transition-colors"
                    >
                      Clear All ({highlightedMuscles.length})
                    </button>
                  </div>
                </div>

                {/* Hover/Click Info */}
                {(hoveredMesh || clickedMesh) && (
                  <div className="mt-4 p-3 bg-white/5 rounded-lg">
                    {hoveredMesh && (
                      <p className="text-sm">
                        <span className="text-white/60">Hovering:</span>{' '}
                        <span className="text-violet-400">{hoveredMesh}</span>
                      </p>
                    )}
                    {clickedMesh && (
                      <p className="text-sm">
                        <span className="text-white/60">Last Clicked:</span>{' '}
                        <span className="text-green-400">{clickedMesh}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Control Panel */}
          <div className="space-y-4">
            {/* Muscle Groups */}
            <div className="bg-black/40 rounded-xl border border-white/10 p-4">
              <h2 className="text-lg font-semibold mb-3">Muscle Groups</h2>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(MUSCLE_GROUPS).map((group) => (
                  <button
                    key={group}
                    onClick={() => toggleMuscleGroup(group)}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                      selectedGroups.includes(group)
                        ? 'bg-violet-600 text-white'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    {group.charAt(0).toUpperCase() + group.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Individual Muscles Search */}
            <div className="bg-black/40 rounded-xl border border-white/10 p-4">
              <h2 className="text-lg font-semibold mb-3">Individual Muscles</h2>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search muscles..."
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm mb-3"
              />
              <div className="max-h-64 overflow-y-auto space-y-1">
                {filteredMuscles.map((muscle) => (
                  <button
                    key={muscle}
                    onClick={() => toggleMuscle(muscle)}
                    className={`w-full text-left px-3 py-1.5 text-xs rounded transition-colors ${
                      highlightedMuscles.includes(muscle)
                        ? 'bg-violet-600/40 text-violet-200'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {muscle}
                  </button>
                ))}
                {filteredMuscles.length === 0 && (
                  <p className="text-sm text-white/40 text-center py-4">No muscles found</p>
                )}
              </div>
              <p className="text-xs text-white/40 mt-2">
                Showing {filteredMuscles.length} of {muscleNames.length} muscles
              </p>
            </div>

            {/* Currently Highlighted */}
            {highlightedMuscles.length > 0 && (
              <div className="bg-black/40 rounded-xl border border-white/10 p-4">
                <h2 className="text-lg font-semibold mb-3">
                  Highlighted ({highlightedMuscles.length})
                </h2>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {highlightedMuscles.map((muscle) => (
                    <div
                      key={muscle}
                      className="flex items-center justify-between px-2 py-1 bg-violet-600/20 rounded"
                    >
                      <span className="text-xs text-violet-200 truncate">{muscle}</span>
                      <button
                        onClick={() => toggleMuscle(muscle)}
                        className="text-violet-400 hover:text-red-400 ml-2"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Asset Info */}
            <div className="bg-black/40 rounded-xl border border-white/10 p-4">
              <h2 className="text-lg font-semibold mb-3">Asset Info</h2>
              {(() => {
                const asset = anatomyRegistry.getAsset(selectedAsset);
                if (!asset) return <p className="text-sm text-white/40">Asset not found</p>;
                return (
                  <div className="space-y-2 text-sm">
                    <p><span className="text-white/60">ID:</span> {asset.id}</p>
                    <p><span className="text-white/60">Type:</span> {asset.type}</p>
                    <p><span className="text-white/60">Sex:</span> {asset.sex}</p>
                    <p><span className="text-white/60">Meshes:</span> {asset.metadata.meshCount}</p>
                    <p>
                      <span className="text-white/60">Triangles (high):</span>{' '}
                      {asset.metadata.triangleCount.high?.toLocaleString()}
                    </p>
                    <p>
                      <span className="text-white/60">License:</span>{' '}
                      <a
                        href={asset.license.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-400 hover:underline"
                      >
                        {asset.license.spdxId}
                      </a>
                    </p>
                    <p className="text-xs text-white/40 mt-2">{asset.license.attribution}</p>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
