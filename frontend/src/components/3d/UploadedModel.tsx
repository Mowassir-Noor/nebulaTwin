/* eslint-disable */
import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { useViewerStore } from '@/store/viewerStore';
import { useSensorStore } from '@/store/sensorStore';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Html } from '@react-three/drei';
import type { Model3D } from '@/types';

interface UploadedModelProps {
  model: Model3D;
}

export function UploadedModel({ model }: UploadedModelProps) {
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

  return <ModelScene scene={scene} model={model} />;
}

function ModelScene({ scene, model }: { scene: THREE.Group; model: Model3D }) {
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
      <InteractiveMeshes meshes={sceneMeshes} resolvePartId={resolvePartId} />
    </group>
  );
}

interface InteractiveMeshesProps {
  meshes: THREE.Mesh[];
  resolvePartId: (mesh: THREE.Mesh, index: number) => string | null;
}

function InteractiveMeshes({ meshes, resolvePartId }: InteractiveMeshesProps) {
  const { camera, controls } = useThree();
  const selectMesh = useViewerStore((s) => s.selectMesh);
  const hoverMesh = useViewerStore((s) => s.hoverMesh);
  const selectedMeshName = useViewerStore((s) => s.selectedMeshName);
  const hoveredMeshName = useViewerStore((s) => s.hoveredMeshName);
  const focusedModelPartId = useViewerStore((s) => s.focusedModelPartId);
  const realtimeValues = useSensorStore((s) => s.realtimeValues);
  const sensors = useSensorStore((s) => s.sensors);

  const [targetCameraData, setTargetCameraData] = useState<{ position: THREE.Vector3, target: THREE.Vector3 } | null>(null);

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

  // Apply color coding and selection highlight per frame
  useFrame((state, delta) => {
    meshes.forEach((mesh, i) => {
      const partId = resolvePartId(mesh, i);
      const material = mesh.material;
      if (!material) return;
      const mat = Array.isArray(material)
        ? (material[0] as THREE.MeshStandardMaterial)
        : (material as THREE.MeshStandardMaterial);
      if (!mat?.color) return;

      // Selection: purple | Hover: blue | Default: none
      if (selectedMeshName === mesh.name) {
        mat.emissive?.setHex(0x6366f1);
        mat.emissiveIntensity = 0.2;
      } else if (hoveredMeshName === mesh.name) {
        mat.emissive?.setHex(0x3b82f6);
        mat.emissiveIntensity = 0.15;
      } else {
        mat.emissive?.setHex(0x000000);
        mat.emissiveIntensity = 0;
      }

      // Sensor value color coding (only for bound parts)
      if (partId) {
        const sensor = partToSensor.get(partId);
        if (sensor) {
          const data = realtimeValues.get(sensor.id);
          if (data) {
            if (data.value > 80) mat.color.set('#ef4444');
            else if (data.value > 60) mat.color.set('#eab308');
            else mat.color.set('#22c55e');
          }
        }
      }
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
        const sensorData = sensor ? realtimeValues.get(sensor.id) : null;
        
        let centerPos = new THREE.Vector3(0, 0, 0);
        if (sensorData && geometry.boundingBox) {
          centerPos = geometry.boundingBox.getCenter(new THREE.Vector3());
        } else if (sensorData) {
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
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            
            {sensorData && sensor && (
              <Html center position={centerPos} distanceFactor={15}>
                <div className={`px-2 py-1 rounded shadow-lg backdrop-blur-md border text-xs whitespace-nowrap pointer-events-none transition-all ${
                  sensorData.value > 80 ? 'bg-red-900/50 border-red-500/50 text-red-100' :
                  sensorData.value > 60 ? 'bg-yellow-900/50 border-yellow-500/50 text-yellow-100' :
                  'bg-[#050B18]/70 border-blue-500/30 text-blue-100'
                }`}>
                  <div className="font-bold mb-0.5">{sensor.name}</div>
                  <div className="font-mono">{sensorData.value.toFixed(1)} {sensor.unit}</div>
                </div>
              </Html>
            )}
          </mesh>
        );
      })}
    </>
  );
}
