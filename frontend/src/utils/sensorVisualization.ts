import type { Sensor } from '@/types';

export type SensorStatus = 'offline' | 'normal' | 'warning' | 'critical';

export function getSensorValue(sensor: Sensor, realtimeValues: Map<string, { value: number }>, overrideValues?: Map<string, number> | null) {
  if (overrideValues?.has(sensor.id)) return overrideValues.get(sensor.id);
  return realtimeValues.get(sensor.id)?.value ?? sensor.manualValue;
}

export function normalizeSensorValue(value: number | undefined, sensor?: Sensor) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  const min = typeof sensor?.alertMinThreshold === 'number' ? sensor.alertMinThreshold : 0;
  const max = typeof sensor?.alertMaxThreshold === 'number' && sensor.alertMaxThreshold > min ? sensor.alertMaxThreshold : 100;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

export function getSensorStatus(value: number | undefined, sensor?: Sensor): SensorStatus {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'offline';
  const normalized = normalizeSensorValue(value, sensor);
  if (normalized >= 0.8) return 'critical';
  if (normalized >= 0.6) return 'warning';
  return 'normal';
}

function toHexChannel(value: number) {
  return Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, '0');
}

function interpolateColor(start: [number, number, number], end: [number, number, number], amount: number) {
  const clamped = Math.max(0, Math.min(1, amount));
  const r = start[0] + (end[0] - start[0]) * clamped;
  const g = start[1] + (end[1] - start[1]) * clamped;
  const b = start[2] + (end[2] - start[2]) * clamped;
  return `#${toHexChannel(r)}${toHexChannel(g)}${toHexChannel(b)}`;
}

export function getSensorGradientColor(value: number | undefined, sensor?: Sensor) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '#475569';
  const normalized = normalizeSensorValue(value, sensor);
  if (normalized <= 0.5) return interpolateColor([34, 197, 94], [234, 179, 8], normalized / 0.5);
  return interpolateColor([234, 179, 8], [239, 68, 68], (normalized - 0.5) / 0.5);
}

export function getSensorEmissiveIntensity(value: number | undefined, sensor?: Sensor) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return 0.08 + normalizeSensorValue(value, sensor) * 0.42;
}

export function formatSensorValue(value: number | undefined, unit?: string) {
  if (typeof value !== 'number' || Number.isNaN(value)) return `--${unit ? ` ${unit}` : ''}`;
  return `${value.toFixed(1)}${unit ? ` ${unit}` : ''}`;
}

export function getSensorStatusClasses(status: SensorStatus) {
  const classes: Record<SensorStatus, string> = {
    offline: 'bg-slate-500 text-slate-400 border-slate-600/60',
    normal: 'bg-emerald-500 text-emerald-400 border-emerald-500/60',
    warning: 'bg-amber-400 text-amber-300 border-amber-400/60',
    critical: 'bg-red-500 text-red-400 border-red-500/60',
  };
  return classes[status];
}
