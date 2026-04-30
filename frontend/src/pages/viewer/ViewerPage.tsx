import { useEffect } from 'react';
import { SceneViewer } from '@/components/3d/SceneViewer';
import { SensorBindingPanel } from '@/components/sensors/SensorBindingPanel';
import { useSensorStore } from '@/store/sensorStore';
import { useViewerStore } from '@/store/viewerStore';

export default function ViewerPage() {
  const { fetchSensors, initWebSocket } = useSensorStore();
  const selectedMeshName = useViewerStore((s) => s.selectedMeshName);

  useEffect(() => {
    fetchSensors();
    initWebSocket();
  }, []);

  return (
    <div className="flex h-[calc(100vh-3rem)] gap-4">
      {/* 3D Viewer */}
      <div className="flex-1">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">3D Viewer</h1>
            <p className="text-sm text-muted-foreground">Click on a machine part to inspect and bind sensors</p>
          </div>
        </div>
        <div className="h-[calc(100%-3rem)]">
          <SceneViewer />
        </div>
      </div>

      {/* Binding panel */}
      {selectedMeshName && (
        <div className="shrink-0">
          <SensorBindingPanel />
        </div>
      )}
    </div>
  );
}
