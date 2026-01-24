/**
 * GlobalMascot3D
 *
 * 3D WebGL rendering of the TЯIPTθMΞAN Spirit global mascot.
 * Uses React Three Fiber for rendering.
 *
 * CRITICAL: Falls back to 2D version when WebGL is unavailable
 * (iOS Lockdown Mode, Brave Shields, etc.)
 */

import React, { useRef, useMemo, Suspense, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars } from '@react-three/drei';
import * as _THREE from 'three';
import { getIsRestrictive, getCapabilities } from '../../../utils/safeMotion';
import GlobalMascot2D from './GlobalMascot2D';

// Animation speed configurations by state
const ANIMATION_SPEEDS = {
  idle: { rotation: 0.2, float: 1, pulse: 0.5 },
  greeting: { rotation: 0.5, float: 2, pulse: 1 },
  loading: { rotation: 1, float: 0.5, pulse: 2 },
  celebrating: { rotation: 0.8, float: 3, pulse: 1.5 },
  contemplating: { rotation: 0.1, float: 0.5, pulse: 0.3 },
};

// Size to scale mapping
const SIZE_SCALES = {
  small: 0.5,
  medium: 0.8,
  large: 1.2,
};

// Camera distance by size
const CAMERA_DISTANCES = {
  small: 4,
  medium: 5,
  large: 6,
};

/**
 * ThetaSpirit - The main 3D mascot geometry
 */
function ThetaSpirit({ animationState = 'idle', scale = 1 }) {
  const groupRef = useRef();
  const particlesRef = useRef();
  const glowRef = useRef();

  const speeds = ANIMATION_SPEEDS[animationState] || ANIMATION_SPEEDS.idle;

  // Generate particle positions
  const particlePositions = useMemo(() => {
    const positions = new Float32Array(150 * 3);
    for (let i = 0; i < 150; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const radius = 1.5 + Math.random();
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    return positions;
  }, []);

  // Animation loop
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005 * speeds.rotation;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }

    if (particlesRef.current) {
      particlesRef.current.rotation.y -= 0.002;
    }

    if (glowRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * speeds.pulse) * 0.1 + 1;
      glowRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <Float speed={speeds.float} rotationIntensity={0.3} floatIntensity={0.5}>
      <group ref={groupRef} scale={scale}>
        {/* Main theta torus */}
        <mesh>
          <torusGeometry args={[1, 0.3, 32, 64]} />
          <meshStandardMaterial
            color="#7c3aed"
            emissive="#7c3aed"
            emissiveIntensity={0.4}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>

        {/* Horizontal bar */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.15, 0.15, 1.4, 16]} />
          <meshStandardMaterial
            color="#a855f7"
            emissive="#a855f7"
            emissiveIntensity={0.6}
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>

        {/* Inner glow ring */}
        <mesh ref={glowRef}>
          <torusGeometry args={[1.3, 0.05, 16, 64]} />
          <meshBasicMaterial color="#c4b5fd" transparent opacity={0.3} />
        </mesh>

        {/* Outer halo */}
        <mesh>
          <torusGeometry args={[1.6, 0.02, 16, 64]} />
          <meshBasicMaterial color="#e9d5ff" transparent opacity={0.2} />
        </mesh>

        {/* Orbiting particles */}
        <points ref={particlesRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={150}
              array={particlePositions}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.03}
            color="#c4b5fd"
            transparent
            opacity={0.6}
            sizeAttenuation
          />
        </points>
      </group>
    </Float>
  );
}

/**
 * Loading fallback for Suspense
 */
function LoadingFallback() {
  return (
    <mesh>
      <torusGeometry args={[1, 0.3, 16, 32]} />
      <meshBasicMaterial color="#7c3aed" wireframe />
    </mesh>
  );
}

/**
 * Check if WebGL is available and working
 */
function checkWebGLAvailable(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return false;

    // Check for specific WebGL extensions that indicate full support
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      // Some restrictive modes return a software renderer or limited info
      if (renderer && renderer.includes('SwiftShader')) return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * GlobalMascot3D Component
 *
 * Falls back to 2D rendering in:
 * - iOS Lockdown Mode (WebGL disabled)
 * - Brave Shields restrictive mode
 * - Any environment where WebGL is unavailable
 */
export default function GlobalMascot3D({
  animationState = 'idle',
  size = 'medium',
  showStars = true,
  className = '',
}) {
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);
  const isRestrictive = getIsRestrictive();

  // Check WebGL availability on mount
  useEffect(() => {
    // Skip WebGL entirely in restrictive environments
    if (isRestrictive) {
      setWebglAvailable(false);
      return;
    }

    // Check if browser capabilities indicate WebGL is available
    const caps = getCapabilities();
    if (!caps.webgl) {
      setWebglAvailable(false);
      return;
    }

    // Double-check with actual WebGL context creation
    setWebglAvailable(checkWebGLAvailable());
  }, [isRestrictive]);

  const mascotScale = SIZE_SCALES[size] || SIZE_SCALES.medium;
  const cameraDistance = CAMERA_DISTANCES[size] || CAMERA_DISTANCES.medium;

  // Show 2D fallback while checking or if WebGL unavailable
  if (webglAvailable === null || webglAvailable === false) {
    return (
      <div className={`w-full h-full flex items-center justify-center ${className}`}>
        <GlobalMascot2D
          animationState={animationState}
          size={size}
          reducedMotion={isRestrictive}
        />
      </div>
    );
  }

  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [0, 0, cameraDistance], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          // Verify WebGL context is valid after creation
          if (!gl.getContext()) {
            setWebglAvailable(false);
          }
        }}
      >
        {/* Transparent background */}
        <color attach="background" args={['transparent']} />

        {/* Lighting */}
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 5, 5]} intensity={1} color="#a855f7" />
        <pointLight position={[-5, -5, -5]} intensity={0.5} color="#7c3aed" />

        {/* Stars background */}
        {showStars && (
          <Stars radius={50} depth={50} count={1000} factor={2} fade speed={0.5} />
        )}

        {/* Main mascot */}
        <Suspense fallback={<LoadingFallback />}>
          <ThetaSpirit animationState={animationState} scale={mascotScale} />
        </Suspense>
      </Canvas>
    </div>
  );
}
