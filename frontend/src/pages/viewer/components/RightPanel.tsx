import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, BarChart3, Cpu, Info, SlidersHorizontal, Unlink, X } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SensorBindingPanel } from '@/components/sensors/SensorBindingPanel';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useSensorStore } from '@/store/sensorStore';
import { useViewerStore } from '@/store/viewerStore';
import { formatSensorValue, getSensorGradientColor, getSensorStatus, getSensorStatusClasses, getSensorValue } from '@/utils/sensorVisualization';
import type { Sensor } from '@/types';

interface RightPanelProps {
  activeTwinId?: string;
}

type RightTab = 'overview' | 'live' | 'controls';

interface ChartPoint {
  time: string;
  value: number;
}

export function RightPanel({ activeTwinId }: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<RightTab>('overview');
  const selectedMeshName = useViewerStore((state) => state.selectedMeshName);
  const selectedModelPartId = useViewerStore((state) => state.selectedModelPartId);
  const clearSelection = useViewerStore((state) => state.clearSelection);
  const selectedSensor = useSensorStore((state) => state.selectedSensor);
  const selectSensor = useSensorStore((state) => state.selectSensor);
  const sensors = useSensorStore((state) => state.sensors);
  const realtimeValues = useSensorStore((state) => state.realtimeValues);

  const boundSensors = useMemo(() => {
    if (!selectedMeshName && !selectedModelPartId) return [];
    return sensors.filter((sensor) => (selectedModelPartId && sensor.modelPartId === selectedModelPartId) || (!selectedModelPartId && sensor.modelPart?.name === selectedMeshName));
  }, [selectedMeshName, selectedModelPartId, sensors]);

  const contextSensor = selectedSensor ?? boundSensors[0] ?? null;
  const hasContext = Boolean(selectedMeshName || contextSensor);

  useEffect(() => {
    if (selectedMeshName || selectedSensor) setActiveTab('overview');
  }, [selectedMeshName, selectedSensor]);

  return (
    <motion.aside
      initial={{ x: 16, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="relative z-20 flex h-full w-[360px] shrink-0 flex-col border-l border-slate-800/90 bg-slate-950/88 shadow-lg shadow-black/20 backdrop-blur-xl"
    >
      <div className="flex items-start justify-between border-b border-slate-800 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-300">Context</p>
          <h2 className="truncate text-sm font-semibold text-slate-100">{selectedMeshName || contextSensor?.name || 'No selection'}</h2>
          <p className="truncate text-xs text-slate-500">{selectedModelPartId || contextSensor?.type || 'Select a mesh or sensor to inspect'}</p>
        </div>
        {hasContext && (
          <button type="button" onClick={() => { clearSelection(); selectSensor(null); }} className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/80 text-slate-400 transition hover:border-cyan-400/50 hover:text-cyan-200">
            <X size={15} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1 border-b border-slate-800 p-2">
        <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<Info size={14} />} label="Overview" />
        <TabButton active={activeTab === 'live'} onClick={() => setActiveTab('live')} icon={<BarChart3 size={14} />} label="Live Data" />
        <TabButton active={activeTab === 'controls'} onClick={() => setActiveTab('controls')} icon={<SlidersHorizontal size={14} />} label="Controls" />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {!hasContext ? (
          <EmptyContext />
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                <Overview selectedMeshName={selectedMeshName} selectedModelPartId={selectedModelPartId} boundSensors={boundSensors} contextSensor={contextSensor} realtimeValues={realtimeValues} />
              </motion.div>
            )}
            {activeTab === 'live' && (
              <motion.div key="live" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                <LiveData sensor={contextSensor} realtimeValues={realtimeValues} />
              </motion.div>
            )}
            {activeTab === 'controls' && (
              <motion.div key="controls" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                {selectedMeshName && <SensorBindingPanel activeTwinId={activeTwinId} />}
                {contextSensor && <ContextSensorControls sensor={contextSensor} realtimeValues={realtimeValues} />}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </motion.aside>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick} className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-medium transition ${active ? 'bg-cyan-400/12 text-cyan-200 shadow-inner shadow-cyan-950/30' : 'text-slate-500 hover:bg-slate-900 hover:text-slate-200'}`}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function Overview({ selectedMeshName, selectedModelPartId, boundSensors, contextSensor, realtimeValues }: { selectedMeshName: string | null; selectedModelPartId: string | null; boundSensors: Sensor[]; contextSensor: Sensor | null; realtimeValues: Map<string, { value: number }> }) {
  return (
    <>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/45 p-4 shadow-lg shadow-black/10">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <Activity size={14} className="text-cyan-300" />
          Selected Part
        </div>
        <div className="mt-3 space-y-2">
          <MetricRow label="Mesh" value={selectedMeshName ?? 'None'} />
          <MetricRow label="Model Part ID" value={selectedModelPartId ?? 'Not mapped'} mono />
          <MetricRow label="Bound Sensors" value={String(boundSensors.length)} />
        </div>
      </div>

      {contextSensor && (
        <SensorSummaryCard sensor={contextSensor} realtimeValues={realtimeValues} />
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/45 p-4 shadow-lg shadow-black/10">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <Cpu size={14} className="text-blue-300" />
          Bound Sensors
        </div>
        {boundSensors.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-800 p-4 text-center text-xs text-slate-600">No sensors are bound to this mesh yet.</p>
        ) : (
          <div className="space-y-2">
            {boundSensors.map((sensor) => <SensorSummaryRow key={sensor.id} sensor={sensor} realtimeValues={realtimeValues} />)}
          </div>
        )}
      </div>
    </>
  );
}

function LiveData({ sensor, realtimeValues }: { sensor: Sensor | null; realtimeValues: Map<string, { value: number; timestamp?: string }> }) {
  const [series, setSeries] = useState<ChartPoint[]>([]);
  const value = sensor ? getSensorValue(sensor, realtimeValues) : undefined;

  useEffect(() => {
    setSeries([]);
  }, [sensor?.id]);

  useEffect(() => {
    if (!sensor || typeof value !== 'number') return;
    setSeries((current) => {
      const next = [...current, { time: new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }), value }];
      return next.slice(-40);
    });
  }, [sensor, value]);

  if (!sensor) {
    return <EmptyCard title="No sensor selected" description="Select a bound sensor or choose a sensor from the left panel." />;
  }

  const color = getSensorGradientColor(value, sensor);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/45 p-4 shadow-lg shadow-black/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-100">{sensor.name}</p>
          <p className="text-xs text-slate-500">Realtime telemetry stream</p>
        </div>
        <span className="font-mono text-lg font-semibold" style={{ color }}>{formatSensorValue(value, sensor.unit)}</span>
      </div>
      <div className="mt-5 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 10, right: 8, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="rightPanelLiveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px', color: '#e2e8f0' }} />
            <Area type="monotone" dataKey="value" stroke={color} fill="url(#rightPanelLiveGradient)" strokeWidth={2} isAnimationActive animationDuration={250} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ContextSensorControls({ sensor, realtimeValues }: { sensor: Sensor; realtimeValues: Map<string, { value: number }> }) {
  const value = getSensorValue(sensor, realtimeValues) ?? 0;
  const [manualValue, setManualValue] = useState(value);
  const { overrideSensor, clearOverride, startStream, stopStream } = useSensorStore();

  useEffect(() => {
    setManualValue(value);
  }, [value]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/45 p-4 shadow-lg shadow-black/10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-100">Sensor Controls</p>
          <p className="text-xs text-slate-500">Override or stream {sensor.name}</p>
        </div>
        {sensor.modelPartId && <Unlink size={15} className="text-slate-600" />}
      </div>
      <div className="space-y-3">
        <Input type="number" value={manualValue} onChange={(event) => setManualValue(Number(event.target.value))} className="rounded-xl border-slate-800 bg-slate-950/70" />
        <input type="range" min="0" max="100" step="0.1" value={manualValue} onChange={(event) => setManualValue(Number(event.target.value))} className="h-1 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-cyan-400" />
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" onClick={() => overrideSensor(sensor.id, manualValue)} className="rounded-xl bg-cyan-500 text-slate-950 hover:bg-cyan-400">Override</Button>
          <Button size="sm" variant="outline" onClick={() => clearOverride(sensor.id)} className="rounded-xl border-slate-700">Clear</Button>
          <Button size="sm" variant="outline" onClick={() => startStream(sensor.id, { pattern: 'SINE', interval_ms: 1000, min: 0, max: 100 })} className="rounded-xl border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10">Stream</Button>
          <Button size="sm" variant="outline" onClick={() => stopStream(sensor.id)} className="rounded-xl border-red-500/40 text-red-300 hover:bg-red-500/10">Stop</Button>
        </div>
      </div>
    </div>
  );
}

function SensorSummaryCard({ sensor, realtimeValues }: { sensor: Sensor; realtimeValues: Map<string, { value: number }> }) {
  const value = getSensorValue(sensor, realtimeValues);
  const status = getSensorStatus(value, sensor);
  const color = getSensorGradientColor(value, sensor);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/45 p-4 shadow-lg shadow-black/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-100">{sensor.name}</p>
          <p className="text-xs uppercase tracking-wider text-slate-500">{sensor.type} · {sensor.mode}</p>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getSensorStatusClasses(status)}`}>{status}</span>
      </div>
      <div className="mt-4 font-mono text-3xl font-semibold" style={{ color }}>{formatSensorValue(value, sensor.unit)}</div>
    </div>
  );
}

function SensorSummaryRow({ sensor, realtimeValues }: { sensor: Sensor; realtimeValues: Map<string, { value: number }> }) {
  const value = getSensorValue(sensor, realtimeValues);
  const status = getSensorStatus(value, sensor);

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-slate-200">{sensor.name}</p>
        <p className="truncate text-[10px] uppercase tracking-wider text-slate-600">{sensor.type}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-cyan-100">{formatSensorValue(value, sensor.unit)}</span>
        <span className={`h-2 w-2 rounded-full shadow-[0_0_10px_currentColor] ${getSensorStatusClasses(status)}`} />
      </div>
    </div>
  );
}

function MetricRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl bg-slate-950/45 px-3 py-2">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`min-w-0 truncate text-right text-xs text-slate-200 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function EmptyContext() {
  return <EmptyCard title="Select a mesh or sensor" description="Click a 3D model part or choose a sensor to open overview, live data, binding, and controls." />;
}

function EmptyCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/25 p-6 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
        <Info size={20} />
      </div>
      <p className="text-sm font-semibold text-slate-200">{title}</p>
      <p className="mt-2 text-xs leading-5 text-slate-600">{description}</p>
    </div>
  );
}
