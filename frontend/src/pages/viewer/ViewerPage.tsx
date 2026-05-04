/* eslint-disable */
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SceneViewer } from '@/components/3d/SceneViewer';
import { VersionSelector } from '@/components/models/VersionSelector';
import { PresenceIndicator } from '@/components/collaboration/PresenceIndicator';
import { PlaybackControls } from '@/components/playback/PlaybackControls';
import { useSensorStore } from '@/store/sensorStore';
import { useViewerStore } from '@/store/viewerStore';
import { useAuthStore } from '@/store/authStore';
import { modelsApi } from '@/services/api';
import { DraggableSensorChip } from '@/components/3d/SensorDragOverlay';
import { AssetTreePanel } from './components/AssetTreePanel';
import { ControlSidebar } from './components/ControlSidebar';
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
    <div className="flex h-[calc(100vh-4rem)] bg-[#050B18] overflow-hidden relative">
      {/* Left Panel: Asset Tree */}
      <div className="w-64 shrink-0 border-r border-blue-900/30 z-20 bg-[#050B18]">
        <AssetTreePanel />
      </div>

      {/* Center Panel: 3D Viewer */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-gradient-to-b from-[#050B18] to-[#0A192F]">
        <div className="absolute top-4 left-4 z-10 pointer-events-none">
          <h1 className="text-2xl font-bold text-blue-100 drop-shadow-md">3D Viewer</h1>
          <p className="text-sm text-blue-300/70 drop-shadow-md">
            {activeModel ? activeModel.name : 'Demo factory — upload a model to view custom 3D'}
          </p>
        </div>
        <div className="absolute top-4 right-4 z-10 flex items-center gap-3">
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
            className={`text-xs px-3 py-1.5 rounded-md border transition-colors backdrop-blur-md ${
              showPlayback ? 'border-blue-400 bg-blue-900/30 text-blue-200' : 'border-blue-900/50 bg-[#0B1220]/50 text-blue-300 hover:text-blue-100 hover:bg-blue-900/30'
            }`}
            onClick={() => setShowPlayback(!showPlayback)}
          >
            Playback
          </button>
          {models.length > 0 && (
            <select
              className="h-9 rounded-lg border border-blue-900/50 bg-[#0B1220]/80 backdrop-blur-md px-3 text-sm text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

        {showPlayback && (
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <PlaybackControls
              sensorIds={sensors.map((s) => s.id)}
              onPlaybackTick={() => {}}
              onPlaybackEnd={() => {}}
            />
          </div>
        )}

        {/* The 3D Canvas wrapper */}
        <div className="w-full h-full relative">
          <SceneViewer model={activeModel} />
        </div>
      </div>

      {/* Right Panel: Control Sidebar & Tray */}
      <div className="shrink-0 flex flex-col z-20 border-l border-blue-900/30 bg-[#050B18]">
        <div className="flex-1 overflow-hidden">
          <ControlSidebar />
        </div>

        {/* Always-visible sensor tray for drag-and-drop */}
        {unboundSensors.length > 0 && !selectedMeshName && (
          <div className="p-4 border-t border-blue-900/50 bg-[#0B1220]/80 w-80 shrink-0">
            <p className="text-xs font-medium text-blue-300 mb-2">
              Drag sensors onto the 3D model
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar">
              {unboundSensors.map((s) => (
                <DraggableSensorChip
                  key={s.id}
                  sensorId={s.id}
                  sensorName={`${s.name} (${s.type})`}
                />
              ))}
            </div>
            <p className="text-[10px] text-blue-400/50 mt-2">
              {unboundSensors.length} unbound sensor{unboundSensors.length !== 1 ? 's' : ''} — drag to a mesh to bind
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
