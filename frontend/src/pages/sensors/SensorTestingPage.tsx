import { useEffect, useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useSensorStore } from '@/store/sensorStore';
import { useTwinStore } from '@/store/twinStore';
import type { Sensor, StreamPattern } from '@/types';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Activity, Play, Square, RotateCcw,
  ChevronRight, ChevronDown, Cpu,
} from 'lucide-react';

export default function SensorTestingPage() {
  const {
    sensors, selectedSensor, fetchSensors, selectSensor,
    overrideSensor, clearOverride, startStream, stopStream,
    realtimeValues, initWebSocket,
  } = useSensorStore();
  const { twins, fetchTwins } = useTwinStore();

  useEffect(() => {
    fetchSensors();
    fetchTwins();
    initWebSocket();
  }, []);

  return (
    <div className="flex h-[calc(100vh-3rem)] gap-4">
      {/* Left panel — Sensor hierarchy */}
      <div className="w-72 shrink-0 overflow-auto rounded-xl border border-border bg-card p-3">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Sensors</h2>
        <SensorTree
          sensors={sensors}
          selectedId={selectedSensor?.id}
          onSelect={selectSensor}
          realtimeValues={realtimeValues}
        />
      </div>

      {/* Right panel — Control interface */}
      <div className="flex-1 overflow-auto">
        {selectedSensor ? (
          <SensorControlPanel sensor={selectedSensor} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Select a sensor from the left panel
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sensor Tree ─────────────────────────────────────────

function SensorTree({
  sensors,
  selectedId,
  onSelect,
  realtimeValues,
}: {
  sensors: Sensor[];
  selectedId?: string;
  onSelect: (s: Sensor) => void;
  realtimeValues: Map<string, { value: number }>;
}) {
  // Group sensors by type
  const grouped = useMemo(() => {
    const map = new Map<string, Sensor[]>();
    sensors.forEach((s) => {
      const key = s.type || 'other';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return map;
  }, [sensors]);

  const [expanded, setExpanded] = useState<Set<string>>(new Set(Array.from(grouped.keys())));

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-1">
      {Array.from(grouped.entries()).map(([type, items]) => (
        <div key={type}>
          <button
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary cursor-pointer"
            onClick={() => toggle(type)}
          >
            {expanded.has(type) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <Cpu size={12} />
            {type.toUpperCase()} ({items.length})
          </button>
          {expanded.has(type) &&
            items.map((s) => {
              const val = realtimeValues.get(s.id);
              return (
                <button
                  key={s.id}
                  className={`flex w-full items-center justify-between rounded-lg px-4 py-1.5 text-xs transition-colors cursor-pointer ${
                    selectedId === s.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-secondary'
                  }`}
                  onClick={() => onSelect(s)}
                >
                  <span>{s.name}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {val ? val.value.toFixed(1) : '--'} {s.unit}
                  </span>
                </button>
              );
            })}
        </div>
      ))}
    </div>
  );
}

// ─── Sensor Control Panel ────────────────────────────────

function SensorControlPanel({ sensor }: { sensor: Sensor }) {
  const {
    overrideSensor, clearOverride, startStream, stopStream,
    realtimeValues, fetchSensors,
  } = useSensorStore();

  const [manualValue, setManualValue] = useState(sensor.manualValue ?? 50);
  const [sliderValue, setSliderValue] = useState(sensor.manualValue ?? 50);
  const [streamPattern, setStreamPattern] = useState<StreamPattern>('SINE');
  const [streamInterval, setStreamInterval] = useState(1000);
  const [streamMin, setStreamMin] = useState(20);
  const [streamMax, setStreamMax] = useState(80);
  const [isApplying, setIsApplying] = useState(false);

  // Chart data from realtime
  const [chartHistory, setChartHistory] = useState<{ time: string; value: number }[]>([]);
  const realtime = realtimeValues.get(sensor.id);

  useEffect(() => {
    if (realtime) {
      setChartHistory((prev) => {
        const next = [...prev, { time: new Date().toLocaleTimeString(), value: realtime.value }];
        return next.slice(-50);
      });
    }
  }, [realtime]);

  // Reset chart on sensor change
  useEffect(() => {
    setChartHistory([]);
    setManualValue(sensor.manualValue ?? 50);
    setSliderValue(sensor.manualValue ?? 50);
  }, [sensor.id]);

  const handleApplyManual = async () => {
    setIsApplying(true);
    try {
      await overrideSensor(sensor.id, manualValue);
    } finally {
      setIsApplying(false);
    }
  };

  const handleSliderApply = async () => {
    setIsApplying(true);
    try {
      await overrideSensor(sensor.id, sliderValue);
    } finally {
      setIsApplying(false);
    }
  };

  const handleClearOverride = async () => {
    await clearOverride(sensor.id);
  };

  const handleStartStream = async () => {
    await startStream(sensor.id, {
      pattern: streamPattern,
      interval_ms: streamInterval,
      min: streamMin,
      max: streamMax,
    });
  };

  const handleStopStream = async () => {
    await stopStream(sensor.id);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">{sensor.name}</h2>
          <div className="mt-1 flex gap-2">
            <Badge variant={sensor.mode === 'MANUAL' ? 'warning' : 'success'}>{sensor.mode}</Badge>
            <Badge variant="secondary">{sensor.type}</Badge>
            {sensor.streamActive && <Badge variant="default">Streaming: {sensor.streamPattern}</Badge>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-mono font-bold text-foreground">
            {realtime ? realtime.value.toFixed(2) : sensor.manualValue?.toFixed(2) ?? '--'}
          </p>
          <p className="text-sm text-muted-foreground">{sensor.unit}</p>
        </div>
      </div>

      {/* Real-time chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity size={14} /> Live Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#888898' }} />
              <YAxis tick={{ fontSize: 10, fill: '#888898' }} />
              <Tooltip
                contentStyle={{
                  background: '#12121a',
                  border: '1px solid #2a2a3a',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Manual override */}
        <Card>
          <CardHeader>
            <CardTitle>Manual Override</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Numeric input */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Numeric Value</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={manualValue}
                  onChange={(e) => setManualValue(Number(e.target.value))}
                  step={0.1}
                />
                <Button size="sm" onClick={handleApplyManual} disabled={isApplying}>
                  Apply
                </Button>
              </div>
            </div>

            {/* Slider */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Slider: {sliderValue.toFixed(1)}
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={0.1}
                value={sliderValue}
                onChange={(e) => setSliderValue(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <Button size="sm" variant="secondary" onClick={handleSliderApply}>
                Apply Slider Value
              </Button>
            </div>

            {/* Clear override */}
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={handleClearOverride}
            >
              <RotateCcw size={14} /> Reset to Real Mode
            </Button>
          </CardContent>
        </Card>

        {/* Stream control */}
        <Card>
          <CardHeader>
            <CardTitle>Stream Simulation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Pattern */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Pattern</label>
              <select
                className="h-9 w-full rounded-lg border border-border bg-secondary px-3 text-sm text-foreground"
                value={streamPattern}
                onChange={(e) => setStreamPattern(e.target.value as StreamPattern)}
              >
                <option value="CONSTANT">Constant</option>
                <option value="LINEAR_INCREASE">Linear Increase</option>
                <option value="LINEAR_DECREASE">Linear Decrease</option>
                <option value="SINE">Sine Wave</option>
                <option value="RANDOM">Random</option>
              </select>
            </div>

            {/* Interval */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Interval (ms)</label>
              <Input
                type="number"
                value={streamInterval}
                onChange={(e) => setStreamInterval(Number(e.target.value))}
                min={100}
                step={100}
              />
            </div>

            {/* Min / Max */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Min</label>
                <Input
                  type="number"
                  value={streamMin}
                  onChange={(e) => setStreamMin(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Max</label>
                <Input
                  type="number"
                  value={streamMax}
                  onChange={(e) => setStreamMax(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={handleStartStream}
                disabled={sensor.streamActive ?? false}
              >
                <Play size={14} /> Start Stream
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                onClick={handleStopStream}
                disabled={!sensor.streamActive}
              >
                <Square size={14} /> Stop
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
