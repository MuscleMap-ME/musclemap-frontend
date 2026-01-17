/**
 * MuscleViewer3D (Mobile)
 *
 * 3D muscle visualization using expo-gl and @react-three/fiber.
 * Displays a body outline with highlighted muscle activation spheres.
 * Supports gesture controls (rotation, pinch-to-zoom) via react-native-gesture-handler.
 */
import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import * as THREE from 'three';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import type { MuscleViewer3DProps, MuscleActivation, MusclePosition } from './types';

// Muscle positions on the body (normalized coordinates)
const MUSCLE_POSITIONS: Record<string, MusclePosition> = {
  // Upper body - front
  chest: { x: 0, y: 1.2, z: 0.3, scale: 0.35 },
  'pectoralis-major': { x: 0, y: 1.2, z: 0.3, scale: 0.35 },
  front_delts: { x: 0.35, y: 1.4, z: 0.1, scale: 0.18 },
  deltoid: { x: 0.35, y: 1.4, z: 0, scale: 0.2 },
  biceps: { x: 0.4, y: 1.0, z: 0.1, scale: 0.15 },
  'biceps-brachii': { x: 0.4, y: 1.0, z: 0.1, scale: 0.15 },
  abs: { x: 0, y: 0.6, z: 0.2, scale: 0.25 },
  'rectus-abdominis': { x: 0, y: 0.6, z: 0.2, scale: 0.25 },
  obliques: { x: 0.25, y: 0.6, z: 0.1, scale: 0.2 },
  'external-oblique': { x: 0.25, y: 0.6, z: 0.1, scale: 0.2 },

  // Upper body - back
  traps: { x: 0, y: 1.5, z: -0.2, scale: 0.3 },
  trapezius: { x: 0, y: 1.5, z: -0.2, scale: 0.3 },
  upper_back: { x: 0.25, y: 1.1, z: -0.2, scale: 0.3 },
  lats: { x: 0.25, y: 0.9, z: -0.2, scale: 0.35 },
  'latissimus-dorsi': { x: 0.25, y: 0.9, z: -0.2, scale: 0.35 },
  rhomboids: { x: 0.15, y: 1.2, z: -0.25, scale: 0.15 },
  rear_delts: { x: 0.35, y: 1.4, z: -0.1, scale: 0.18 },
  triceps: { x: 0.4, y: 1.0, z: -0.1, scale: 0.15 },
  'triceps-brachii': { x: 0.4, y: 1.0, z: -0.1, scale: 0.15 },
  lower_back: { x: 0.1, y: 0.5, z: -0.25, scale: 0.2 },
  'erector-spinae': { x: 0.1, y: 0.5, z: -0.25, scale: 0.15 },

  // Lower body - front
  quads: { x: 0.15, y: -0.3, z: 0.15, scale: 0.25 },
  quadriceps: { x: 0.15, y: -0.3, z: 0.15, scale: 0.25 },
  'rectus-femoris': { x: 0.15, y: -0.2, z: 0.15, scale: 0.2 },
  'vastus-lateralis': { x: 0.22, y: -0.3, z: 0.1, scale: 0.2 },
  'vastus-medialis': { x: 0.08, y: -0.35, z: 0.1, scale: 0.18 },
  hip_flexors: { x: 0.2, y: 0.15, z: 0.15, scale: 0.15 },
  adductors: { x: 0.1, y: -0.1, z: 0.1, scale: 0.18 },
  tibialis: { x: 0.12, y: -0.9, z: 0.1, scale: 0.1 },
  'tibialis-anterior': { x: 0.12, y: -0.9, z: 0.1, scale: 0.1 },

  // Lower body - back
  glutes: { x: 0.18, y: 0.1, z: -0.2, scale: 0.25 },
  'gluteus-maximus': { x: 0.18, y: 0.1, z: -0.2, scale: 0.25 },
  'gluteus-medius': { x: 0.25, y: 0.2, z: -0.1, scale: 0.18 },
  hamstrings: { x: 0.15, y: -0.3, z: -0.15, scale: 0.22 },
  'biceps-femoris': { x: 0.2, y: -0.3, z: -0.15, scale: 0.18 },
  calves: { x: 0.12, y: -0.8, z: -0.1, scale: 0.12 },
  gastrocnemius: { x: 0.12, y: -0.8, z: -0.1, scale: 0.12 },
  soleus: { x: 0.12, y: -0.95, z: -0.05, scale: 0.1 },

  // Arms
  forearms: { x: 0.45, y: 0.7, z: 0, scale: 0.12 },
  wrist_flexors: { x: 0.48, y: 0.55, z: 0.05, scale: 0.1 },
  wrist_extensors: { x: 0.48, y: 0.55, z: -0.05, scale: 0.1 },

  // Neck & misc
  neck: { x: 0, y: 1.7, z: 0, scale: 0.12 },
  core: { x: 0, y: 0.4, z: 0, scale: 0.28 },
};

