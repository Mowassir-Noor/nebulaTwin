/* eslint-disable */
import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { useViewerStore } from '@/store/viewerStore';
import { useSensorStore } from '@/store/sensorStore';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Html } from '@react-three/drei';
import { formatSensorValue, getSensorEmissiveIntensity, getSensorGradientColor } from '@/utils/sensorVisualization';
import type { Model3D } from '@/types';

interface UploadedModelProps {
  model: Model3D;
  playbackValues?: Map<string, number>;
  playbackMode?: boolean;
}

export function UploadedModel({ model, playbackValues, playbackMode = false }: UploadedModelProps) {
  const [scene, setScene] = useState<THREE.Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;

    const loadModel = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const url = model.fileUrl.startsWith('http')
          ? model.fileUrl
          : `${window.location.origin}${model.fileUrl}`;

        console.log('[3D Viewer] Loading model from:', url);
        const format = model.format.toUpperCase();

        if (format === 'GLB' || format === 'GLTF') {
          const loader = new GLTFLoader();
          loader.load(
            url,
            (gltf) => {
              if (!disposed) {
                setScene(gltf.scene);
                setLoading(false);
              }
            },
            undefined,
            (err: unknown) => {
              if (!disposed) {
                const errorMsg = err instanceof Error ? err.message : String(err);
                setError(`Failed to load model: ${errorMsg}`);
                setLoading(false);
              }
            },
          );
        } else {
          throw new Error(`Unsupported format: ${format}. Only GLB and GLTF are supported.`);
        }
      } catch (err) {
        if (!disposed) {
          console.error('[3D Viewer] Load error:', err);
          setError(`Load error: ${err instanceof Error ? err.message : err}`);
          setLoading(false);
        }
      }
    };

    loadModel();
    return () => { disposed = true; };
  }, [model.fileUrl, model.format, model.id]);

  if (error) {
    return (
      <group>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
      </group>
    );
  }

  if (loading || !scene) return null;

  return <ModelScene scene={scene} model={model} playbackValues={playbackValues} playbackMode={playbackMode} />;
}

function ModelScene({ scene, model, playbackValues, playbackMode }: { scene: THREE.Group; model: Model3D; playbackValues?: Map<string, number>; playbackMode: boolean }) {
  const groupRef = useRef<THREE.Group>(null!);
  const parts = useMemo(() => model.modelParts || model.parts || [], [model]);

  // Collect scene meshes in traversal order (stable)
  const sceneMeshes = useMemo(() => {
    const found: THREE.Mesh[] = [];
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) found.push(child as THREE.Mesh);
    });
    return found;
  }, [scene]);

  // Build DUAL lookup: meshName → modelPartId (primary) and meshIndex → modelPartId (fallback)
  // This handles models where runtime mesh.name doesn't match the parsed name
  const partMap = useMemo(() => {
    const byName = new Map<string, string>();
    const byIndex = new Map<number, string>();
    parts.forEach((p) => {
      byName.set(p.name, p.id);
      if (typeof (p as any).index === 'number') byIndex.set((p as any).index, p.id);
    });
    // Warn on mismatches to help debugging
    let mismatches = 0;
    sceneMeshes.forEach((mesh, i) => {
      if (mesh.name && !byName.has(mesh.name)) mismatches++;
    });
    if (mismatches > 0) {
      console.warn(`[3D Viewer] ${mismatches} mesh(es) not matched by name — falling back to index mapping`);
    }
    return { byName, byIndex };
  }, [parts, sceneMeshes]);

  const resolvePartId = useCallback(
    (mesh: THREE.Mesh, index: number): string | null =>
      partMap.byName.get(mesh.name) ?? partMap.byIndex.get(index) ?? null,
    [partMap],
  );

  // Center and scale the model
  useEffect(() => {
    if (!groupRef.current) {
      console.warn('[3D Viewer] Group ref not available');
      return;
    }

    try {
      const box = new THREE.Box3().setFromObject(scene);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = maxDim > 0 ? 4 / maxDim : 1;

      console.log('[3D Viewer] Model bounds:', { center, size, scale });

      scene.position.sub(center);
      groupRef.current.scale.setScalar(scale);
      groupRef.current.position.y = 0;

      // Make all materials visible
      scene.traverse((child) => {
        if ((child as any).material) {
          (child as any).material.side = THREE.DoubleSide;
          (child as any).material.wireframe = false;
          (child as any).castShadow = true;
          (child as any).receiveShadow = true;
        }
      });

      console.log('[3D Viewer] Model positioned and materials set');
    } catch (err) {
      console.error('[3D Viewer] Error positioning model:', err);
    }
  }, [scene]);

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
      <InteractiveMeshes meshes={sceneMeshes} resolvePartId={resolvePartId} playbackValues={playbackValues} playbackMode={playbackMode} />
    </group>
  );
}

