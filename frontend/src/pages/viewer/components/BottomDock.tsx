import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, BarChart3, ChevronDown, ChevronUp, FileText, Radio, TimerReset } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PlaybackControls } from '@/components/playback/PlaybackControls';
import { AlertsPanel } from './AlertsPanel';
import { useSensorStore } from '@/store/sensorStore';
import { formatSensorValue, getSensorGradientColor, getSensorValue } from '@/utils/sensorVisualization';
import type { Sensor } from '@/types';

interface BottomDockProps {
  collapsed: boolean;
  mode: 'LIVE' | 'PLAYBACK';
  playbackTimestamp: string | null;
  playbackValues: Map<string, number>;
  modelSensors: Sensor[];
  onToggleCollapsed: () => void;
  onPlaybackTick: (values: Map<string, number>, timestamp: string) => void;
  onPlaybackEnd: () => void;
}

type DockTab = 'charts' | 'alerts' | 'logs';

interface ChartPoint {
  time: string;
  [key: string]: string | number;
}

export function BottomDock({ collapsed, mode, playbackTimestamp, playbackValues, modelSensors, onToggleCollapsed, onPlaybackTick, onPlaybackEnd }: BottomDockProps) {
  const [activeTab, setActiveTab] = useState<DockTab>('charts');
  const realtimeValues = useSensorStore((state) => state.realtimeValues);
  const chartSensors = useMemo(() => modelSensors.slice(0, 4), [modelSensors]);
  const [series, setSeries] = useState<ChartPoint[]>([]);

  const chartSensorKey = chartSensors.map((s) => s.id).join(',');
  useEffect(() => {
    setSeries([]);
  }, [chartSensorKey]);

  useEffect(() => {
    if (chartSensors.length === 0) return;
    const time = mode === 'PLAYBACK' && playbackTimestamp
      ? new Date(playbackTimestamp).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })
      : new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' });
    const point: ChartPoint = { time };

    chartSensors.forEach((sensor) => {
      const value = mode === 'PLAYBACK' ? playbackValues.get(sensor.id) : getSensorValue(sensor, realtimeValues);
      if (typeof value === 'number') point[sensor.id] = value;
    });

    if (Object.keys(point).length <= 1) return;
    setSeries((current) => [...current, point].slice(-80));
  }, [chartSensors, mode, playbackTimestamp, playbackValues, realtimeValues]);

  const logs = useMemo(() => {
    const modelSensorIds = new Set(modelSensors.map((s) => s.id));
    return Array.from(realtimeValues.values())
      .filter((item) => modelSensorIds.has(item.sensorId))
      .slice(-24)
      .reverse()
      .map((item) => {
        const sensor = modelSensors.find((entry) => entry.id === item.sensorId);
        return {
          id: `${item.sensorId}-${item.timestamp}`,
          sensorName: sensor?.name ?? item.sensorId,
          value: item.value,
          unit: sensor?.unit,
          timestamp: item.timestamp,
          mode: item.mode,
        };
      });
  }, [realtimeValues, modelSensors]);

  if (collapsed) {
    return (
      <div className="relative z-20 flex h-12 shrink-0 items-center justify-between border-t border-slate-800 bg-slate-950/90 px-4 shadow-lg shadow-black/20 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <BarChart3 size={15} className="text-cyan-300" />
          Bottom dock collapsed · {mode === 'PLAYBACK' ? 'Playback timeline active' : 'Live telemetry'}
        </div>
        <button type="button" onClick={onToggleCollapsed} className="flex h-8 items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3 text-xs text-slate-300 transition hover:border-cyan-400/50 hover:text-cyan-200">
          <ChevronUp size={14} />
          Open Dock
        </button>
      </div>
    );
  }

  return (
    <motion.section
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 270, opacity: 1 }}
      className="relative z-20 flex h-[270px] shrink-0 flex-col border-t border-slate-800/90 bg-slate-950/90 shadow-lg shadow-black/30 backdrop-blur-xl"
    >
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
        <div className="flex items-center gap-2">
          <DockTabButton active={activeTab === 'charts'} onClick={() => setActiveTab('charts')} icon={<BarChart3 size={14} />} label="Charts" />
          <DockTabButton active={activeTab === 'alerts'} onClick={() => setActiveTab('alerts')} icon={<AlertTriangle size={14} />} label="Alerts" />
          <DockTabButton active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} icon={<FileText size={14} />} label="Logs" />
        </div>
        <div className="flex items-center gap-2">
          <div className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider sm:flex ${mode === 'LIVE' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-cyan-400/40 bg-cyan-400/10 text-cyan-200'}`}>
            {mode === 'LIVE' ? <Radio size={12} className="animate-pulse" /> : <TimerReset size={12} />}
            {mode}{playbackTimestamp ? ` · ${new Date(playbackTimestamp).toLocaleTimeString()}` : ''}
          </div>
          <button type="button" onClick={onToggleCollapsed} className="flex h-8 items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3 text-xs text-slate-300 transition hover:border-cyan-400/50 hover:text-cyan-200">
            <ChevronDown size={14} />
            Collapse
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_360px] gap-0">
        <div className="min-w-0 overflow-hidden p-4">
          <AnimatePresence mode="wait">
            {activeTab === 'charts' && (
              <motion.div key="charts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="h-full rounded-2xl border border-slate-800 bg-slate-900/45 p-4 shadow-lg shadow-black/10">
                <RealtimeChart sensors={chartSensors} series={series} realtimeValues={realtimeValues} playbackValues={playbackValues} mode={mode} />
              </motion.div>
            )}
            {activeTab === 'alerts' && (
              <motion.div key="alerts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="h-full overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/45 p-4 shadow-lg shadow-black/10">
                <AlertsPanel />
              </motion.div>
            )}
            {activeTab === 'logs' && (
              <motion.div key="logs" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="h-full overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/45 p-4 shadow-lg shadow-black/10">
                <Logs logs={logs} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="min-h-0 border-l border-slate-800 p-4">
          <PlaybackControls sensorIds={modelSensors.map((sensor) => sensor.id)} onPlaybackTick={onPlaybackTick} onPlaybackEnd={onPlaybackEnd} />
        </div>
      </div>
    </motion.section>
  );
}

function DockTabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition ${active ? 'bg-cyan-400/12 text-cyan-200 shadow-inner shadow-cyan-950/30' : 'text-slate-500 hover:bg-slate-900 hover:text-slate-200'}`}>
      {icon}
      {label}
    </button>
  );
}

function RealtimeChart({ sensors, series, realtimeValues, playbackValues, mode }: { sensors: Sensor[]; series: ChartPoint[]; realtimeValues: Map<string, { value: number }>; playbackValues: Map<string, number>; mode: 'LIVE' | 'PLAYBACK' }) {
  if (sensors.length === 0) {
    return <div className="flex h-full items-center justify-center text-xs text-slate-600">No sensors available for charting.</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-100">Telemetry Trends</p>
          <p className="text-xs text-slate-500">{mode === 'PLAYBACK' ? 'Playback-synced values' : 'Realtime updating sensor data'}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {sensors.map((sensor) => {
            const value = mode === 'PLAYBACK' ? playbackValues.get(sensor.id) : getSensorValue(sensor, realtimeValues);
            const color = getSensorGradientColor(value, sensor);
            return (
              <span key={sensor.id} className="rounded-full border border-slate-800 bg-slate-950/70 px-2 py-1 text-[10px] text-slate-400">
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }} />
                {sensor.name}: <span className="font-mono text-slate-200">{formatSensorValue(value, sensor.unit)}</span>
              </span>
            );
          })}
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 4, right: 10, left: -24, bottom: 0 }}>
            <defs>
              {sensors.map((sensor) => {
                const value = mode === 'PLAYBACK' ? playbackValues.get(sensor.id) : getSensorValue(sensor, realtimeValues);
                const color = getSensorGradientColor(value, sensor);
                return (
                  <linearGradient key={sensor.id} id={`dock-${sensor.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.32} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px', color: '#e2e8f0' }} />
            {sensors.map((sensor) => {
              const value = mode === 'PLAYBACK' ? playbackValues.get(sensor.id) : getSensorValue(sensor, realtimeValues);
              const color = getSensorGradientColor(value, sensor);
              return <Area key={sensor.id} type="monotone" dataKey={sensor.id} name={sensor.name} stroke={color} strokeWidth={2} fill={`url(#dock-${sensor.id})`} isAnimationActive animationDuration={250} />;
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Logs({ logs }: { logs: Array<{ id: string; sensorName: string; value: number; unit?: string; timestamp: string; mode: string }> }) {
  if (logs.length === 0) {
    return <div className="flex h-full items-center justify-center text-xs text-slate-600">No realtime events received yet.</div>;
  }

  return (
    <div className="space-y-2">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-100">Realtime Event Log</p>
        <span className="text-[10px] uppercase tracking-wider text-slate-600">Latest {logs.length}</span>
      </div>
      {logs.map((log) => (
        <div key={log.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs">
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-200">{log.sensorName}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-600">{log.mode}</p>
          </div>
          <span className="font-mono text-cyan-100">{formatSensorValue(log.value, log.unit)}</span>
          <span className="text-[10px] text-slate-600">{new Date(log.timestamp).toLocaleTimeString()}</span>
        </div>
      ))}
    </div>
  );
}
