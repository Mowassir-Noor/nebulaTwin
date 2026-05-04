import { Activity, Box, Clock3, Maximize2, Minimize2, RefreshCcw, Radio, Route, TimerReset } from 'lucide-react';
import { motion } from 'framer-motion';
import { ConnectionStatus } from '@/components/ui/ConnectionStatus';
import { PresenceIndicator } from '@/components/collaboration/PresenceIndicator';
import { VersionSelector } from '@/components/models/VersionSelector';
import type { CollaborationUser, DigitalTwin, Model3D } from '@/types';

interface TopBarProps {
  twins: DigitalTwin[];
  models: Model3D[];
  activeModel: Model3D | null;
  activeTwinId: string | null;
  mode: 'LIVE' | 'PLAYBACK';
  showPlayback: boolean;
  collaborators: CollaborationUser[];
  currentUserId: string;
  isFullscreen: boolean;
  onTwinChange: (twinId: string | null) => void;
  onModelChange: (model: Model3D | null) => void;
  onTogglePlayback: () => void;
  onResetCamera: () => void;
  onToggleFullscreen: () => void;
}

const selectClass = 'h-9 rounded-xl border border-slate-700/80 bg-slate-950/70 px-3 text-xs text-slate-100 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-500/20';

export function TopBar({
  twins,
  models,
  activeModel,
  activeTwinId,
  mode,
  showPlayback,
  collaborators,
  currentUserId,
  isFullscreen,
  onTwinChange,
  onModelChange,
  onTogglePlayback,
  onResetCamera,
  onToggleFullscreen,
}: TopBarProps) {
  const filteredModels = activeTwinId ? models.filter((model) => model.twinId === activeTwinId) : models;

  return (
    <motion.header
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="relative z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-800/90 bg-slate-950/90 px-4 shadow-lg shadow-black/20 backdrop-blur-xl"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300 shadow-lg shadow-cyan-950/20">
          <Route size={18} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-sm font-semibold uppercase tracking-[0.22em] text-slate-100">NebulaTwin Viewer</h1>
            <span className="hidden rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-cyan-200 lg:inline-flex">
              Industrial Digital Twin
            </span>
          </div>
          <p className="truncate text-xs text-slate-500">
            {activeModel ? `${activeModel.name} · v${activeModel.version}` : 'Demo factory workspace'}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
        <div className="hidden items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 px-2 py-1 xl:flex">
          <Box size={14} className="text-cyan-300" />
          <select className={selectClass} value={activeTwinId ?? ''} onChange={(event) => onTwinChange(event.target.value || null)}>
            <option value="">All twins</option>
            {twins.map((twin) => (
              <option key={twin.id} value={twin.id}>{twin.name}</option>
            ))}
          </select>
        </div>

        <div className="flex min-w-[220px] items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 px-2 py-1">
          <Activity size={14} className="text-blue-300" />
          <select
            className={`${selectClass} min-w-0 flex-1`}
            value={activeModel?.id ?? ''}
            onChange={(event) => {
              const model = models.find((item) => item.id === event.target.value);
              onModelChange(model ?? null);
            }}
          >
            <option value="">Demo Factory</option>
            {filteredModels.map((model) => (
              <option key={model.id} value={model.id}>{model.name} (v{model.version})</option>
            ))}
          </select>
          {activeModel && (
            <VersionSelector
              modelId={activeModel.id}
              currentVersion={activeModel.version}
              onSelectVersion={(id) => {
                const model = models.find((item) => item.id === id);
                if (model) onModelChange(model);
              }}
            />
          )}
        </div>

        <div className="hidden items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 px-2 py-1 2xl:flex">
          <Clock3 size={14} className="text-slate-400" />
          <span className="text-xs text-slate-400">Last 60 min</span>
          <button
            type="button"
            onClick={onTogglePlayback}
            className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-medium transition ${showPlayback ? 'border-cyan-400/60 bg-cyan-400/15 text-cyan-100' : 'border-slate-700 bg-slate-950/60 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-100'}`}
          >
            <TimerReset size={14} />
            Playback
          </button>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider md:flex ${mode === 'LIVE' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-cyan-400/40 bg-cyan-400/10 text-cyan-200'}`}>
          <Radio size={13} className={mode === 'LIVE' ? 'animate-pulse' : ''} />
          {mode}
        </div>
        <div className="hidden rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1.5 md:block">
          <ConnectionStatus />
        </div>
        <PresenceIndicator users={collaborators} currentUserId={currentUserId} />
        <button type="button" onClick={onResetCamera} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/70 text-slate-300 transition hover:border-cyan-500/50 hover:text-cyan-200" title="Reset camera">
          <RefreshCcw size={15} />
        </button>
        <button type="button" onClick={onToggleFullscreen} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/70 text-slate-300 transition hover:border-cyan-500/50 hover:text-cyan-200" title="Toggle fullscreen">
          {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
      </div>
    </motion.header>
  );
}
