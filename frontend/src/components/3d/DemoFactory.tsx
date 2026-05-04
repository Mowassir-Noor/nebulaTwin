import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useViewerStore } from '@/store/viewerStore';
import { useSensorStore } from '@/store/sensorStore';
import { getSensorEmissiveIntensity, getSensorGradientColor } from '@/utils/sensorVisualization';
import * as THREE from 'three';
import type { Sensor } from '@/types';

interface MeshPartProps {
  name: string;
  position: [number, number, number];
  size: [number, number, number];
  baseColor: string;
  sensor?: Sensor;
  playbackValues?: Map<string, number>;
  playbackMode?: boolean;
}

function MeshPart({ name, position, size, baseColor, sensor, playbackValues, playbackMode = false }: MeshPartProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);
  const selectedMeshName = useViewerStore((s) => s.selectedMeshName);
  const selectMesh = useViewerStore((s) => s.selectMesh);
  const hoverMesh = useViewerStore((s) => s.hoverMesh);
  const realtimeValues = useSensorStore((s) => s.realtimeValues);
  const smoothedValueRef = useRef<number | undefined>(undefined);

  const isSelected = selectedMeshName === name;

  const rawValue = sensor
    ? (playbackMode ? playbackValues?.get(sensor.id) : realtimeValues.get(sensor.id)?.value) ?? sensor.manualValue
    : undefined;

  const color = useMemo(() => {
    if (sensor && typeof rawValue === 'number') return getSensorGradientColor(rawValue, sensor);
    if (isSelected) return '#6366f1';
    if (hovered) return '#818cf8';
    return baseColor;
  }, [sensor, rawValue, isSelected, hovered, baseColor]);

  useFrame((state, delta) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      const previousValue = smoothedValueRef.current ?? rawValue;
      const smoothedValue = typeof rawValue === 'number' && typeof previousValue === 'number'
        ? THREE.MathUtils.lerp(previousValue, rawValue, Math.min(1, delta * 4))
        : rawValue;
      smoothedValueRef.current = smoothedValue;
      const targetColor = sensor && typeof smoothedValue === 'number'
        ? getSensorGradientColor(smoothedValue, sensor)
        : color;
      mat.color.lerp(new THREE.Color(targetColor), Math.min(1, delta * 6));
      if (mat.emissive) {
        const emissiveColor = isSelected ? '#22d3ee' : hovered ? '#3b82f6' : sensor && typeof smoothedValue === 'number' ? getSensorGradientColor(smoothedValue, sensor) : '#000000';
        const emissiveIntensity = isSelected ? 0.75 : hovered ? 0.28 : sensor && typeof smoothedValue === 'number' ? getSensorEmissiveIntensity(smoothedValue, sensor) : 0;
        mat.emissive.lerp(new THREE.Color(emissiveColor), Math.min(1, delta * 8));
        mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, emissiveIntensity, Math.min(1, delta * 8));
      }
    }
  });

  return (
    <mesh
      ref={meshRef}
      name={name}
      position={position}
      castShadow
      receiveShadow
      onClick={(e) => {
        e.stopPropagation();
        selectMesh(name, sensor?.id ?? null, sensor?.modelPartId ?? null);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        hoverMesh(name, sensor?.modelPartId ?? null);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        hoverMesh(null);
        document.body.style.cursor = 'auto';
      }}
    >
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={baseColor}
        roughness={0.4}
        metalness={0.6}
        emissive="#000000"
        emissiveIntensity={0}
      />
    </mesh>
  );
}

export function DemoFactory({ playbackValues, playbackMode = false }: { playbackValues?: Map<string, number>; playbackMode?: boolean }) {
  const sensors = useSensorStore((s) => s.sensors);

  const sensorMap = useMemo(() => {
    const map: Record<string, Sensor> = {};
    sensors.forEach((s, i) => {
      const partNames = ['motor', 'conveyor', 'press', 'arm'];
      if (i < partNames.length) map[partNames[i]] = s;
    });
    return map;
  }, [sensors]);

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#1a1a28" roughness={0.9} />
      </mesh>

      {/* Factory base platform */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[8, 0.1, 5]} />
        <meshStandardMaterial color="#2a2a3a" roughness={0.8} />
      </mesh>

      {/* Motor unit */}
      <MeshPart
        name="motor"
        position={[-2.5, 0.6, 0]}
        size={[1.2, 1, 1.2]}
        baseColor="#4a5568"
        sensor={sensorMap['motor']}
        playbackValues={playbackValues}
        playbackMode={playbackMode}
      />

      {/* Conveyor belt */}
      <MeshPart
        name="conveyor"
        position={[0, 0.35, 0]}
        size={[4, 0.2, 1]}
        baseColor="#718096"
        sensor={sensorMap['conveyor']}
        playbackValues={playbackValues}
        playbackMode={playbackMode}
      />
      {/* Conveyor legs */}
      <mesh position={[-1.5, 0.15, 0.4]}>
        <boxGeometry args={[0.08, 0.2, 0.08]} />
        <meshStandardMaterial color="#4a5568" />
      </mesh>
      <mesh position={[1.5, 0.15, 0.4]}>
        <boxGeometry args={[0.08, 0.2, 0.08]} />
        <meshStandardMaterial color="#4a5568" />
      </mesh>
      <mesh position={[-1.5, 0.15, -0.4]}>
        <boxGeometry args={[0.08, 0.2, 0.08]} />
        <meshStandardMaterial color="#4a5568" />
      </mesh>
      <mesh position={[1.5, 0.15, -0.4]}>
        <boxGeometry args={[0.08, 0.2, 0.08]} />
        <meshStandardMaterial color="#4a5568" />
      </mesh>

      {/* Hydraulic press */}
      <MeshPart
        name="press"
        position={[1, 1.2, 0]}
        size={[0.8, 1.4, 0.8]}
        baseColor="#5a6577"
        sensor={sensorMap['press']}
        playbackValues={playbackValues}
        playbackMode={playbackMode}
      />
      {/* Press arm */}
      <mesh position={[1, 0.55, 0]}>
        <boxGeometry args={[0.3, 0.1, 0.6]} />
        <meshStandardMaterial color="#6b7280" />
      </mesh>

      {/* Robotic arm */}
      <MeshPart
        name="arm"
        position={[3, 0.8, 0]}
        size={[0.6, 1.2, 0.6]}
        baseColor="#64748b"
        sensor={sensorMap['arm']}
        playbackValues={playbackValues}
        playbackMode={playbackMode}
      />
      {/* Arm extension */}
      <mesh position={[3, 1.5, 0]} rotation={[0, 0, Math.PI / 6]}>
        <boxGeometry args={[0.12, 0.9, 0.12]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Control panel */}
      <mesh position={[-3.2, 0.7, 1.8]} rotation={[0, 0.3, 0]}>
        <boxGeometry args={[0.6, 0.9, 0.15]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      <mesh position={[-3.18, 0.85, 1.87]} rotation={[0, 0.3, 0]}>
        <boxGeometry args={[0.4, 0.35, 0.02]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}
