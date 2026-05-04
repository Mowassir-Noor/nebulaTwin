import { useState, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { sensorsApi } from '@/services/api';
import { useSensorStore } from '@/store/sensorStore';
import { toast } from '@/components/ui/Toast';

interface SceneDragDropProps {
  children: React.ReactNode;
  /** meshName → modelPartId (primary) + meshIndex → modelPartId (fallback) */
  partMap: Map<string, string>;
  /** ref to the Three.js objects needed for raycasting (set by SceneViewer) */
  sceneRef: React.RefObject<{
    camera: THREE.Camera | null;
    scene: THREE.Scene | null;
    domElement: HTMLCanvasElement | null;
  } | null>;
}

function clearSceneHighlights(scene: THREE.Scene) {
  scene.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mats = Array.isArray((obj as THREE.Mesh).material)
        ? ((obj as THREE.Mesh).material as THREE.Material[])
        : [(obj as THREE.Mesh).material as THREE.Material];
      for (const m of mats) {
        const mat = m as THREE.MeshStandardMaterial;
        if (mat.emissive) {
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0;
        }
      }
    }
  });
}

export function SceneDragDrop({ children, partMap, sceneRef }: SceneDragDropProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dropTargetName, setDropTargetName] = useState<string | null>(null);
  const fetchSensors = useSensorStore((s) => s.fetchSensors);

  // Debounce dragOver raycasting — only run every 50ms
  const lastRaycastTs = useRef(0);
  const lastHitRef = useRef<{ meshName: string; modelPartId: string } | null>(null);

  // Build indexed meshes array once per scene for index-based fallback
  const getIndexedMeshes = useCallback((): THREE.Mesh[] => {
    const refs = sceneRef.current;
    if (!refs?.scene) return [];
    const found: THREE.Mesh[] = [];
    refs.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) found.push(obj as THREE.Mesh);
    });
    return found;
  }, [sceneRef]);

  const raycastAtEvent = useCallback(
    (e: React.DragEvent): { meshName: string; modelPartId: string } | null => {
      const refs = sceneRef.current;
      if (!refs?.camera || !refs.scene || !refs.domElement) return null;

      const rect = refs.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, refs.camera);
      const intersects = raycaster.intersectObjects(refs.scene.children, true);

      const indexedMeshes = getIndexedMeshes();

      for (const hit of intersects) {
        const mesh = hit.object as THREE.Mesh;
        if (!mesh.isMesh) continue;

        // Primary: name-based lookup
        if (mesh.name) {
          const partId = partMap.get(mesh.name);
          if (partId) return { meshName: mesh.name, modelPartId: partId };
        }

        // Fallback: index-based lookup
        const idx = indexedMeshes.indexOf(mesh);
        if (idx !== -1) {
          const partId = partMap.get(`__idx_${idx}`);
          if (partId) return { meshName: mesh.name || `part_${idx}`, modelPartId: partId };
        }
      }
      return null;
    },
    [partMap, sceneRef, getIndexedMeshes],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'link';
      setIsDraggingOver(true);

      // Debounce: skip raycast if called too recently
      const now = Date.now();
      if (now - lastRaycastTs.current < 50) return;
      lastRaycastTs.current = now;

      const hit = raycastAtEvent(e);
      lastHitRef.current = hit;
      setDropTargetName(hit?.meshName ?? null);

      const refs = sceneRef.current;
      if (refs?.scene) {
        clearSceneHighlights(refs.scene);
        if (hit) {
          refs.scene.traverse((obj) => {
            if ((obj as THREE.Mesh).isMesh && obj.name === hit.meshName) {
              const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
              if (mat?.emissive) {
                mat.emissive.setHex(0x3b82f6);
                mat.emissiveIntensity = 0.35;
              }
            }
          });
        }
      }
    },
    [raycastAtEvent, sceneRef],
  );

  const handleDragLeave = useCallback(() => {
    setIsDraggingOver(false);
    setDropTargetName(null);
    lastHitRef.current = null;
    const refs = sceneRef.current;
    if (refs?.scene) clearSceneHighlights(refs.scene);
  }, [sceneRef]);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(false);
      setDropTargetName(null);

      const sensorId = e.dataTransfer.getData('sensorId');
      if (!sensorId) return;

      // Use cached last hit to avoid re-raycasting on drop
      const hit = lastHitRef.current ?? raycastAtEvent(e);
      lastHitRef.current = null;

      if (!hit) {
        toast.error('Drop on a model mesh to bind the sensor');
        const refs = sceneRef.current;
        if (refs?.scene) clearSceneHighlights(refs.scene);
        return;
      }

      try {
        await sensorsApi.bind(sensorId, hit.modelPartId);
        toast.success(`Sensor bound to "${hit.meshName}"`);
        await fetchSensors();
      } catch (err: unknown) {
        const msg =
          (err as any)?.response?.data?.message ?? 'Failed to bind sensor to mesh';
        toast.error(msg);
      }

      const refs = sceneRef.current;
      if (refs?.scene) clearSceneHighlights(refs.scene);
    },
    [raycastAtEvent, fetchSensors, sceneRef],
  );

  return (
    <div
      className="relative h-full w-full"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
      {/* Visual feedback overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 pointer-events-none z-10 rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 flex items-end justify-center pb-4">
          <span className="text-primary text-sm font-medium bg-background/90 px-4 py-1.5 rounded-lg shadow-sm">
            {dropTargetName
              ? `Drop to bind → ${dropTargetName}`
              : 'Drag over a mesh to target it'}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Draggable sensor chip for the sensor list / binding panel.
 * Stores sensorId in dataTransfer so the SceneDragDrop can read it on drop.
 */
interface DraggableSensorChipProps {
  sensorId: string;
  sensorName: string;
}

export function DraggableSensorChip({ sensorId, sensorName }: DraggableSensorChipProps) {
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData('sensorId', sensorId);
      e.dataTransfer.effectAllowed = 'link';
    },
    [sensorId],
  );

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="inline-flex items-center gap-1.5 px-2 py-1 bg-primary/10 text-primary text-xs rounded cursor-grab active:cursor-grabbing border border-primary/20 hover:border-primary/40 transition-colors"
      title="Drag onto a 3D mesh to bind this sensor"
    >
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="9" cy="5" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="9" cy="19" r="1" />
        <circle cx="15" cy="5" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="19" r="1" />
      </svg>
      {sensorName}
    </div>
  );
}
