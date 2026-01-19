/**
 * AnatomyModel Component
 * Renders a 3D anatomy model with muscle visualization support
 */

import React, { Suspense, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { anatomyRegistry } from '../../lib/anatomy/registry';
import { useMuscleHighlight } from '../../lib/anatomy/loader';
import type { LODLevel, AnatomyAsset } from '../../lib/anatomy/types';

interface ModelSceneProps {
  filePath: string;
  asset: AnatomyAsset;
  autoRotate: boolean;
  highlightedMuscles: string[];
  onMeshClick?: (meshName: string) => void;
  onMeshHover?: (meshName: string | null) => void;
}

function ModelScene({
  filePath,
  asset: _asset,
  autoRotate,
  highlightedMuscles,
  onMeshClick,
  onMeshHover,
}: ModelSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const { scene } = useGLTF(filePath);

  // Extract meshes on load
  useEffect(() => {
    if (!scene) return;

    meshesRef.current.clear();
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshesRef.current.set(child.name, child);

        // Make materials manipulable
        if (child.material instanceof THREE.MeshStandardMaterial) {
          child.material = child.material.clone();
          child.material.transparent = true;
        }
      }
    });
  }, [scene]);

  // Apply muscle highlighting
  useMuscleHighlight(meshesRef.current, highlightedMuscles);

  // Auto-rotation
  useFrame((_, delta) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive
        object={scene}
        scale={0.01} // Scale down from meters to reasonable size
        position={[0, -1, 0]}
        onClick={(e: THREE.Event) => {
          e.stopPropagation();
          const mesh = e.object as THREE.Mesh;
          if (mesh.name && onMeshClick) {
            onMeshClick(mesh.name);
          }
        }}
        onPointerOver={(e: THREE.Event) => {
          e.stopPropagation();
          const mesh = e.object as THREE.Mesh;
          if (mesh.name && onMeshHover) {
            onMeshHover(mesh.name);
            document.body.style.cursor = 'pointer';
          }
        }}
        onPointerOut={() => {
          onMeshHover?.(null);
          document.body.style.cursor = 'auto';
        }}
      />
    </group>
  );
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 1, 0.3]} />
      <meshStandardMaterial color="#333" wireframe />
    </mesh>
  );
}

interface AnatomyModelProps {
  assetKey?: string;
  lod?: LODLevel;
  autoRotate?: boolean;
  showControls?: boolean;
  highlightedMuscles?: string[];
  onMeshClick?: (meshName: string) => void;
  onMeshHover?: (meshName: string | null) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function AnatomyModel({
  assetKey,
  lod = 'low',
  autoRotate = false,
  showControls = true,
  highlightedMuscles = [],
  onMeshClick,
  onMeshHover,
  className = '',
  style,
}: AnatomyModelProps) {
  const [_error, _setError] = useState<string | null>(null);

  // Get asset from registry, default to male_muscles if not specified
  const effectiveAssetKey = assetKey || 'male_muscles';
  const asset = anatomyRegistry.getAsset(effectiveAssetKey);

  // Get file path for the requested LOD
  const filePath = asset ? anatomyRegistry.getFilePath(asset, lod) : null;

  if (!asset) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 text-red-400 ${className}`} style={style}>
        <p>Asset not found: {effectiveAssetKey}</p>
      </div>
    );
  }

  if (!filePath) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 text-red-400 ${className}`} style={style}>
        <p>No {lod} LOD available for this asset</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 text-red-400 ${className}`} style={style}>
        <p>Error loading model: {error}</p>
      </div>
    );
  }

  return (
    <div className={`w-full h-full ${className}`} style={style}>
      <Canvas
        camera={{ position: [0, 0, 3], fov: 45 }}
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
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <directionalLight position={[-5, 5, -5]} intensity={0.4} />
        <pointLight position={[0, 10, 0]} intensity={0.3} />

        <Suspense fallback={<LoadingFallback />}>
          <ModelScene
            filePath={filePath}
            asset={asset}
            autoRotate={autoRotate}
            highlightedMuscles={highlightedMuscles}
            onMeshClick={onMeshClick}
            onMeshHover={onMeshHover}
          />
          <ContactShadows position={[0, -1.5, 0]} opacity={0.4} scale={10} blur={2} />
        </Suspense>

        {showControls && (
          <OrbitControls
            enablePan={false}
            minDistance={1}
            maxDistance={10}
            minPolarAngle={0}
            maxPolarAngle={Math.PI}
          />
        )}
      </Canvas>
    </div>
  );
}

export default AnatomyModel;