// Normalize muscle ID to match our position map
function normalizeMuscleId(muscleId: string): string {
  return muscleId.toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-');
}

// Get color based on activation intensity (0-1 scale)
function getActivationColor(activation: number, isPrimary?: boolean): THREE.Color {
  // Primary muscles get warmer colors, secondary get cooler
  if (isPrimary) {
    // Orange to red gradient for primary
    const hue = 0.08 - Math.min(activation, 1) * 0.08; // 0.08 = orange, 0 = red
    return new THREE.Color().setHSL(hue, 0.9, 0.5);
  }
  // Blue to green gradient for secondary
  const hue = 0.55 - Math.min(activation, 1) * 0.2; // 0.55 = blue-cyan, 0.35 = green-cyan
  return new THREE.Color().setHSL(hue, 0.7, 0.45);
}

/**
 * Individual muscle indicator sphere
 */
interface MuscleIndicatorProps {
  position: [number, number, number];
  scale: number;
  activation: number;
  isPrimary?: boolean;
}

function MuscleIndicator({ position, scale, activation, isPrimary }: MuscleIndicatorProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = useMemo(() => getActivationColor(activation, isPrimary), [activation, isPrimary]);

  // Subtle pulsing animation for highly active muscles
  useFrame(({ clock }) => {
    if (meshRef.current && activation > 0.5) {
      const pulse = 1 + Math.sin(clock.getElapsedTime() * 2.5) * 0.08 * activation;
      meshRef.current.scale.setScalar(scale * pulse);
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[scale, 16, 16]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.6 + activation * 0.4}
        emissive={color}
        emissiveIntensity={activation * 0.6}
      />
    </mesh>
  );
}

/**
 * Body outline mesh
 */
function BodyOutline() {
  return (
    <group>
      {/* Head */}
      <mesh position={[0, 1.85, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#4a5568" transparent opacity={0.25} />
      </mesh>

      {/* Torso */}
      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.25, 0.35, 1.2, 16]} />
        <meshStandardMaterial color="#4a5568" transparent opacity={0.25} />
      </mesh>

      {/* Pelvis */}
      <mesh position={[0, 0.2, 0]}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial color="#4a5568" transparent opacity={0.25} />
      </mesh>

      {/* Left Arm */}
      <mesh position={[0.45, 1.0, 0]} rotation={[0, 0, Math.PI / 6]}>
        <cylinderGeometry args={[0.08, 0.06, 0.8, 8]} />
        <meshStandardMaterial color="#4a5568" transparent opacity={0.25} />
      </mesh>

      {/* Right Arm */}
      <mesh position={[-0.45, 1.0, 0]} rotation={[0, 0, -Math.PI / 6]}>
        <cylinderGeometry args={[0.08, 0.06, 0.8, 8]} />
        <meshStandardMaterial color="#4a5568" transparent opacity={0.25} />
      </mesh>

      {/* Left Leg */}
      <mesh position={[0.15, -0.5, 0]}>
        <cylinderGeometry args={[0.12, 0.08, 1.2, 8]} />
        <meshStandardMaterial color="#4a5568" transparent opacity={0.25} />
      </mesh>

      {/* Right Leg */}
      <mesh position={[-0.15, -0.5, 0]}>
        <cylinderGeometry args={[0.12, 0.08, 1.2, 8]} />
        <meshStandardMaterial color="#4a5568" transparent opacity={0.25} />
      </mesh>
    </group>
  );
}

/**
 * Scene content with muscle visualization
 */
interface SceneContentProps {
  muscles: MuscleActivation[];
  autoRotate: boolean;
  rotation: { x: number; y: number };
  zoom: number;
}

function SceneContent({ muscles, autoRotate, rotation, zoom }: SceneContentProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  // Apply zoom to camera
  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.position.z = 4 / zoom;
      camera.updateProjectionMatrix();
    }
  }, [zoom, camera]);

  // Apply rotation and auto-rotate
  useFrame(({ clock }) => {
    if (groupRef.current) {
      if (autoRotate) {
        groupRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.3) * 0.5;
      } else {
        groupRef.current.rotation.y = rotation.y;
        groupRef.current.rotation.x = rotation.x;
      }
    }
  });

  // Build muscle indicators
  const muscleIndicators = useMemo(() => {
    const indicators: JSX.Element[] = [];
    const maxActivation = Math.max(...muscles.map((m) => m.intensity), 0.01);

    for (const muscle of muscles) {
      // Try normalized ID first, then original
      const normalizedId = normalizeMuscleId(muscle.id);
      const position = MUSCLE_POSITIONS[normalizedId] || MUSCLE_POSITIONS[muscle.id];

      if (position && muscle.intensity > 0) {
        const intensity = muscle.intensity / maxActivation;

        // Add left side
        indicators.push(
          <MuscleIndicator
            key={`${muscle.id}-left`}
            position={[position.x, position.y, position.z]}
            scale={position.scale}
            activation={intensity}
            isPrimary={muscle.isPrimary}
          />
        );

        // Add right side (mirror for bilateral muscles)
        if (position.x !== 0) {
          indicators.push(
            <MuscleIndicator
              key={`${muscle.id}-right`}
              position={[-position.x, position.y, position.z]}
              scale={position.scale}
              activation={intensity}
              isPrimary={muscle.isPrimary}
            />
          );
        }
      }
    }

    return indicators;
  }, [muscles]);

  return (
    <group ref={groupRef}>
      <BodyOutline />
      {muscleIndicators}
    </group>
  );
}

