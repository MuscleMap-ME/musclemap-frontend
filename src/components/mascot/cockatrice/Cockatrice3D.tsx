/**
 * 3D Cockatrice Component
 *
 * A Three.js/React Three Fiber 3D interpretation of the TripToMean heraldic
 * cockatrice. Uses stylized geometry to create a medieval bestiary aesthetic
 * in 3D space.
 *
 * Used for:
 * - Bug hunter dashboard
 * - Error page hero
 * - Loading states with presence
 */

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

export type Cockatrice3DState =
  | 'idle'
  | 'alert'
  | 'hunting'
  | 'found'
  | 'victorious';

interface Cockatrice3DProps {
  state?: Cockatrice3DState;
  size?: number;
  className?: string;
  color?: string;
  backgroundColor?: string;
}

// Cockatrice mesh built from geometry primitives
function CockatriceMesh({
  state = 'idle',
  color = '#1a1a1a',
}: {
  state: Cockatrice3DState;
  color: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const wingRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Group>(null);

  // Material for the wireframe/line art style
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        wireframe: false,
        roughness: 0.8,
        metalness: 0.1,
      }),
    [color]
  );

  const _lineMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color(color),
        linewidth: 2,
      }),
    [color]
  );

  // Animation loop
  useFrame((frameState, _delta) => {
    if (!groupRef.current) return;

    const time = frameState.clock.elapsedTime;

    // Base idle breathing
    groupRef.current.scale.setScalar(1 + Math.sin(time * 2) * 0.02);

    // Wing flapping based on state
    if (wingRef.current) {
      if (state === 'hunting') {
        wingRef.current.rotation.z = Math.sin(time * 4) * 0.3;
      } else if (state === 'victorious') {
        wingRef.current.rotation.z = Math.sin(time * 6) * 0.4;
      } else {
        wingRef.current.rotation.z = Math.sin(time * 1.5) * 0.1;
      }
    }

    // Tail movement
    if (tailRef.current) {
      if (state === 'hunting') {
        tailRef.current.rotation.y = Math.sin(time * 3) * 0.2;
      } else {
        tailRef.current.rotation.y = Math.sin(time * 1) * 0.1;
      }
    }

    // State-specific body movement
    if (state === 'alert') {
      groupRef.current.rotation.y = Math.sin(time * 2) * 0.1;
    } else if (state === 'hunting') {
      groupRef.current.position.x = Math.sin(time * 2) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Head - rooster style */}
      <mesh position={[0, 0.8, 0.3]} material={material}>
        <sphereGeometry args={[0.25, 16, 16]} />
      </mesh>

      {/* Comb/crest */}
      <mesh position={[0, 1.1, 0.25]} rotation={[0.3, 0, 0]} material={material}>
        <coneGeometry args={[0.15, 0.3, 4]} />
      </mesh>
      <mesh position={[0.08, 1.05, 0.25]} rotation={[0.3, 0, 0.2]} material={material}>
        <coneGeometry args={[0.1, 0.2, 4]} />
      </mesh>
      <mesh position={[-0.08, 1.05, 0.25]} rotation={[0.3, 0, -0.2]} material={material}>
        <coneGeometry args={[0.1, 0.2, 4]} />
      </mesh>

      {/* Beak */}
      <mesh position={[0, 0.75, 0.55]} rotation={[-0.3, 0, 0]} material={material}>
        <coneGeometry args={[0.08, 0.25, 4]} />
      </mesh>

      {/* Wattle */}
      <mesh position={[0, 0.6, 0.45]} material={material}>
        <sphereGeometry args={[0.08, 8, 8]} />
      </mesh>

      {/* Eyes */}
      <mesh position={[0.12, 0.85, 0.45]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.13, 0.85, 0.48]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
      <mesh position={[-0.12, 0.85, 0.45]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[-0.13, 0.85, 0.48]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#000000" />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 0.5, 0.1]} rotation={[0.5, 0, 0]} material={material}>
        <cylinderGeometry args={[0.12, 0.18, 0.4, 8]} />
      </mesh>

      {/* Body */}
      <mesh position={[0, 0.1, -0.1]} rotation={[0.3, 0, 0]} material={material}>
        <sphereGeometry args={[0.35, 16, 16]} />
      </mesh>

      {/* Wing group */}
      <group ref={wingRef} position={[0.3, 0.3, -0.1]}>
        {/* Wing membrane - flat plane */}
        <mesh rotation={[0, -0.5, 0.3]} material={material}>
          <planeGeometry args={[0.6, 0.4]} />
        </mesh>
        {/* Wing bones/fingers */}
        <mesh position={[0.25, 0.15, 0]} rotation={[0, 0, 0.8]} material={material}>
          <cylinderGeometry args={[0.02, 0.01, 0.3, 4]} />
        </mesh>
        <mesh position={[0.2, 0.05, 0]} rotation={[0, 0, 0.5]} material={material}>
          <cylinderGeometry args={[0.02, 0.01, 0.25, 4]} />
        </mesh>
        <mesh position={[0.15, -0.05, 0]} rotation={[0, 0, 0.3]} material={material}>
          <cylinderGeometry args={[0.02, 0.01, 0.2, 4]} />
        </mesh>
      </group>

      {/* Mirror wing on other side */}
      <group position={[-0.3, 0.3, -0.1]} scale={[-1, 1, 1]}>
        <mesh rotation={[0, -0.5, 0.3]} material={material}>
          <planeGeometry args={[0.6, 0.4]} />
        </mesh>
      </group>

      {/* Legs */}
      <mesh position={[0.12, -0.3, 0]} rotation={[0.2, 0, 0]} material={material}>
        <cylinderGeometry args={[0.03, 0.02, 0.4, 6]} />
      </mesh>
      <mesh position={[-0.12, -0.3, 0]} rotation={[0.2, 0, 0]} material={material}>
        <cylinderGeometry args={[0.03, 0.02, 0.4, 6]} />
      </mesh>

      {/* Talons */}
      <group position={[0.12, -0.5, 0.05]}>
        <mesh rotation={[0.5, 0, 0]} material={material}>
          <coneGeometry args={[0.02, 0.1, 4]} />
        </mesh>
        <mesh rotation={[0.5, 0.4, 0]} position={[0.03, 0, 0]} material={material}>
          <coneGeometry args={[0.015, 0.08, 4]} />
        </mesh>
        <mesh rotation={[0.5, -0.4, 0]} position={[-0.03, 0, 0]} material={material}>
          <coneGeometry args={[0.015, 0.08, 4]} />
        </mesh>
      </group>
      <group position={[-0.12, -0.5, 0.05]}>
        <mesh rotation={[0.5, 0, 0]} material={material}>
          <coneGeometry args={[0.02, 0.1, 4]} />
        </mesh>
        <mesh rotation={[0.5, 0.4, 0]} position={[0.03, 0, 0]} material={material}>
          <coneGeometry args={[0.015, 0.08, 4]} />
        </mesh>
        <mesh rotation={[0.5, -0.4, 0]} position={[-0.03, 0, 0]} material={material}>
          <coneGeometry args={[0.015, 0.08, 4]} />
        </mesh>
      </group>

      {/* Serpent tail */}
      <group ref={tailRef} position={[0, -0.1, -0.4]}>
        {/* Tail segments */}
        <mesh position={[0, 0, 0]} rotation={[1.2, 0, 0]} material={material}>
          <cylinderGeometry args={[0.12, 0.1, 0.3, 8]} />
        </mesh>
        <mesh position={[0, -0.15, -0.2]} rotation={[0.8, 0, 0]} material={material}>
          <cylinderGeometry args={[0.1, 0.08, 0.3, 8]} />
        </mesh>
        <mesh position={[-0.1, -0.25, -0.4]} rotation={[0.3, 0.5, 0]} material={material}>
          <cylinderGeometry args={[0.08, 0.06, 0.3, 8]} />
        </mesh>
        <mesh position={[-0.25, -0.2, -0.5]} rotation={[-0.2, 0.8, 0]} material={material}>
          <cylinderGeometry args={[0.06, 0.04, 0.25, 8]} />
        </mesh>
        <mesh position={[-0.35, -0.1, -0.45]} rotation={[-0.5, 1, 0]} material={material}>
          <cylinderGeometry args={[0.04, 0.02, 0.2, 8]} />
        </mesh>
        {/* Tail tip/barb */}
        <mesh position={[-0.42, 0, -0.4]} rotation={[-0.8, 1.2, 0]} material={material}>
          <coneGeometry args={[0.04, 0.12, 4]} />
        </mesh>
      </group>

      {/* Bug target indicator for hunting state */}
      {state === 'hunting' && (
        <mesh position={[0, 0.75, 0.8]}>
          <torusGeometry args={[0.1, 0.01, 8, 16]} />
          <meshStandardMaterial color="#ff4444" emissive="#ff0000" emissiveIntensity={0.5} />
        </mesh>
      )}

      {/* Victory particles */}
      {state === 'victorious' && (
        <>
          <mesh position={[0.5, 1, 0]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={1} />
          </mesh>
          <mesh position={[-0.4, 0.8, 0.2]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={1} />
          </mesh>
          <mesh position={[0.3, 0.5, 0.4]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={1} />
          </mesh>
        </>
      )}
    </group>
  );
}

export default function Cockatrice3D({
  state = 'idle',
  size = 200,
  className = '',
  color = '#1a1a1a',
  backgroundColor = 'transparent',
}: Cockatrice3DProps) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        background: backgroundColor,
      }}
    >
      <Canvas
        camera={{ position: [0, 0.5, 2.5], fov: 45 }}
        style={{ background: backgroundColor }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <directionalLight position={[-3, 3, -3]} intensity={0.3} />

        <Float
          speed={2}
          rotationIntensity={state === 'hunting' ? 0.3 : 0.1}
          floatIntensity={state === 'idle' ? 0.3 : 0.1}
        >
          <CockatriceMesh state={state} color={color} />
        </Float>
      </Canvas>
    </div>
  );
}

export { Cockatrice3D };
