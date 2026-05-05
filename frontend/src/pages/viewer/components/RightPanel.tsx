import { useEffect, useMemo, useRef, useState } from 'react';
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
  modelSensors: Sensor[];
}

type RightTab = 'overview' | 'live' | 'controls';

interface ChartPoint {
  time: string;
  value: number;
}

export function RightPanel({ activeTwinId, modelSensors }: RightPanelProps) {
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
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
              {!hasContext ? <EmptyContext /> : (
                <Overview selectedMeshName={selectedMeshName} selectedModelPartId={selectedModelPartId} boundSensors={boundSensors} contextSensor={contextSensor} realtimeValues={realtimeValues} />
              )}
            </motion.div>
          )}
          {activeTab === 'live' && (
            <motion.div key="live" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <LiveData modelSensors={modelSensors} contextSensor={contextSensor} realtimeValues={realtimeValues} />
            </motion.div>
          )}
          {activeTab === 'controls' && (
            <motion.div key="controls" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
              {!hasContext ? <EmptyContext /> : (
                <>
                  {selectedMeshName && <SensorBindingPanel activeTwinId={activeTwinId} />}
                  {contextSensor && <ContextSensorControls sensor={contextSensor} realtimeValues={realtimeValues} />}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
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

const SEVERITY_ORDER: Record<string, number> = { critical: 0, warning: 1, normal: 2, offline: 3 };

function LiveData({ modelSensors, contextSensor, realtimeValues }: {
  modelSensors: Sensor[];
  contextSensor: Sensor | null;
  realtimeValues: Map<string, { value: number; timestamp?: string }>;
}) {
  const sorted = useMemo(() => {
    const pinId = contextSensor?.id;
    return [...modelSensors].sort((a, b) => {
      if (a.id === pinId) return -1;
      if (b.id === pinId) return 1;
      const aVal = getSensorValue(a, realtimeValues);
      const bVal = getSensorValue(b, realtimeValues);
      const aOrd = SEVERITY_ORDER[getSensorStatus(aVal, a)] ?? 3;
      const bOrd = SEVERITY_ORDER[getSensorStatus(bVal, b)] ?? 3;
      return aOrd - bOrd;
    });
  }, [modelSensors, contextSensor?.id, realtimeValues]);

  if (modelSensors.length === 0) {
    return <EmptyCard title="No sensors on this model" description="Bind sensors to model parts using the Controls tab or the left panel." />;
  }

  return (
    <div className="space-y-2">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          {modelSensors.length} sensor{modelSensors.length !== 1 ? 's' : ''} · live telemetry
        </p>
        {contextSensor && (
          <span className="text-[10px] text-cyan-400">↑ selected pinned</span>
        )}
      </div>
      {sorted.map((sensor) => (
        <SensorLiveRow
          key={sensor.id}
          sensor={sensor}
          realtimeValues={realtimeValues}
          pinned={sensor.id === contextSensor?.id}
        />
      ))}
    </div>
  );
}

function SensorLiveRow({ sensor, realtimeValues, pinned }: {
  sensor: Sensor;
  realtimeValues: Map<string, { value: number; timestamp?: string }>;
  pinned: boolean;
}) {
  const [expanded, setExpanded] = useState(pinned);
  const [series, setSeries] = useState<ChartPoint[]>([]);
  const value = getSensorValue(sensor, realtimeValues);
  const status = getSensorStatus(value, sensor);
  const color = getSensorGradientColor(value, sensor);

  useEffect(() => {
    setSeries([]);
    setExpanded(pinned);
  }, [sensor.id, pinned]);

  useEffect(() => {
    if (typeof value !== 'number') return;
    setSeries((prev) => {
      const next = [...prev, { time: new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }), value }];
      return next.slice(-40);
    });
  }, [value]);

  return (
    <div className={`rounded-2xl border bg-slate-900/45 shadow-lg shadow-black/10 transition-colors ${pinned ? 'border-cyan-500/40' : 'border-slate-800'}`}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-100">{sensor.name}</p>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">{sensor.type}{sensor.unit ? ` · ${sensor.unit}` : ''}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-mono text-sm font-semibold tabular-nums" style={{ color }}>{formatSensorValue(value, sensor.unit)}</span>
          <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase ${getSensorStatusClasses(status)}`}>{status}</span>
          <span className={`text-slate-600 transition-transform ${expanded ? 'rotate-180' : ''}`}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M6 8L1 3h10z"/></svg>
          </span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-800/60 px-4 pb-4 pt-3 space-y-4">
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`spark-${sensor.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '10px', fontSize: '11px', color: '#e2e8f0' }} />
                    <Area type="monotone" dataKey="value" stroke={color} fill={`url(#spark-${sensor.id})`} strokeWidth={1.5} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <LiveDataSlider sensor={sensor} realtimeValues={realtimeValues} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LiveDataSlider({ sensor, realtimeValues }: { sensor: Sensor; realtimeValues: Map<string, { value: number }> }) {
  const { overrideSensor, clearOverride } = useSensorStore();
  const liveValue = getSensorValue(sensor, realtimeValues) ?? 0;

  const sliderMin = sensor.alertMinThreshold ?? 0;
  const sliderMax = sensor.alertMaxThreshold ?? 100;
  const sliderStep = (sliderMax - sliderMin) <= 10 ? 0.01 : (sliderMax - sliderMin) <= 100 ? 0.1 : 1;

  const isManual = sensor.mode === 'MANUAL';
  const isStream = sensor.mode === 'STREAM';

  const [draftValue, setDraftValue] = useState<number>(liveValue);
  const isDragging = useRef(false);

  useEffect(() => {
    if (!isDragging.current) setDraftValue(liveValue);
  }, [liveValue]);

  useEffect(() => {
    setDraftValue(liveValue);
  }, [sensor.id]);

  const color = getSensorGradientColor(draftValue, sensor);
  const pct = sliderMax > sliderMin ? ((draftValue - sliderMin) / (sliderMax - sliderMin)) * 100 : 50;

  function handleSliderChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = Number(event.target.value);
    setDraftValue(next);
    overrideSensor(sensor.id, next);
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = Number(event.target.value);
    setDraftValue(next);
  }

  function handleInputCommit() {
    overrideSensor(sensor.id, draftValue);
  }

  function handleClear() {
    clearOverride(sensor.id);
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/45 p-4 shadow-lg shadow-black/10">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-100">Manual Override</p>
          <p className="text-xs text-slate-500">{sensor.unit ? `${sliderMin} – ${sliderMax} ${sensor.unit}` : `${sliderMin} – ${sliderMax}`}</p>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
          isManual ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
          : isStream ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
          : 'border-slate-700 bg-slate-800/50 text-slate-400'
        }`}>
          {sensor.mode}
        </span>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <span className="font-mono text-2xl font-semibold tabular-nums" style={{ color }}>{formatSensorValue(draftValue, sensor.unit)}</span>
        <Input
          type="number"
          value={draftValue}
          min={sliderMin}
          max={sliderMax}
          step={sliderStep}
          onChange={handleInputChange}
          onBlur={handleInputCommit}
          onKeyDown={(e) => e.key === 'Enter' && handleInputCommit()}
          className="h-8 w-24 rounded-xl border-slate-700 bg-slate-950/70 text-right text-xs font-mono"
        />
      </div>

      <div className="relative mb-4">
        <div className="pointer-events-none absolute inset-y-0 flex w-full items-center px-0">
          <div
            className="h-1 rounded-full"
            style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: `linear-gradient(90deg, #22c55e, #eab308, #ef4444)`, boxShadow: `0 0 8px ${color}` }}
          />
        </div>
        <input
          type="range"
          min={sliderMin}
          max={sliderMax}
          step={sliderStep}
          value={draftValue}
          onMouseDown={() => { isDragging.current = true; }}
          onMouseUp={() => { isDragging.current = false; }}
          onTouchStart={() => { isDragging.current = true; }}
          onTouchEnd={() => { isDragging.current = false; }}
          onChange={handleSliderChange}
          className="relative h-1 w-full cursor-pointer appearance-none rounded-full bg-slate-800 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-slate-900 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-slate-900 [&::-moz-range-thumb]:bg-white"
          style={{ '--slider-color': color } as React.CSSProperties}
        />
        <div className="mt-1.5 flex justify-between">
          <span className="text-[10px] text-slate-600">{sliderMin}{sensor.unit ? ` ${sensor.unit}` : ''}</span>
          <span className="text-[10px] text-slate-600">{sliderMax}{sensor.unit ? ` ${sensor.unit}` : ''}</span>
        </div>
      </div>

      {isManual && (
        <Button size="sm" variant="outline" onClick={handleClear} className="w-full rounded-xl border-slate-700 text-slate-300 hover:border-cyan-400/50 hover:text-cyan-200">
          Clear Override → Return to REAL
        </Button>
      )}
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
