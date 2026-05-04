/* eslint-disable */
import { Suspense, useRef, useMemo, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Html } from '@react-three/drei';
import { DemoFactory } from './DemoFactory';
import { UploadedModel } from './UploadedModel';
import { SceneDragDrop } from './SensorDragOverlay';
import { useViewerStore } from '@/store/viewerStore';
import { useSensorStore } from '@/store/sensorStore';
import { formatSensorValue, getSensorGradientColor, getSensorStatus, getSensorStatusClasses } from '@/utils/sensorVisualization';
import type { Model3D } from '@/types';
import type * as THREE from 'three';

interface SceneViewerProps {
  model?: Model3D | null;
  playbackValues?: Map<string, number>;
  playbackMode?: boolean;
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
function HoverTooltip({ mousePos, playbackValues }: { mousePos: { x: number; y: number } | null; playbackValues?: Map<string, number> }) {
  const hoveredMeshName = useViewerStore((s) => s.hoveredMeshName);
  const hoveredModelPartId = useViewerStore((s) => s.hoveredModelPartId);
  const sensors = useSensorStore((s) => s.sensors);
  const realtimeValues = useSensorStore((s) => s.realtimeValues);

  if (!hoveredMeshName || !mousePos) return null;

  const boundSensor = hoveredModelPartId
    ? sensors.find((s) => s.modelPartId === hoveredModelPartId)
    : null;
  const liveValue = boundSensor ? realtimeValues.get(boundSensor.id) : null;
  const displayedValue = boundSensor ? playbackValues?.get(boundSensor.id) ?? liveValue?.value ?? boundSensor.manualValue : undefined;
  const status = getSensorStatus(displayedValue, boundSensor ?? undefined);
  const color = getSensorGradientColor(displayedValue, boundSensor ?? undefined);

  return (
    <div
      className="pointer-events-none fixed z-50 min-w-44 rounded-2xl border border-cyan-400/30 bg-slate-950/92 px-3 py-2 text-xs shadow-2xl shadow-black/40 backdrop-blur-xl"
      style={{ left: mousePos.x + 14, top: mousePos.y - 10 }}
    >
      <p className="font-semibold text-slate-100">{hoveredMeshName}</p>
      {boundSensor ? (
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-400">{boundSensor.name}</span>
            <span className={`h-2 w-2 rounded-full shadow-[0_0_10px_currentColor] ${getSensorStatusClasses(status)}`} />
          </div>
          <p className="font-mono text-base font-semibold" style={{ color }}>{formatSensorValue(displayedValue, boundSensor.unit)}</p>
        </div>
      ) : (
        <p className="mt-1 text-slate-500">No sensor bound</p>
      )}
    </div>
  );
}

function PerformanceBadge() {
  const [fps, setFps] = useState(60);
  const framesRef = useRef(0);
  const lastRef = useRef(performance.now());

  useFrame(() => {
    framesRef.current += 1;
    const now = performance.now();
    if (now - lastRef.current >= 500) {
      setFps(Math.round((framesRef.current * 1000) / (now - lastRef.current)));
      framesRef.current = 0;
      lastRef.current = now;
    }
  });

  return (
    <Html fullscreen className="pointer-events-none">
      <div className="absolute bottom-4 right-4 rounded-xl border border-slate-700/80 bg-slate-950/70 px-3 py-1.5 font-mono text-[10px] text-slate-400 shadow-lg shadow-black/30 backdrop-blur">
        {fps} FPS
      </div>
    </Html>
  );
}

export function SceneViewer({ model, playbackValues, playbackMode = false }: SceneViewerProps = {}) {
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
      <HoverTooltip mousePos={mousePos} playbackValues={playbackValues} />
      <SceneDragDrop partMap={partMap} sceneRef={internalsRef}>
        <div
          className="h-full w-full overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-950 shadow-2xl shadow-black/30"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <Canvas
            camera={{ position: [5, 4, 5], fov: 50 }}
            shadows
            dpr={[1, 2]}
            className="!h-full !w-full"
            gl={{ antialias: true, alpha: true }}
          >
            <SceneCapture internalsRef={internalsRef} />
            <Suspense fallback={<Html center><span className="text-sm text-muted-foreground">Loading 3D...</span></Html>}>
              <color attach="background" args={['#020617']} />
              <fog attach="fog" args={['#020617', 12, 34]} />
              <ambientLight intensity={0.24} />
              <hemisphereLight args={['#67e8f9', '#0f172a', 0.38]} />
              <directionalLight position={[8, 10, 6]} intensity={1.25} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-0.0001} />
              <pointLight position={[-5, 4, -6]} intensity={0.45} color="#38bdf8" />
              <pointLight position={[5, 3, 4]} intensity={0.25} color="#2563eb" />
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.055, 0]} receiveShadow>
                <planeGeometry args={[80, 80]} />
                <meshStandardMaterial color="#020617" roughness={0.96} metalness={0.1} transparent opacity={0.72} />
              </mesh>
              <gridHelper args={[28, 56, '#155e75', '#1e293b']} position={[0, -0.045, 0]} />
              {model ? <UploadedModel model={model} playbackValues={playbackValues} playbackMode={playbackMode} /> : <DemoFactory playbackValues={playbackValues} playbackMode={playbackMode} />}
              <ContactShadows
                position={[0, -0.01, 0]}
                opacity={0.55}
                scale={18}
                blur={2.8}
                far={8}
              />
              <Environment preset="warehouse" background={false} environmentIntensity={0.55} />
              <PerformanceBadge />
              <OrbitControls
                makeDefault
                minDistance={2}
                maxDistance={20}
                enableDamping
                dampingFactor={0.08}
                rotateSpeed={0.55}
                zoomSpeed={0.65}
                panSpeed={0.6}
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
