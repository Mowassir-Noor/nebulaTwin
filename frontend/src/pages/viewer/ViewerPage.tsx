import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SceneViewer } from '@/components/3d/SceneViewer';
import { SensorBindingPanel } from '@/components/sensors/SensorBindingPanel';
import { VersionSelector } from '@/components/models/VersionSelector';
import { PresenceIndicator } from '@/components/collaboration/PresenceIndicator';
import { PlaybackControls } from '@/components/playback/PlaybackControls';
import { useSensorStore } from '@/store/sensorStore';
import { useViewerStore } from '@/store/viewerStore';
import { useAuthStore } from '@/store/authStore';
import { modelsApi } from '@/services/api';
import { DraggableSensorChip } from '@/components/3d/SensorDragOverlay';
import type { Model3D, CollaborationUser } from '@/types';

export default function ViewerPage() {
  const { fetchSensors, initWebSocket } = useSensorStore();
  const selectedMeshName = useViewerStore((s) => s.selectedMeshName);
  const setActiveModelInStore = useViewerStore((s) => s.setActiveModel);
  const [searchParams] = useSearchParams();
  const [models, setModels] = useState<Model3D[]>([]);
  const [activeModel, setActiveModel] = useState<Model3D | null>(null);
  const [collaborators, setCollaborators] = useState<CollaborationUser[]>([]);
  const [showPlayback, setShowPlayback] = useState(false);
  const user = useAuthStore((s) => s.user);
  const sensors = useSensorStore((s) => s.sensors);
  const activeModelTwinId = useViewerStore((s) => s.activeModelTwinId);

  // Unbound sensors scoped to the active model's twin (or all if no model)
  const unboundSensors = sensors.filter(
    (s) => !s.modelPartId && (!activeModelTwinId || !s.assetId || s.asset?.twinId === activeModelTwinId),
  );

  // Switch active model: update local state + store (clears selection)
  const handleModelChange = useCallback(
    (model: Model3D | null) => {
      setActiveModel(model);
      setActiveModelInStore(model?.id ?? null, model?.twinId ?? null);
      // Reload sensors so bindings reflect the new model context
      fetchSensors();
    },
    [setActiveModelInStore, fetchSensors],
  );

  const fetchModels = useCallback(async () => {
    try {
      console.log('[ViewerPage] Fetching models...');
      const { data } = await modelsApi.list();
      console.log('[ViewerPage] Models fetched:', data);
      setModels(data);

      // Load model from URL param
      const modelId = searchParams.get('modelId');
      if (modelId) {
        const found = data.find((m) => m.id === modelId);
        if (found) {
          console.log('[ViewerPage] Setting active model from URL:', found);
          handleModelChange(found);
        }
      }
    } catch (err) {
      console.error('[ViewerPage] Failed to fetch models:', err);
    }
  }, [searchParams, handleModelChange]);

  useEffect(() => {
    fetchSensors();
    initWebSocket();
    fetchModels();
  }, [fetchModels, fetchSensors, initWebSocket]);

  return (
    <div className="flex h-[calc(100vh-3rem)] gap-4">
      {/* 3D Viewer */}
      <div className="flex-1">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">3D Viewer</h1>
            <p className="text-sm text-muted-foreground">
              {activeModel ? activeModel.name : 'Demo factory — upload a model to view custom 3D'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <PresenceIndicator users={collaborators} currentUserId={user?.id || ''} />
            {activeModel && (
              <VersionSelector
                modelId={activeModel.id}
                currentVersion={activeModel.version}
                onSelectVersion={(id) => {
                  const m = models.find((m) => m.id === id);
                  if (m) handleModelChange(m);
                }}
              />
            )}
            <button
              className={`text-xs px-2 py-1 rounded border transition-colors ${
                showPlayback ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setShowPlayback(!showPlayback)}
            >
              Playback
            </button>
            {models.length > 0 && (
              <select
                className="h-9 rounded-lg border border-border bg-secondary px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                value={activeModel?.id || ''}
                onChange={(e) => {
                  const m = models.find((m) => m.id === e.target.value);
                  handleModelChange(m || null);
                }}
              >
                <option value="">Demo Factory</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} (v{m.version})</option>
                ))}
              </select>
            )}
          </div>
        </div>
        {showPlayback && (
          <div className="mb-2">
            <PlaybackControls
              sensorIds={sensors.map((s) => s.id)}
              onPlaybackTick={() => {}}
              onPlaybackEnd={() => {}}
            />
          </div>
        )}
        <div className={showPlayback ? 'h-[calc(100%-12rem)]' : 'h-[calc(100%-3rem)]'}>
          <SceneViewer model={activeModel} />
        </div>
      </div>

      {/* Right sidebar: binding panel + sensor tray */}
      <div className="shrink-0 w-80 flex flex-col gap-3 overflow-y-auto">
        {selectedMeshName && <SensorBindingPanel activeTwinId={activeModelTwinId ?? undefined} />}

        {/* Always-visible sensor tray for drag-and-drop */}
        {unboundSensors.length > 0 && !selectedMeshName && (
          <div className="rounded-xl border border-border bg-card p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Drag sensors onto the 3D model
            </p>
            <div className="flex flex-wrap gap-1.5">
              {unboundSensors.map((s) => (
                <DraggableSensorChip
                  key={s.id}
                  sensorId={s.id}
                  sensorName={`${s.name} (${s.type})`}
                />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {unboundSensors.length} unbound sensor{unboundSensors.length !== 1 ? 's' : ''} — drag to a mesh to bind
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
