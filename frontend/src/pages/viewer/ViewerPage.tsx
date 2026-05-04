/* eslint-disable */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Box, Cpu, Gauge, Radio, RotateCcw } from 'lucide-react';
import { SceneViewer } from '@/components/3d/SceneViewer';
import { useAuthStore } from '@/store/authStore';
import { useSensorStore } from '@/store/sensorStore';
import { useTwinStore } from '@/store/twinStore';
import { useViewerStore } from '@/store/viewerStore';
import { modelsApi } from '@/services/api';
import { BottomDock } from './components/BottomDock';
import { LeftPanel } from './components/LeftPanel';
import { RightPanel } from './components/RightPanel';
import { TopBar } from './components/TopBar';
import type { CollaborationUser, Model3D } from '@/types';

export default function ViewerPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const { fetchSensors, initWebSocket } = useSensorStore();
  const sensors = useSensorStore((state) => state.sensors);
  const realtimeValues = useSensorStore((state) => state.realtimeValues);
  const { twins, fetchTwins } = useTwinStore();
  const activeModelTwinId = useViewerStore((state) => state.activeModelTwinId);
  const setActiveModelInStore = useViewerStore((state) => state.setActiveModel);
  const focusOnModelPart = useViewerStore((state) => state.focusOnModelPart);
  const [searchParams] = useSearchParams();
  const [models, setModels] = useState<Model3D[]>([]);
  const [activeModel, setActiveModel] = useState<Model3D | null>(null);
  const [selectedTwinId, setSelectedTwinId] = useState<string | null>(null);
  const [collaborators] = useState<CollaborationUser[]>([]);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [leftWidth, setLeftWidth] = useState(336);
  const [bottomCollapsed, setBottomCollapsed] = useState(false);
  const [showPlayback, setShowPlayback] = useState(false);
  const [playbackValues, setPlaybackValues] = useState<Map<string, number>>(new Map());
  const [playbackTimestamp, setPlaybackTimestamp] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const user = useAuthStore((state) => state.user);

  const playbackActive = showPlayback && playbackValues.size > 0;
  const mode = playbackActive ? 'PLAYBACK' : 'LIVE';
  const activeTwinId = activeModelTwinId ?? selectedTwinId;
  const connectedSensors = useMemo(() => {
    return sensors.filter((sensor) => realtimeValues.has(sensor.id)).length;
  }, [realtimeValues, sensors]);
  const criticalSensors = useMemo(() => {
    return sensors.filter((sensor) => ((playbackActive ? playbackValues.get(sensor.id) : realtimeValues.get(sensor.id)?.value) ?? 0) >= 80).length;
  }, [playbackActive, playbackValues, realtimeValues, sensors]);

  const handleModelChange = useCallback(
    (model: Model3D | null) => {
      setActiveModel(model);
      setSelectedTwinId((current) => model?.twinId ?? current);
      setActiveModelInStore(model?.id ?? null, model?.twinId ?? null);
      fetchSensors();
    },
    [fetchSensors, setActiveModelInStore],
  );

  const handleTwinChange = useCallback(
    (twinId: string | null) => {
      setSelectedTwinId(twinId);
      if (!twinId) {
        setActiveModel(null);
        setActiveModelInStore(null, null);
        fetchSensors();
        return;
      }
      const matchingModel = models.find((model) => model.twinId === twinId && model.isLatest) ?? models.find((model) => model.twinId === twinId) ?? null;
      if (matchingModel) {
        handleModelChange(matchingModel);
        return;
      }
      setActiveModel(null);
      setActiveModelInStore(null, twinId);
      fetchSensors();
    },
    [fetchSensors, handleModelChange, models, setActiveModelInStore],
  );

  const fetchModels = useCallback(async () => {
    try {
      const { data } = await modelsApi.list();
      setModels(data);
      const modelId = searchParams.get('modelId');
      if (modelId) {
        const found = data.find((model) => model.id === modelId);
        if (found) {
          handleModelChange(found);
        }
      }
    } catch (err) {
      console.error('[ViewerPage] Failed to fetch models:', err);
    }
  }, [handleModelChange, searchParams]);

  const handlePlaybackTick = useCallback((values: Map<string, number>, timestamp: string) => {
    setPlaybackValues(new Map(values));
    setPlaybackTimestamp(timestamp);
    setShowPlayback(true);
  }, []);

  const handlePlaybackEnd = useCallback(() => {
    setShowPlayback(false);
    setPlaybackValues(new Map());
    setPlaybackTimestamp(null);
  }, []);

  const handleResetCamera = useCallback(() => {
    focusOnModelPart(null);
  }, [focusOnModelPart]);

  const handleToggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement && rootRef.current) {
      await rootRef.current.requestFullscreen();
      setIsFullscreen(true);
      return;
    }
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    fetchSensors();
    fetchTwins();
    initWebSocket(user?.tenantId);
    fetchModels();
  }, [fetchModels, fetchSensors, fetchTwins, initWebSocket, user?.tenantId]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div ref={rootRef} className="relative h-[calc(100vh-7rem)] min-h-[720px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-slate-100 shadow-2xl shadow-black/30">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(34,211,238,0.14),transparent_30%),radial-gradient(circle_at_84%_18%,rgba(59,130,246,0.13),transparent_34%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,1))]" />
      <div className="relative flex h-full flex-col">
        <TopBar
          twins={twins}
          models={models}
          activeModel={activeModel}
          activeTwinId={activeTwinId}
          mode={mode}
          showPlayback={showPlayback}
          collaborators={collaborators}
          currentUserId={user?.id ?? ''}
          isFullscreen={isFullscreen}
          onTwinChange={handleTwinChange}
          onModelChange={handleModelChange}
          onTogglePlayback={() => {
            setShowPlayback((current) => !current);
            setBottomCollapsed(false);
          }}
          onResetCamera={handleResetCamera}
          onToggleFullscreen={handleToggleFullscreen}
        />

        <div className="flex min-h-0 flex-1">
          <LeftPanel
            width={leftWidth}
            collapsed={leftCollapsed}
            activeTwinId={activeTwinId}
            onWidthChange={setLeftWidth}
            onToggleCollapsed={() => setLeftCollapsed((current) => !current)}
          />

          <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
            <div className="pointer-events-none absolute left-4 top-4 z-10 grid gap-2 sm:grid-cols-3">
              <StatusCard icon={<Cpu size={15} />} label="Sensors" value={String(sensors.length)} detail={`${connectedSensors} live`} />
              <StatusCard icon={<Gauge size={15} />} label="Critical" value={String(criticalSensors)} detail="threshold watch" tone={criticalSensors > 0 ? 'danger' : 'normal'} />
              <StatusCard icon={<Radio size={15} />} label="Mode" value={mode} detail={playbackTimestamp ? new Date(playbackTimestamp).toLocaleTimeString() : 'streaming'} />
            </div>

            <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
              <button type="button" onClick={() => setBottomCollapsed((current) => !current)} className="pointer-events-auto inline-flex h-9 items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-950/70 px-3 text-xs text-slate-300 shadow-lg shadow-black/20 backdrop-blur transition hover:border-cyan-400/50 hover:text-cyan-200">
                <Box size={14} />
                Dock
              </button>
              <button type="button" onClick={handleResetCamera} className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-950/70 text-slate-300 shadow-lg shadow-black/20 backdrop-blur transition hover:border-cyan-400/50 hover:text-cyan-200">
                <RotateCcw size={14} />
              </button>
            </div>

            <div className="min-h-0 flex-1 p-4">
              <SceneViewer model={activeModel} playbackValues={playbackActive ? playbackValues : undefined} playbackMode={playbackActive} />
            </div>

            <BottomDock
              collapsed={bottomCollapsed}
              mode={mode}
              playbackTimestamp={playbackTimestamp}
              playbackValues={playbackValues}
              onToggleCollapsed={() => setBottomCollapsed((current) => !current)}
              onPlaybackTick={handlePlaybackTick}
              onPlaybackEnd={handlePlaybackEnd}
            />
          </main>

          <RightPanel activeTwinId={activeTwinId ?? undefined} />
        </div>
      </div>
    </div>
  );
}

function StatusCard({ icon, label, value, detail, tone = 'normal' }: { icon: React.ReactNode; label: string; value: string; detail: string; tone?: 'normal' | 'danger' }) {
  return (
    <motion.div initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={`rounded-2xl border bg-slate-950/65 px-3 py-2 shadow-lg shadow-black/20 backdrop-blur-xl ${tone === 'danger' ? 'border-red-500/30' : 'border-slate-800/80'}`}>
      <div className={`flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider ${tone === 'danger' ? 'text-red-300' : 'text-cyan-300'}`}>
        {icon}
        {label}
      </div>
      <div className="mt-1 flex items-end gap-2">
        <span className="font-mono text-lg font-semibold text-slate-100">{value}</span>
        <span className="pb-0.5 text-[10px] text-slate-500">{detail}</span>
      </div>
    </motion.div>
  );
}
