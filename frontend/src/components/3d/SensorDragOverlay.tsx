import { useState, useCallback } from 'react';
import * as THREE from 'three';
import { sensorsApi } from '@/services/api';
import { useSensorStore } from '@/store/sensorStore';
import { toast } from '@/components/ui/Toast';

/**
 * HTML overlay wrapping the 3D canvas that intercepts drag events.
 * On drop, it resolves the sensorId from dataTransfer and the target
 * modelPartId from the mesh name stored during dragOver raycasting,
 * then calls sensorsApi.bind().
 *
 * The SceneViewer stores a ref to its Three.js scene + camera so this
 * overlay can raycast during dragOver to highlight meshes.
 */

interface SceneDragDropProps {
  children: React.ReactNode;
  /** meshName → modelPartId mapping from the loaded model */
  partMap: Map<string, string>;
  /** ref to the Three.js objects needed for raycasting (set by SceneViewer) */
  sceneRef: React.RefObject<{
    camera: THREE.Camera | null;
    scene: THREE.Scene | null;
    domElement: HTMLCanvasElement | null;
  } | null>;
}

export function SceneDragDrop({ children, partMap, sceneRef }: SceneDragDropProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dropTargetName, setDropTargetName] = useState<string | null>(null);
  const fetchSensors = useSensorStore((s) => s.fetchSensors);

  // Raycast to find mesh under cursor
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

      for (const hit of intersects) {
        const mesh = hit.object;
        if ((mesh as THREE.Mesh).isMesh && mesh.name) {
          const partId = partMap.get(mesh.name);
          if (partId) {
            return { meshName: mesh.name, modelPartId: partId };
          }
        }
      }
      return null;
    },
    [partMap, sceneRef],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'link';
      setIsDraggingOver(true);

      const hit = raycastAtEvent(e);
      setDropTargetName(hit?.meshName ?? null);

      // Highlight the hit mesh (emissive glow)
      const refs = sceneRef.current;
      if (refs?.scene) {
        refs.scene.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
            if (mat.emissive) {
              if (hit && obj.name === hit.meshName) {
                mat.emissive.setHex(0x3b82f6);
                mat.emissiveIntensity = 0.35;
              } else {
                mat.emissive.setHex(0x000000);
                mat.emissiveIntensity = 0;
              }
            }
          }
        });
      }
    },
    [raycastAtEvent, sceneRef],
  );

  const handleDragLeave = useCallback(() => {
    setIsDraggingOver(false);
    setDropTargetName(null);
    // Clear all highlights
    const refs = sceneRef.current;
    if (refs?.scene) {
      refs.scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (mat.emissive) {
            mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 0;
          }
        }
      });
    }
  }, [sceneRef]);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(false);
      setDropTargetName(null);

      const sensorId = e.dataTransfer.getData('sensorId');
      if (!sensorId) return;

      // Raycast to find drop target
      const hit = raycastAtEvent(e);
      if (!hit) {
        toast.error('Drop on a model mesh to bind the sensor');
        return;
      }

      try {
        await sensorsApi.bind(sensorId, hit.modelPartId);
        toast.success(`Sensor bound to "${hit.meshName}"`);
        await fetchSensors();
      } catch {
        toast.error('Failed to bind sensor to mesh');
      }

      // Clear highlights
      handleDragLeave();
    },
    [raycastAtEvent, fetchSensors, handleDragLeave],
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
