import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Box, ChevronDown, ChevronLeft, ChevronRight, Cpu, Filter, GripVertical, Layers3, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { useSensorStore } from '@/store/sensorStore';
import { useTwinStore } from '@/store/twinStore';
import { useViewerStore } from '@/store/viewerStore';
import { formatSensorValue, getSensorStatus, getSensorStatusClasses, getSensorValue } from '@/utils/sensorVisualization';
import type { Asset, DigitalTwin, Sensor } from '@/types';

interface LeftPanelProps {
  width: number;
  collapsed: boolean;
  activeTwinId: string | null;
  onWidthChange: (width: number) => void;
  onToggleCollapsed: () => void;
}

type LeftTab = 'assets' | 'sensors';
type SensorFilter = 'all' | 'normal' | 'warning' | 'critical' | 'bound' | 'unbound';

export function LeftPanel({ width, collapsed, activeTwinId, onWidthChange, onToggleCollapsed }: LeftPanelProps) {
  const [activeTab, setActiveTab] = useState<LeftTab>('assets');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SensorFilter>('all');
  const sensors = useSensorStore((state) => state.sensors);
  const realtimeValues = useSensorStore((state) => state.realtimeValues);
  const twins = useTwinStore((state) => state.twins);

  const scopedTwins = activeTwinId ? twins.filter((twin) => twin.id === activeTwinId) : twins;
  const scopedSensors = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return sensors
      .filter((sensor) => !activeTwinId || !sensor.assetId || sensor.asset?.twinId === activeTwinId)
      .filter((sensor) => {
        if (!normalizedQuery) return true;
        return [sensor.name, sensor.type, sensor.unit, sensor.asset?.name, sensor.modelPart?.name]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      })
      .filter((sensor) => {
        if (filter === 'bound') return Boolean(sensor.modelPartId);
        if (filter === 'unbound') return !sensor.modelPartId;
        if (filter === 'all') return true;
        const value = getSensorValue(sensor, realtimeValues);
        return getSensorStatus(value, sensor) === filter;
      });
  }, [activeTwinId, filter, query, realtimeValues, sensors]);

  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startWidth = width;

    const handleMove = (moveEvent: PointerEvent) => {
      onWidthChange(Math.min(440, Math.max(260, startWidth + moveEvent.clientX - startX)));
    };

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  if (collapsed) {
    return (
      <aside className="relative z-20 flex h-full w-12 shrink-0 flex-col items-center border-r border-slate-800 bg-slate-950/90 py-3 shadow-lg shadow-black/20 backdrop-blur-xl">
        <button type="button" onClick={onToggleCollapsed} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-cyan-200 transition hover:border-cyan-400/50">
          <ChevronRight size={16} />
        </button>
        <div className="mt-5 flex rotate-180 items-center gap-2 [writing-mode:vertical-rl]">
          <Layers3 size={15} className="text-cyan-300" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Navigator</span>
        </div>
      </aside>
    );
  }

  return (
    <motion.aside
      initial={{ x: -16, opacity: 0 }}
      animate={{ x: 0, opacity: 1, width }}
      className="relative z-20 flex h-full shrink-0 flex-col border-r border-slate-800/90 bg-slate-950/86 shadow-lg shadow-black/20 backdrop-blur-xl"
      style={{ width }}
    >
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-300">Navigator</p>
          <h2 className="text-sm font-semibold text-slate-100">Assets & Sensors</h2>
        </div>
        <button type="button" onClick={onToggleCollapsed} className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/80 text-slate-400 transition hover:border-cyan-400/50 hover:text-cyan-200">
          <ChevronLeft size={15} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1 border-b border-slate-800 p-2">
        <TabButton active={activeTab === 'assets'} onClick={() => setActiveTab('assets')} icon={<Box size={14} />} label="Assets Tree" />
        <TabButton active={activeTab === 'sensors'} onClick={() => setActiveTab('sensors')} icon={<Cpu size={14} />} label="Sensors" />
      </div>

      <div className="space-y-2 border-b border-slate-800 p-3">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search assets, sensors, parts" className="h-9 rounded-xl border-slate-800 bg-slate-900/80 pl-9 text-xs" />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 hover:text-slate-200">
              <X size={13} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-500" />
          <select value={filter} onChange={(event) => setFilter(event.target.value as SensorFilter)} className="h-8 flex-1 rounded-xl border border-slate-800 bg-slate-900/80 px-3 text-xs text-slate-200 outline-none focus:border-cyan-400/70">
            <option value="all">All sensors</option>
            <option value="normal">Normal</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
            <option value="bound">Bound</option>
            <option value="unbound">Unbound</option>
          </select>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <AnimatePresence mode="wait">
          {activeTab === 'assets' ? (
            <motion.div key="assets" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              {scopedTwins.length === 0 ? (
                <EmptyPanel title="No asset hierarchy" description="Create or select a twin to view its industrial asset structure." />
              ) : (
                scopedTwins.map((twin) => <TwinNode key={twin.id} twin={twin} query={query} />)
              )}
            </motion.div>
          ) : (
            <motion.div key="sensors" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              {scopedSensors.length === 0 ? (
                <EmptyPanel title="No sensors found" description="Try another search or filter." />
              ) : (
                scopedSensors.map((sensor) => <SensorRow key={sensor.id} sensor={sensor} />)
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="border-t border-slate-800 px-4 py-3 text-[10px] text-slate-500">
        {scopedSensors.length} sensor{scopedSensors.length === 1 ? '' : 's'} visible · drag any sensor onto a mesh
      </div>
      <div onPointerDown={startResize} className="absolute right-[-3px] top-0 h-full w-1.5 cursor-col-resize bg-transparent transition hover:bg-cyan-400/30" />
    </motion.aside>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition ${active ? 'bg-cyan-400/12 text-cyan-200 shadow-inner shadow-cyan-950/30' : 'text-slate-500 hover:bg-slate-900 hover:text-slate-200'}`}>
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

function TwinNode({ twin, query }: { twin: DigitalTwin; query: string }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/35 p-2">
      <button type="button" onClick={() => setExpanded(!expanded)} className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm text-slate-100 transition hover:bg-slate-800/70">
        {expanded ? <ChevronDown size={15} className="text-cyan-300" /> : <ChevronRight size={15} className="text-cyan-300" />}
        <Box size={15} className="text-cyan-400" />
        <span className="min-w-0 flex-1 truncate font-medium">{twin.name}</span>
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-400">Twin</span>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pl-4">
            <div className="mt-1 space-y-1 border-l border-slate-800 pl-3">
              {twin.assets?.length ? twin.assets.map((asset) => <AssetNode key={asset.id} asset={asset} />) : <p className="px-2 py-1 text-xs text-slate-600">No child assets</p>}
              <TwinSensorGroup twinId={twin.id} query={query} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AssetNode({ asset }: { asset: Asset }) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = Boolean(asset.children?.length || asset.sensors?.length);

  return (
    <div className="space-y-1">
      <button type="button" onClick={() => setExpanded(!expanded)} className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-xs text-slate-300 transition hover:bg-slate-800/70 hover:text-slate-100">
        {hasChildren ? expanded ? <ChevronDown size={14} className="text-blue-300" /> : <ChevronRight size={14} className="text-blue-300" /> : <span className="w-3.5" />}
        <Layers3 size={13} className="text-blue-300" />
        <span className="min-w-0 flex-1 truncate">{asset.name}</span>
        <span className="rounded-full border border-slate-700 px-1.5 py-0.5 text-[9px] uppercase text-slate-500">{asset.type}</span>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pl-5">
            <div className="space-y-1 border-l border-slate-800 pl-2">
              {asset.children?.map((child) => <AssetNode key={child.id} asset={child} />)}
              {asset.sensors?.map((sensor) => <SensorMiniRow key={sensor.id} sensor={sensor} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TwinSensorGroup({ twinId, query }: { twinId: string; query: string }) {
  const sensors = useSensorStore((state) => state.sensors);
  const normalizedQuery = query.trim().toLowerCase();
  const twinSensors = sensors.filter((sensor) => (sensor.asset?.twinId === twinId || !sensor.assetId) && (!normalizedQuery || sensor.name.toLowerCase().includes(normalizedQuery)));

  if (!twinSensors.length) return null;

  return (
    <div className="mt-2 space-y-1">
      {twinSensors.map((sensor) => <SensorMiniRow key={sensor.id} sensor={sensor} />)}
    </div>
  );
}

function SensorMiniRow({ sensor }: { sensor: Sensor }) {
  const realtimeValues = useSensorStore((state) => state.realtimeValues);
  const focusOnModelPart = useViewerStore((state) => state.focusOnModelPart);
  const value = getSensorValue(sensor, realtimeValues);
  const status = getSensorStatus(value, sensor);
  const statusClasses = getSensorStatusClasses(status);

  return (
    <button type="button" onClick={() => sensor.modelPartId && focusOnModelPart(sensor.modelPartId)} className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-xs text-slate-400 transition hover:bg-slate-800/70 hover:text-slate-100">
      <span className={`h-2 w-2 rounded-full shadow-[0_0_10px_currentColor] ${statusClasses}`} />
      <span className="min-w-0 flex-1 truncate">{sensor.name}</span>
      <span className="font-mono text-[10px] text-slate-500">{formatSensorValue(value, sensor.unit)}</span>
    </button>
  );
}

function SensorRow({ sensor }: { sensor: Sensor }) {
  const realtimeValues = useSensorStore((state) => state.realtimeValues);
  const selectSensor = useSensorStore((state) => state.selectSensor);
  const focusOnModelPart = useViewerStore((state) => state.focusOnModelPart);
  const value = getSensorValue(sensor, realtimeValues);
  const status = getSensorStatus(value, sensor);
  const statusClasses = getSensorStatusClasses(status);

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData('sensorId', sensor.id);
    event.dataTransfer.effectAllowed = 'link';
  };

  return (
    <div draggable onDragStart={handleDragStart} onClick={() => selectSensor(sensor)} className="group cursor-grab rounded-2xl border border-slate-800 bg-slate-900/45 p-3 shadow-lg shadow-black/10 transition hover:border-cyan-500/40 hover:bg-slate-900/80 active:cursor-grabbing">
      <div className="flex items-start gap-3">
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/70 text-slate-400 group-hover:text-cyan-200">
          <GripVertical size={14} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-100">{sensor.name}</p>
              <p className="truncate text-[10px] uppercase tracking-wider text-slate-500">{sensor.type} · {sensor.mode}</p>
            </div>
            <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_12px_currentColor] ${statusClasses}`} />
          </div>
          <div className="mt-3 flex items-end justify-between gap-3">
            <span className="font-mono text-lg font-semibold text-cyan-100">{formatSensorValue(value, sensor.unit)}</span>
            <button type="button" onClick={(event) => { event.stopPropagation(); if (sensor.modelPartId) focusOnModelPart(sensor.modelPartId); }} disabled={!sensor.modelPartId} className="rounded-lg border border-slate-700 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-400 transition hover:border-cyan-500/50 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-40">
              {sensor.modelPartId ? 'Focus' : 'Unbound'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/25 p-6 text-center">
      <p className="text-sm font-medium text-slate-300">{title}</p>
      <p className="mt-1 text-xs text-slate-600">{description}</p>
    </div>
  );
}
