import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useViewerStore } from '@/store/viewerStore';
import { useSensorStore } from '@/store/sensorStore';
import * as THREE from 'three';

interface MeshPartProps {
  name: string;
  position: [number, number, number];
  size: [number, number, number];
  baseColor: string;
  sensorId?: string;
}

function MeshPart({ name, position, size, baseColor, sensorId }: MeshPartProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);
  const selectedMeshName = useViewerStore((s) => s.selectedMeshName);
  const selectMesh = useViewerStore((s) => s.selectMesh);
  const hoverMesh = useViewerStore((s) => s.hoverMesh);
  const realtimeValues = useSensorStore((s) => s.realtimeValues);

  const isSelected = selectedMeshName === name;

  const color = useMemo(() => {
    if (sensorId) {
      const data = realtimeValues.get(sensorId);
      if (data) {
        if (data.value > 80) return '#ef4444';
        if (data.value > 60) return '#eab308';
        return '#22c55e';
      }
    }
    if (isSelected) return '#6366f1';
    if (hovered) return '#818cf8';
    return baseColor;
  }, [sensorId, realtimeValues, isSelected, hovered, baseColor]);

  useFrame(() => {
    if (meshRef.current) {
      (meshRef.current.material as THREE.MeshStandardMaterial).color.lerp(
        new THREE.Color(color),
        0.1,
      );
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
        selectMesh(name, sensorId ?? null);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        hoverMesh(name);
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
        emissive={isSelected ? '#6366f1' : '#000000'}
        emissiveIntensity={isSelected ? 0.15 : 0}
      />
    </mesh>
  );
}

export function DemoFactory() {
  const sensors = useSensorStore((s) => s.sensors);

  const sensorMap = useMemo(() => {
    const map: Record<string, string> = {};
    sensors.forEach((s, i) => {
      const partNames = ['motor', 'conveyor', 'press', 'arm'];
      if (i < partNames.length) map[partNames[i]] = s.id;
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
        sensorId={sensorMap['motor']}
      />

      {/* Conveyor belt */}
      <MeshPart
        name="conveyor"
        position={[0, 0.35, 0]}
        size={[4, 0.2, 1]}
        baseColor="#718096"
        sensorId={sensorMap['conveyor']}
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
        sensorId={sensorMap['press']}
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
        sensorId={sensorMap['arm']}
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