/**
 * MuscleViewer3D - 3D muscle visualization with gesture controls
 */
export function MuscleViewer3D({
  muscles,
  height = 300,
  interactive = true,
  autoRotate = false,
  onError,
}: MuscleViewer3DProps) {
  const { width } = Dimensions.get('window');
  const [rotation, setRotation] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);

  // Pan gesture for rotation
  const panGesture = Gesture.Pan()
    .enabled(interactive && !autoRotate)
    .onUpdate((event) => {
      setRotation((prev) => ({
        x: Math.max(-0.5, Math.min(0.5, prev.x + event.velocityY * 0.00005)),
        y: prev.y + event.velocityX * 0.0001,
      }));
    });

  // Pinch gesture for zoom
  const pinchGesture = Gesture.Pinch()
    .enabled(interactive)
    .onUpdate((event) => {
      setZoom((prev) => Math.max(0.5, Math.min(2, prev * event.scale)));
    });

  // Combine gestures
  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  // Handle GL errors
  const handleGLError = useCallback(
    (error: Error) => {
      console.error('MuscleViewer3D GL Error:', error);
      onError?.(error);
    },
    [onError]
  );

  return (
    <GestureDetector gesture={composedGesture}>
      <View style={[styles.container, { height }]}>
        <Canvas
          style={styles.canvas}
          camera={{ position: [0, 0.5, 4], fov: 45 }}
          onCreated={({ gl }) => {
            gl.setClearColor(new THREE.Color('transparent'), 0);
          }}
          gl={{ preserveDrawingBuffer: true }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} />
          <directionalLight position={[-5, 5, -5]} intensity={0.4} />
          <directionalLight position={[0, -5, 5]} intensity={0.3} />
          <SceneContent
            muscles={muscles}
            autoRotate={autoRotate}
            rotation={rotation}
            zoom={zoom}
          />
        </Canvas>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: 'transparent',
    borderRadius: 12,
    overflow: 'hidden',
  },
  canvas: {
    flex: 1,
  },
});

export default MuscleViewer3D;
