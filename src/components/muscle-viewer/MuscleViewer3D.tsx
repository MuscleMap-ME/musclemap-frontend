/**
 * MuscleViewer3D
 * Three.js-based 3D muscle visualization component
 */

import React, { Suspense, useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows, useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';
import clsx from 'clsx';
import { anatomyRegistry } from '../../lib/anatomy/registry';
import type { MuscleViewer3DProps, MuscleActivation, ViewPreset } from './types';
import MuscleViewerSkeleton from './MuscleViewerSkeleton';

// ============================================
// CONSTANTS
// ============================================

const VIEW_POSITIONS: Record<ViewPreset, { position: [number, number, number]; target: [number, number, number] }> = {
  front: { position: [0, 0, 3], target: [0, 0, 0] },
  back: { position: [0, 0, -3], target: [0, 0, 0] },
  left: { position: [-3, 0, 0], target: [0, 0, 0] },
  right: { position: [3, 0, 0], target: [0, 0, 0] },
  isometric: { position: [2, 1.5, 2.5], target: [0, 0, 0] },
};

/**
 * Mapping from our muscle IDs to mesh name patterns in the Z-Anatomy model
 */
const MUSCLE_MESH_PATTERNS: Record<string, string[]> = {
  chest: ['pectoralis major', 'pectoralis minor'],
  abs: ['rectus abdominis', 'abdomin'],
  obliques: ['oblique', 'external oblique', 'internal oblique'],
  front_delts: ['deltoid', 'anterior deltoid'],
  upper_back: ['rhomboid', 'trapezius'],
  lats: ['latissimus'],
  lower_back: ['erector', 'quadratus lumborum'],
  rear_delts: ['posterior deltoid'],
  traps: ['trapezius'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  forearms: ['brachioradialis', 'flexor', 'extensor', 'pronator'],
  side_delts: ['lateral deltoid', 'middle deltoid'],
  quads: ['quadriceps', 'rectus femoris', 'vastus'],
  hip_flexors: ['iliopsoas', 'psoas', 'iliacus'],
  adductors: ['adductor'],
  glutes: ['gluteus', 'gluteal'],
  hamstrings: ['hamstring', 'biceps femoris', 'semitendinosus', 'semimembranosus'],
  calves: ['gastrocnemius', 'soleus', 'calf'],
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get color from intensity (0-1) using heatmap gradient
 */
function getIntensityColor(intensity: number): THREE.Color {
  if (intensity <= 0) {
    return new THREE.Color(0.5, 0.3, 0.3); // Base muscle color
  }

  // Blue -> Green -> Yellow -> Red
  if (intensity < 0.25) {
    const t = intensity * 4;
    return new THREE.Color(0.2, 0.2 + t * 0.5, 0.8);
  } else if (intensity < 0.5) {
    const t = (intensity - 0.25) * 4;
    return new THREE.Color(t, 0.7, 0.8 - t * 0.8);
  } else if (intensity < 0.75) {
    const t = (intensity - 0.5) * 4;
    return new THREE.Color(1, 0.7 - t * 0.3, 0);
  } else {
    const t = (intensity - 0.75) * 4;
    return new THREE.Color(1, 0.4 - t * 0.4, 0);
  }
}

/**
 * Check if a mesh name matches a muscle group
 */
function meshMatchesMuscle(meshName: string, muscleId: string): boolean {
  const patterns = MUSCLE_MESH_PATTERNS[muscleId];
  if (!patterns) return false;

  const lowerName = meshName.toLowerCase();
  return patterns.some(pattern => lowerName.includes(pattern.toLowerCase()));
}

// ============================================
// MODEL SCENE COMPONENT
// ============================================

interface ModelSceneProps {
  filePath: string;
  muscles: MuscleActivation[];
  autoRotate: boolean;
  interactive: boolean;
  showLabels: boolean;
  onMeshClick?: (meshName: string) => void;
  onMeshHover?: (meshName: string | null) => void;
}

function ModelScene({
  filePath,
  muscles,
  autoRotate,
  interactive,
  showLabels,
  onMeshClick,
  onMeshHover,
}: ModelSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const materialsRef = useRef<Map<string, THREE.MeshStandardMaterial>>(new Map());
  const [hoveredMesh, setHoveredMesh] = useState<string | null>(null);

  // Load the model
  const { scene } = useGLTF(filePath);

  // Build muscle intensity map
  const intensityMap = useMemo(() => {
    const map: Record<string, number> = {};
    muscles.forEach(({ id, intensity, isPrimary }) => {
      // Primary muscles get full intensity, secondary get 50%
      const adjustedIntensity = isPrimary !== false ? intensity : intensity * 0.5;
      map[id] = Math.max(map[id] || 0, adjustedIntensity);
    });
    return map;
  }, [muscles]);

  // Extract and setup meshes on load
  useEffect(() => {
    if (!scene) return;

    meshesRef.current.clear();
    materialsRef.current.clear();

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name) {
        meshesRef.current.set(child.name, child);

        // Clone material for independent manipulation
        if (child.material instanceof THREE.MeshStandardMaterial) {
          const material = child.material.clone();
          material.transparent = true;
          material.roughness = 0.6;
          material.metalness = 0.1;
          child.material = material;
          materialsRef.current.set(child.name, material);
        }
      }
    });
  }, [scene]);

  // Apply muscle highlighting based on intensities
  useEffect(() => {
    materialsRef.current.forEach((material, meshName) => {
      // Find which muscle group this mesh belongs to
      let matchedIntensity = 0;

      Object.entries(intensityMap).forEach(([muscleId, intensity]) => {
        if (meshMatchesMuscle(meshName, muscleId)) {
          if (intensity > matchedIntensity) {
            matchedIntensity = intensity;
          }
        }
      });

      const color = getIntensityColor(matchedIntensity);
      material.color.copy(color);

      // Add emissive glow for high intensity
      if (matchedIntensity > 0.3) {
        material.emissive.copy(color);
        material.emissiveIntensity = matchedIntensity * 0.3;
      } else {
        material.emissive.setHex(0x000000);
        material.emissiveIntensity = 0;
      }

      material.opacity = matchedIntensity > 0 ? 0.85 + matchedIntensity * 0.15 : 0.7;
      material.needsUpdate = true;
    });
  }, [intensityMap]);

  // Handle hover state
  useEffect(() => {
    if (!hoveredMesh) return;

    const material = materialsRef.current.get(hoveredMesh);
    if (material) {
      material.emissive.setHex(0x4488ff);
      material.emissiveIntensity = 0.4;
      material.needsUpdate = true;
    }

    return () => {
      if (material) {
        // Reset to intensity-based emissive
        let matchedIntensity = 0;
        Object.entries(intensityMap).forEach(([muscleId, intensity]) => {
          if (meshMatchesMuscle(hoveredMesh, muscleId)) {
            matchedIntensity = Math.max(matchedIntensity, intensity);
          }
        });

        if (matchedIntensity > 0.3) {
          const color = getIntensityColor(matchedIntensity);
          material.emissive.copy(color);
          material.emissiveIntensity = matchedIntensity * 0.3;
        } else {
          material.emissive.setHex(0x000000);
          material.emissiveIntensity = 0;
        }
        material.needsUpdate = true;
      }
    };
  }, [hoveredMesh, intensityMap]);

  // Auto-rotation
  useFrame((_, delta) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  const handlePointerOver = useCallback((e: THREE.Event) => {
    if (!interactive) return;
    e.stopPropagation();
    const mesh = e.object as THREE.Mesh;
    if (mesh.name) {
      setHoveredMesh(mesh.name);
      onMeshHover?.(mesh.name);
      document.body.style.cursor = 'pointer';
    }
  }, [interactive, onMeshHover]);

  const handlePointerOut = useCallback(() => {
    if (!interactive) return;
    setHoveredMesh(null);
    onMeshHover?.(null);
    document.body.style.cursor = 'auto';
  }, [interactive, onMeshHover]);

  const handleClick = useCallback((e: THREE.Event) => {
    if (!interactive) return;
    e.stopPropagation();
    const mesh = e.object as THREE.Mesh;
    if (mesh.name) {
      // Find which muscle group this mesh belongs to
      Object.keys(MUSCLE_MESH_PATTERNS).forEach(muscleId => {
        if (meshMatchesMuscle(mesh.name, muscleId)) {
          onMeshClick?.(muscleId);
        }
      });
    }
  }, [interactive, onMeshClick]);

  return (
    <group ref={groupRef}>
      <primitive
        object={scene}
        scale={0.01}
        position={[0, -1, 0]}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      />

      {/* Hover label */}
      {showLabels && hoveredMesh && (
        <Html position={[0, 1.5, 0]} center>
          <div className="px-2 py-1 bg-black/80 text-white text-xs rounded whitespace-nowrap">
            {hoveredMesh.replace(/\.[lr]$/, '').replace(/_/g, ' ')}
          </div>
        </Html>
      )}
    </group>
  );
}

// ============================================
// CAMERA CONTROLLER
// ============================================

interface CameraControllerProps {
  view: ViewPreset;
  interactive: boolean;
}

function CameraController({ view, interactive }: CameraControllerProps) {
  const { camera } = useThree();
  const controlsRef = useRef<typeof OrbitControls>(null);

  useEffect(() => {
    const viewConfig = VIEW_POSITIONS[view];
    if (viewConfig) {
      camera.position.set(...viewConfig.position);
      camera.lookAt(...viewConfig.target);
    }
  }, [view, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={interactive}
      enablePan={false}
      minDistance={1.5}
      maxDistance={6}
      minPolarAngle={Math.PI * 0.1}
      maxPolarAngle={Math.PI * 0.9}
    />
  );
}

// ============================================
// LOADING FALLBACK
// ============================================

function LoadingFallback() {
  return (
    <Html center>
      <MuscleViewerSkeleton mode="inline" />
    </Html>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function MuscleViewer3D({
  muscles,
  mode = 'card',
  interactive = true,
  showLabels = true,
  autoRotate = false,
  initialView = 'front',
  colorScheme: _colorScheme = 'heatmap',
  lod,
  onMuscleClick,
  onMuscleHover,
  className,
  style,
}: MuscleViewer3DProps): React.ReactElement {
  const [currentView, setCurrentView] = useState<ViewPreset>(initialView);

  // Get asset and file path
  const asset = anatomyRegistry.getAsset('male_muscles');
  const filePath = asset ? anatomyRegistry.getFilePath(asset, lod) : null;

  if (!filePath) {
    return (
      <div className={clsx('flex items-center justify-center bg-[var(--void-deep,#0a0f1a)]', className)} style={style}>
        <p className="text-[var(--text-tertiary,#94a3b8)] text-sm">Model not available</p>
      </div>
    );
  }

  // Mode-specific sizing
  const modeStyles: Record<string, React.CSSProperties> = {
    compact: { width: 120, height: 160 },
    card: { width: 200, height: 280 },
    fullscreen: { width: '100%', height: '100%', minHeight: 400 },
    inline: { width: 80, height: 100 },
  };

  return (
    <div
      className={clsx(
        'relative rounded-xl overflow-hidden',
        'bg-gradient-to-b from-[var(--void-deep,#0a0f1a)] to-[var(--void-deeper,#050810)]',
        className
      )}
      style={{ ...modeStyles[mode], ...style }}
    >
      <Canvas
        camera={{ position: VIEW_POSITIONS[currentView].position, fov: 45 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.7} />
        <directionalLight position={[-5, 5, -5]} intensity={0.3} />
        <pointLight position={[0, 10, 0]} intensity={0.2} color="#4488ff" />

        <Suspense fallback={<LoadingFallback />}>
          <ModelScene
            filePath={filePath}
            muscles={muscles}
            autoRotate={autoRotate}
            interactive={interactive}
            showLabels={showLabels}
            onMeshClick={onMuscleClick}
            onMeshHover={onMuscleHover}
          />
          <ContactShadows
            position={[0, -1.5, 0]}
            opacity={0.3}
            scale={8}
            blur={2}
            color="#000020"
          />
        </Suspense>

        <CameraController view={currentView} interactive={interactive} />
      </Canvas>

      {/* View controls (for card and fullscreen modes) */}
      {(mode === 'card' || mode === 'fullscreen') && interactive && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          {(['front', 'back', 'left', 'right'] as ViewPreset[]).map((view) => (
            <button
              key={view}
              onClick={() => setCurrentView(view)}
              className={clsx(
                'px-2 py-1 text-xs rounded transition-colors',
                currentView === view
                  ? 'bg-[var(--electric-blue,#0066ff)] text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              )}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default MuscleViewer3D;
