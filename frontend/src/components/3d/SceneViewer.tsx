import { Suspense, useRef, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Html } from '@react-three/drei';
import { useViewerStore } from '@/store/viewerStore';
import { useSensorStore } from '@/store/sensorStore';
import { DemoFactory } from './DemoFactory';

export function SceneViewer() {
  return (
    <div className="h-full w-full rounded-xl border border-border bg-card overflow-hidden">
      <Canvas
        camera={{ position: [5, 4, 5], fov: 50 }}
        shadows
        className="!h-full !w-full"
      >
        <Suspense fallback={<Html center><span className="text-sm text-muted-foreground">Loading 3D...</span></Html>}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
          <pointLight position={[-5, 5, -5]} intensity={0.3} />
          <DemoFactory />
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
  );
}
