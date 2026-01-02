/**
 * 3D Muscle Model Component
 *
 * Displays a 3D human body with highlighted muscle activations.
 * Uses Three.js with @react-three/fiber for React Native.
 */
import React, { useMemo, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import type { MuscleActivation } from '@musclemap/client';

interface MuscleModelProps {
  activations: MuscleActivation[];
  rotationEnabled?: boolean;
  height?: number;
}

// Muscle positions on the body (normalized coordinates)
const MUSCLE_POSITIONS: Record<string, { x: number; y: number; z: number; scale: number }> = {
  // Upper body - front
  'pectoralis-major': { x: 0, y: 1.2, z: 0.3, scale: 0.35 },
  'deltoid': { x: 0.35, y: 1.4, z: 0, scale: 0.2 },
  'biceps-brachii': { x: 0.4, y: 1.0, z: 0.1, scale: 0.15 },
  'rectus-abdominis': { x: 0, y: 0.6, z: 0.2, scale: 0.25 },
  'external-oblique': { x: 0.25, y: 0.6, z: 0.1, scale: 0.2 },
  // Upper body - back
  'trapezius': { x: 0, y: 1.5, z: -0.2, scale: 0.3 },
  'latissimus-dorsi': { x: 0.25, y: 0.9, z: -0.2, scale: 0.35 },
  'rhomboids': { x: 0.15, y: 1.2, z: -0.25, scale: 0.15 },
  'triceps-brachii': { x: 0.4, y: 1.0, z: -0.1, scale: 0.15 },
  // Lower body - front
  'quadriceps': { x: 0.15, y: -0.3, z: 0.15, scale: 0.25 },
  'rectus-femoris': { x: 0.15, y: -0.2, z: 0.15, scale: 0.2 },
  'vastus-lateralis': { x: 0.22, y: -0.3, z: 0.1, scale: 0.2 },
  'vastus-medialis': { x: 0.08, y: -0.35, z: 0.1, scale: 0.18 },
  'tibialis-anterior': { x: 0.12, y: -0.9, z: 0.1, scale: 0.1 },
  // Lower body - back
  'gluteus-maximus': { x: 0.18, y: 0.1, z: -0.2, scale: 0.25 },
  'gluteus-medius': { x: 0.25, y: 0.2, z: -0.1, scale: 0.18 },
  'hamstrings': { x: 0.15, y: -0.3, z: -0.15, scale: 0.22 },
  'biceps-femoris': { x: 0.2, y: -0.3, z: -0.15, scale: 0.18 },
  'gastrocnemius': { x: 0.12, y: -0.8, z: -0.1, scale: 0.12 },
  'soleus': { x: 0.12, y: -0.95, z: -0.05, scale: 0.1 },
  // Core
  'erector-spinae': { x: 0.1, y: 0.5, z: -0.25, scale: 0.15 },
};

// Get color based on activation intensity (0-1 scale)
function getActivationColor(activation: number): THREE.Color {
  // Color gradient: blue (cold/inactive) -> green -> yellow -> red (hot/active)
  const hue = (1 - Math.min(activation, 1)) * 0.7; // 0.7 = blue, 0 = red
  return new THREE.Color().setHSL(hue, 0.8, 0.5);
}

// Normalize muscle ID to match our position map
function normalizeMuscleId(muscleId: string): string {
  return muscleId.toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-');
}

interface MuscleIndicatorProps {
  position: [number, number, number];
  scale: number;
  activation: number;
}

function MuscleIndicator({ position, scale, activation }: MuscleIndicatorProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = useMemo(() => getActivationColor(activation), [activation]);

  // Subtle pulsing animation for active muscles
  useFrame(({ clock }) => {
    if (meshRef.current && activation > 0.3) {
      const pulse = 1 + Math.sin(clock.getElapsedTime() * 2) * 0.1 * activation;
      meshRef.current.scale.setScalar(scale * pulse);
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[scale, 16, 16]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.7 + activation * 0.3}
        emissive={color}
        emissiveIntensity={activation * 0.5}
      />
    </mesh>
  );
}

interface BodyOutlineProps {
  rotation: [number, number, number];
}

function BodyOutline({ rotation }: BodyOutlineProps) {
  return (
    <group rotation={rotation}>
      {/* Head */}
      <mesh position={[0, 1.85, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#4a5568" transparent opacity={0.3} />
      </mesh>

      {/* Torso */}
      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.25, 0.35, 1.2, 16]} />
        <meshStandardMaterial color="#4a5568" transparent opacity={0.3} />
      </mesh>

      {/* Pelvis */}
      <mesh position={[0, 0.2, 0]}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial color="#4a5568" transparent opacity={0.3} />
      </mesh>

      {/* Left Arm */}
      <mesh position={[0.45, 1.0, 0]} rotation={[0, 0, Math.PI / 6]}>
        <cylinderGeometry args={[0.08, 0.06, 0.8, 8]} />
        <meshStandardMaterial color="#4a5568" transparent opacity={0.3} />
      </mesh>

      {/* Right Arm */}
      <mesh position={[-0.45, 1.0, 0]} rotation={[0, 0, -Math.PI / 6]}>
        <cylinderGeometry args={[0.08, 0.06, 0.8, 8]} />
        <meshStandardMaterial color="#4a5568" transparent opacity={0.3} />
      </mesh>

      {/* Left Leg */}
      <mesh position={[0.15, -0.5, 0]}>
        <cylinderGeometry args={[0.12, 0.08, 1.2, 8]} />
        <meshStandardMaterial color="#4a5568" transparent opacity={0.3} />
      </mesh>

      {/* Right Leg */}
      <mesh position={[-0.15, -0.5, 0]}>
        <cylinderGeometry args={[0.12, 0.08, 1.2, 8]} />
        <meshStandardMaterial color="#4a5568" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

interface MuscleVisualizationProps {
  activations: MuscleActivation[];
  rotationEnabled?: boolean;
}

function MuscleVisualization({ activations, rotationEnabled = true }: MuscleVisualizationProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Auto-rotate when enabled
  useFrame(({ clock }) => {
    if (groupRef.current && rotationEnabled) {
      groupRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.3) * 0.5;
    }
  });

  // Build muscle indicators from activations
  const muscleIndicators = useMemo(() => {
    const indicators: JSX.Element[] = [];
    const maxActivation = Math.max(...activations.map((a) => a.normalizedActivation), 1);

    for (const activation of activations) {
      const normalizedId = normalizeMuscleId(activation.muscleId);
      const position = MUSCLE_POSITIONS[normalizedId];

      if (position) {
        const intensity = activation.normalizedActivation / maxActivation;

        // Add left side
        indicators.push(
          <MuscleIndicator
            key={`${normalizedId}-left`}
            position={[position.x, position.y, position.z]}
            scale={position.scale}
            activation={intensity}
          />
        );

        // Add right side (mirror)
        if (position.x !== 0) {
          indicators.push(
            <MuscleIndicator
              key={`${normalizedId}-right`}
              position={[-position.x, position.y, position.z]}
              scale={position.scale}
              activation={intensity}
            />
          );
        }
      }
    }

    return indicators;
  }, [activations]);

  return (
    <group ref={groupRef}>
      <BodyOutline rotation={[0, 0, 0]} />
      {muscleIndicators}
    </group>
  );
}

export function MuscleModel({
  activations,
  rotationEnabled = true,
  height = 300,
}: MuscleModelProps) {
  const { width } = Dimensions.get('window');

  return (
    <View style={[styles.container, { height }]}>
      <Canvas
        style={styles.canvas}
        camera={{ position: [0, 0.5, 4], fov: 45 }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <directionalLight position={[-5, 5, -5]} intensity={0.4} />
        <MuscleVisualization activations={activations} rotationEnabled={rotationEnabled} />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: 'transparent',
    borderRadius: 16,
    overflow: 'hidden',
  },
  canvas: {
    flex: 1,
  },
});

export default MuscleModel;