interface InteractiveMeshesProps {
  meshes: THREE.Mesh[];
  resolvePartId: (mesh: THREE.Mesh, index: number) => string | null;
  playbackValues?: Map<string, number>;
  playbackMode: boolean;
}

function InteractiveMeshes({ meshes, resolvePartId, playbackValues, playbackMode }: InteractiveMeshesProps) {
  const { camera, controls } = useThree();
  const selectMesh = useViewerStore((s) => s.selectMesh);
  const hoverMesh = useViewerStore((s) => s.hoverMesh);
  const selectedMeshName = useViewerStore((s) => s.selectedMeshName);
  const hoveredMeshName = useViewerStore((s) => s.hoveredMeshName);
  const focusedModelPartId = useViewerStore((s) => s.focusedModelPartId);
  const realtimeValues = useSensorStore((s) => s.realtimeValues);
  const sensors = useSensorStore((s) => s.sensors);

  const [targetCameraData, setTargetCameraData] = useState<{ position: THREE.Vector3, target: THREE.Vector3 } | null>(null);
  const baseColorsRef = useRef<Map<string, THREE.Color>>(new Map());
  const smoothedValuesRef = useRef<Map<string, number>>(new Map());

  // Build modelPartId → sensor lookup
  const partToSensor = useMemo(() => {
    const map = new Map<string, typeof sensors[0]>();
    sensors.forEach((s) => {
      if (s.modelPartId) map.set(s.modelPartId, s);
    });
    return map;
  }, [sensors]);

  // Handle camera focusing
  useEffect(() => {
    if (focusedModelPartId) {
      const targetMeshIndex = meshes.findIndex((m, i) => resolvePartId(m, i) === focusedModelPartId);
      if (targetMeshIndex !== -1) {
        const mesh = meshes[targetMeshIndex];
        const box = new THREE.Box3().setFromObject(mesh);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        
        const distance = Math.max(maxDim * 3, 2); // ensure minimum distance
        const targetPos = center.clone().add(new THREE.Vector3(distance, distance * 0.8, distance));
        
        setTargetCameraData({ position: targetPos, target: center });
        
        // Also select the mesh so the binding panel updates
        selectMesh(mesh.name, null, focusedModelPartId);
      }
    } else {
      setTargetCameraData(null);
    }
  }, [focusedModelPartId, meshes, resolvePartId, selectMesh]);

  // R3F-native click handler
  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>, mesh: THREE.Mesh, index: number) => {
      e.stopPropagation();
      const partId = resolvePartId(mesh, index);
      selectMesh(mesh.name, null, partId);
      
      // Auto focus on click
      if (partId) {
        useViewerStore.getState().focusOnModelPart(partId);
      }
    },
    [resolvePartId, selectMesh],
  );

  // R3F-native hover handlers
  const handlePointerOver = useCallback(
    (e: ThreeEvent<PointerEvent>, mesh: THREE.Mesh, index: number) => {
      e.stopPropagation();
      const partId = resolvePartId(mesh, index);
      hoverMesh(mesh.name, partId);
      document.body.style.cursor = 'pointer';
    },
    [resolvePartId, hoverMesh],
  );

  const handlePointerOut = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      hoverMesh(null, null);
      document.body.style.cursor = 'auto';
    },
    [hoverMesh],
  );

  useFrame((state, delta) => {
    meshes.forEach((mesh, i) => {
      const partId = resolvePartId(mesh, i);
      const material = mesh.material;
      if (!material) return;
      const materials = Array.isArray(material)
        ? (material as THREE.MeshStandardMaterial[])
        : [material as THREE.MeshStandardMaterial];
      const sensor = partId ? partToSensor.get(partId) : null;
      const rawValue = sensor ? (playbackMode ? playbackValues?.get(sensor.id) : realtimeValues.get(sensor.id)?.value) ?? sensor.manualValue : undefined;
      const previousValue = sensor ? smoothedValuesRef.current.get(sensor.id) ?? rawValue : undefined;
      const smoothedValue = typeof rawValue === 'number' && typeof previousValue === 'number'
        ? THREE.MathUtils.lerp(previousValue, rawValue, Math.min(1, delta * 4))
        : rawValue;
      if (sensor && typeof smoothedValue === 'number') {
        smoothedValuesRef.current.set(sensor.id, smoothedValue);
      }

      materials.forEach((mat, materialIndex) => {
        if (!mat?.color) return;
        const colorKey = `${mesh.uuid}:${materialIndex}`;
        if (!baseColorsRef.current.has(colorKey)) {
          baseColorsRef.current.set(colorKey, mat.color.clone());
        }

        const baseColor = baseColorsRef.current.get(colorKey) ?? new THREE.Color('#64748b');
        const targetColor = sensor && typeof smoothedValue === 'number'
          ? new THREE.Color(getSensorGradientColor(smoothedValue, sensor))
          : baseColor;
        mat.color.lerp(targetColor, Math.min(1, delta * 6));

        if (mat.emissive) {
          const isSelected = selectedMeshName === mesh.name;
          const isHovered = hoveredMeshName === mesh.name;
          const emissiveColor = isSelected
            ? new THREE.Color('#22d3ee')
            : isHovered
              ? new THREE.Color('#3b82f6')
              : sensor && typeof smoothedValue === 'number'
                ? new THREE.Color(getSensorGradientColor(smoothedValue, sensor))
                : new THREE.Color('#000000');
          const emissiveIntensity = isSelected
            ? 0.85
            : isHovered
              ? 0.34
              : sensor && typeof smoothedValue === 'number'
                ? getSensorEmissiveIntensity(smoothedValue, sensor)
                : 0;
          mat.emissive.lerp(emissiveColor, Math.min(1, delta * 8));
          mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity ?? 0, emissiveIntensity, Math.min(1, delta * 8));
        }
      });
    });

    // Camera animation
    if (targetCameraData && controls) {
      const orbitControls = controls as any;
      camera.position.lerp(targetCameraData.position, 5 * delta);
      orbitControls.target.lerp(targetCameraData.target, 5 * delta);
      orbitControls.update();
    }
  });

  // Render invisible hit-test mesh overlays using R3F events
  return (
    <>
      {meshes.map((mesh, i) => {
        const geometry = mesh.geometry;
        if (!geometry) return null;
        
        const partId = resolvePartId(mesh, i);
        const sensor = partId ? partToSensor.get(partId) : null;
        const rawSensorValue = sensor ? (playbackMode ? playbackValues?.get(sensor.id) : realtimeValues.get(sensor.id)?.value) ?? sensor.manualValue : undefined;
        const isSelected = selectedMeshName === mesh.name;
        const isHovered = hoveredMeshName === mesh.name;
        const overlayColor = isSelected ? '#22d3ee' : isHovered ? '#3b82f6' : '#ffffff';
        const overlayOpacity = isSelected ? 0.3 : isHovered ? 0.16 : 0;
        
        let centerPos = new THREE.Vector3(0, 0, 0);
        if (typeof rawSensorValue === 'number' && geometry.boundingBox) {
          centerPos = geometry.boundingBox.getCenter(new THREE.Vector3());
        } else if (typeof rawSensorValue === 'number') {
          geometry.computeBoundingBox();
          if (geometry.boundingBox) {
             centerPos = geometry.boundingBox.getCenter(new THREE.Vector3());
          }
        }

        return (
          <mesh
            key={mesh.uuid}
            geometry={geometry}
            matrixAutoUpdate={false}
            matrix={mesh.matrixWorld}
            onClick={(e) => handleClick(e, mesh, i)}
            onPointerOver={(e) => handlePointerOver(e, mesh, i)}
            onPointerOut={handlePointerOut}
          >
            <meshBasicMaterial color={overlayColor} transparent opacity={overlayOpacity} depthWrite={false} wireframe />
            
            {typeof rawSensorValue === 'number' && sensor && (
              <Html center position={centerPos} distanceFactor={15}>
                <div className="whitespace-nowrap rounded-xl border px-2.5 py-1.5 text-xs shadow-lg backdrop-blur-md pointer-events-none transition-all" style={{ borderColor: `${getSensorGradientColor(rawSensorValue, sensor)}80`, backgroundColor: '#020617bf', color: '#e2e8f0' }}>
                  <div className="font-bold mb-0.5">{sensor.name}</div>
                  <div className="font-mono" style={{ color: getSensorGradientColor(rawSensorValue, sensor) }}>{formatSensorValue(rawSensorValue, sensor.unit)}</div>
                </div>
              </Html>
            )}
          </mesh>
        );
      })}
    </>
  );
}
