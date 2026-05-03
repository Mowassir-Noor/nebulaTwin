import { Suspense, useRef, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Html } from '@react-three/drei';
import { DemoFactory } from './DemoFactory';
import { UploadedModel } from './UploadedModel';
import { SceneDragDrop } from './SensorDragOverlay';
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
  // Write once per render — cheap
  internalsRef.current = { camera, scene, domElement: gl.domElement };
  return null;
}

export function SceneViewer({ model }: SceneViewerProps = {}) {
  const internalsRef = useRef<SceneInternals | null>(null);

  // Build meshName → modelPartId map from the active model
  const partMap = useMemo(() => {
    const map = new Map<string, string>();
    const parts = model?.modelParts || model?.parts || [];
    parts.forEach((p) => map.set(p.name, p.id));
    return map;
  }, [model]);

  return (
    <SceneDragDrop partMap={partMap} sceneRef={internalsRef}>
      <div className="h-full w-full rounded-xl border border-border bg-card overflow-hidden">
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
  );
}
