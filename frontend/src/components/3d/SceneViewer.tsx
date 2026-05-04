import { Suspense, useRef, useMemo, useState, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Html } from '@react-three/drei';
import { DemoFactory } from './DemoFactory';
import { UploadedModel } from './UploadedModel';
import { SceneDragDrop } from './SensorDragOverlay';
import { useViewerStore } from '@/store/viewerStore';
import { useSensorStore } from '@/store/sensorStore';
import type { Model3D } from '@/types';
import type * as THREE from 'three';

interface SceneViewerProps {
  model?: Model3D | null;
}

/** Exported ref shape for the drag-drop overlay to raycast into the scene */
export interface SceneInternals {
  camera: THREE.Camera | null;
  scene: THREE.Scene | null;
  domElement: HTMLCanvasElement | null;
}

/** Inner component that captures Three.js internals into a shared ref */
function SceneCapture({ internalsRef }: { internalsRef: React.MutableRefObject<SceneInternals | null> }) {
  const { camera, scene, gl } = useThree();
  internalsRef.current = { camera, scene, domElement: gl.domElement };
  return null;
}

/** Hover tooltip that reads from viewerStore + sensorStore */
function HoverTooltip({ mousePos }: { mousePos: { x: number; y: number } | null }) {
  const hoveredMeshName = useViewerStore((s) => s.hoveredMeshName);
  const hoveredModelPartId = useViewerStore((s) => s.hoveredModelPartId);
  const sensors = useSensorStore((s) => s.sensors);
  const realtimeValues = useSensorStore((s) => s.realtimeValues);

  if (!hoveredMeshName || !mousePos) return null;

  const boundSensor = hoveredModelPartId
    ? sensors.find((s) => s.modelPartId === hoveredModelPartId)
    : null;
  const liveValue = boundSensor ? realtimeValues.get(boundSensor.id) : null;

  return (
    <div
      className="pointer-events-none fixed z-50 rounded-lg border border-border bg-card/95 px-3 py-2 shadow-lg text-xs backdrop-blur-sm"
      style={{ left: mousePos.x + 14, top: mousePos.y - 10 }}
    >
      <p className="font-semibold text-foreground">{hoveredMeshName}</p>
      {boundSensor ? (
        <p className="text-muted-foreground mt-0.5">
          {boundSensor.name}:{' '}
          <span className="font-mono text-primary">
            {liveValue ? liveValue.value.toFixed(1) : boundSensor.manualValue?.toFixed(1) ?? '--'}{' '}
            {boundSensor.unit}
          </span>
        </p>
      ) : (
        <p className="text-muted-foreground mt-0.5">No sensor bound</p>
      )}
    </div>
  );
}

export function SceneViewer({ model }: SceneViewerProps = {}) {
  const internalsRef = useRef<SceneInternals | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Build dual partMap: name-based (primary) + __idx_{n} (index fallback)
  // The index keys let SceneDragDrop resolve parts even when mesh names mismatch
  const partMap = useMemo(() => {
    const map = new Map<string, string>();
    const parts = model?.modelParts || model?.parts || [];
    parts.forEach((p, i) => {
      map.set(p.name, p.id);
      const idx = typeof (p as any).index === 'number' ? (p as any).index : i;
      map.set(`__idx_${idx}`, p.id);
    });
    return map;
  }, [model]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMousePos(null);
  }, []);

  return (
    <>
      <HoverTooltip mousePos={mousePos} />
      <SceneDragDrop partMap={partMap} sceneRef={internalsRef}>
        <div
          className="h-full w-full rounded-xl border border-border bg-card overflow-hidden"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <Canvas
            camera={{ position: [5, 4, 5], fov: 50 }}
            shadows
            className="!h-full !w-full"
          >
            <SceneCapture internalsRef={internalsRef} />
            <Suspense fallback={<Html center><span className="text-sm text-muted-foreground">Loading 3D...</span></Html>}>
              <ambientLight intensity={0.4} />
              <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
              <pointLight position={[-5, 5, -5]} intensity={0.3} />
              {model ? <UploadedModel model={model} /> : <DemoFactory />}
              <ContactShadows
                position={[0, -0.01, 0]}
                opacity={0.4}
                scale={10}
                blur={2}
              />
              <Environment preset="city" />
              <OrbitControls
                makeDefault
                minDistance={2}
                maxDistance={20}
                enablePan
                enableZoom
                enableRotate
              />
            </Suspense>
          </Canvas>
        </div>
      </SceneDragDrop>
    </>
  );
}
