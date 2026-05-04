/* eslint-disable */
import { useState, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { sensorsApi } from '@/services/api';
import { useSensorStore } from '@/store/sensorStore';
import { useViewerStore } from '@/store/viewerStore';
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
  const [successTargetName, setSuccessTargetName] = useState<string | null>(null);
  const fetchSensors = useSensorStore((s) => s.fetchSensors);
  const hoverMesh = useViewerStore((s) => s.hoverMesh);

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
      hoverMesh(hit?.meshName ?? null, hit?.modelPartId ?? null);

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
    [hoverMesh, raycastAtEvent, sceneRef],
  );

  const handleDragLeave = useCallback(() => {
    setIsDraggingOver(false);
    setDropTargetName(null);
    lastHitRef.current = null;
    hoverMesh(null, null);
    const refs = sceneRef.current;
    if (refs?.scene) clearSceneHighlights(refs.scene);
  }, [hoverMesh, sceneRef]);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(false);
      setDropTargetName(null);
      hoverMesh(null, null);

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
        setSuccessTargetName(hit.meshName);
        window.setTimeout(() => setSuccessTargetName(null), 1400);
        await fetchSensors();
      } catch (err: unknown) {
        const msg =
          (err as any)?.response?.data?.message ?? 'Failed to bind sensor to mesh';
        toast.error(msg);
      }

      const refs = sceneRef.current;
      if (refs?.scene) clearSceneHighlights(refs.scene);
    },
    [raycastAtEvent, fetchSensors, hoverMesh, sceneRef],
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
        <div className="absolute inset-0 pointer-events-none z-10 flex items-end justify-center rounded-2xl border-2 border-dashed border-cyan-400/55 bg-cyan-400/5 pb-4 shadow-[inset_0_0_70px_rgba(34,211,238,0.08)]">
          <span className="rounded-xl border border-cyan-400/30 bg-slate-950/90 px-4 py-2 text-sm font-medium text-cyan-100 shadow-lg shadow-black/30 backdrop-blur-xl">
            {dropTargetName
              ? `Drop to bind → ${dropTargetName}`
              : 'Drag over a mesh to target it'}
          </span>
        </div>
      )}
      {successTargetName && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-emerald-400/5">
          <div className="rounded-2xl border border-emerald-400/40 bg-slate-950/90 px-5 py-3 text-sm font-semibold text-emerald-200 shadow-2xl shadow-emerald-950/30 backdrop-blur-xl animate-in zoom-in-95 fade-in">
            Sensor bound to {successTargetName}
          </div>
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
      className="inline-flex cursor-grab items-center gap-1.5 rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-2 py-1 text-xs text-cyan-200 transition-colors hover:border-cyan-300/50 active:cursor-grabbing"
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
