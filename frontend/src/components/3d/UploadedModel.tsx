import { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useViewerStore } from '@/store/viewerStore';
import { useSensorStore } from '@/store/sensorStore';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import type { Model3D, ModelPart as ModelPartType } from '@/types';

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
                console.log('[3D Viewer] Model loaded successfully');
                setScene(gltf.scene);
                setLoading(false);
              }
            },
            (progress) => {
              console.log(`[3D Viewer] Loading progress: ${(progress.loaded / progress.total * 100).toFixed(1)}%`);
            },
            (err: any) => {
              if (!disposed) {
                console.error('[3D Viewer] Failed to load model:', err);
                const errorMsg = err?.message || String(err) || 'Unknown error';
                setError(`Failed to load model: ${errorMsg}`);
                setLoading(false);
              }
            },
          );
        } else if (format === 'OBJ') {
          const loader = new OBJLoader();
          loader.load(
            url,
            (obj) => {
              if (!disposed) {
                console.log('[3D Viewer] OBJ model loaded successfully');
                setScene(obj);
                setLoading(false);
              }
            },
            (progress) => {
              console.log(`[3D Viewer] OBJ Loading progress: ${(progress.loaded / progress.total * 100).toFixed(1)}%`);
            },
            (err: any) => {
              if (!disposed) {
                console.error('[3D Viewer] Failed to load OBJ model:', err);
                const errorMsg = err?.message || String(err) || 'Unknown error';
                setError(`Failed to load OBJ model: ${errorMsg}`);
                setLoading(false);
              }
            },
          );
        } else if (format === 'FBX') {
          const loader = new FBXLoader();
          loader.load(
            url,
            (obj) => {
              if (!disposed) {
                console.log('[3D Viewer] FBX model loaded successfully');
                setScene(obj);
                setLoading(false);
              }
            },
            (progress) => {
              console.log(`[3D Viewer] FBX Loading progress: ${(progress.loaded / progress.total * 100).toFixed(1)}%`);
            },
            (err: any) => {
              if (!disposed) {
                console.error('[3D Viewer] Failed to load FBX model:', err);
                const errorMsg = err?.message || String(err) || 'Unknown error';
                setError(`Failed to load FBX model: ${errorMsg}`);
                setLoading(false);
              }
            },
          );
        } else {
          throw new Error(`Unsupported format: ${format}`);
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
  const parts = model.modelParts || model.parts || [];

  // Build name → modelPartId map
  const partMap = useMemo(() => {
    const map = new Map<string, string>();
    parts.forEach((p) => {
      map.set(p.name, p.id);
    });
    console.log('[3D Viewer] Part map:', Object.fromEntries(map));
    return map;
  }, [parts]);

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
      {/* Attach interactive click handlers to meshes */}
      <InteractiveMeshes scene={scene} partMap={partMap} />
    </group>
  );
}

function InteractiveMeshes({
  scene,
  partMap,
}: {
  scene: THREE.Group;
  partMap: Map<string, string>;
}) {
  const selectMesh = useViewerStore((s) => s.selectMesh);
  const hoverMesh = useViewerStore((s) => s.hoverMesh);
  const selectedMeshName = useViewerStore((s) => s.selectedMeshName);
  const realtimeValues = useSensorStore((s) => s.realtimeValues);
  const sensors = useSensorStore((s) => s.sensors);

  // Build modelPartId → sensorId lookup
  const partToSensor = useMemo(() => {
    const map = new Map<string, string>();
    sensors.forEach((s) => {
      if (s.modelPartId) map.set(s.modelPartId, s.id);
    });
    return map;
  }, [sensors]);

  // Collect all meshes from the scene
  const meshes = useMemo(() => {
    const found: THREE.Mesh[] = [];
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        found.push(child as THREE.Mesh);
      }
    });
    console.log('[3D Viewer] Found meshes:', found.map(m => ({ name: m.name, type: m.type })));
    return found;
  }, [scene]);

  // Apply color coding based on sensor data
  useFrame(() => {
    meshes.forEach((mesh) => {
      const partId = partMap.get(mesh.name);
      if (!partId) return;

      const sensorId = partToSensor.get(partId);
      const material = mesh.material;
      
      // Ensure material is MeshStandardMaterial
      if (!material) return;
      
      const mat = material as THREE.MeshStandardMaterial;
      if (!mat.color) return;

      if (selectedMeshName === mesh.name) {
        mat.emissive?.setHex(0x6366f1);
        mat.emissiveIntensity = 0.15;
      } else {
        mat.emissive?.setHex(0x000000);
        mat.emissiveIntensity = 0;
      }

      if (sensorId) {
        const data = realtimeValues.get(sensorId);
        if (data) {
          if (data.value > 80) mat.color.set('#ef4444');
          else if (data.value > 60) mat.color.set('#eab308');
          else mat.color.set('#22c55e');
        }
      }
    });
  });

  // Make meshes clickable
  useEffect(() => {
    const handleClick = (mesh: THREE.Mesh) => {
      const partId = partMap.get(mesh.name) || null;
      console.log('[3D Viewer] Clicked mesh:', mesh.name, 'partId:', partId);
      selectMesh(mesh.name, null, partId);
    };

    // Add userData for click detection
    meshes.forEach((mesh) => {
      mesh.userData._clickHandler = () => handleClick(mesh);
    });
    
    console.log('[3D Viewer] Click handlers attached to', meshes.length, 'meshes');
  }, [meshes, partMap, selectMesh]);

  return null;
}
