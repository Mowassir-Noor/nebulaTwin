/* eslint-disable */
import { useState, useEffect, useMemo } from 'react';
import { useSensorStore } from '@/store/sensorStore';
import { sensorsApi } from '@/services/api';
import { Play, Square, SlidersHorizontal, RefreshCcw } from 'lucide-react';
import type { Sensor } from '@/types';
import debounce from 'lodash/debounce';

export function SensorControlsPanel() {
  const sensors = useSensorStore(s => s.sensors);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-blue-200 uppercase tracking-wider mb-2">Sensor Controls</h3>
      {sensors.length === 0 ? (
        <p className="text-xs text-blue-300/50 italic">No sensors available.</p>
      ) : (
        sensors.map(sensor => <SensorControlCard key={sensor.id} sensor={sensor} />)
      )}
    </div>
  );
}

function SensorControlCard({ sensor }: { sensor: Sensor }) {
  const realtimeValues = useSensorStore(s => s.realtimeValues);
  const val = realtimeValues.get(sensor.id);
  const currentValue = val ? val.value : 0;
  
  const [sliderValue, setSliderValue] = useState<number>(currentValue);
  const [isOverriding, setIsOverriding] = useState(false);
  const [streamActive, setStreamActive] = useState(false);

  // Debounce the API call
   
  const debouncedOverride = useMemo(
    () => debounce(async (val: number) => {
      try {
        await sensorsApi.override(sensor.id, val);
      } catch (err) {
        console.error('Failed to override sensor', err);
      }
    }, 300),
    [sensor.id]
  );

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSliderValue(val);
    debouncedOverride(val);
  };

  const handleManual = async () => {
    setIsOverriding(true);
    await sensorsApi.override(sensor.id, sliderValue);
  };

  const handleClear = async () => {
    setIsOverriding(false);
    await sensorsApi.clearOverride(sensor.id);
  };

  const handleStream = async () => {
    setStreamActive(true);
    await sensorsApi.startStream(sensor.id, {
      pattern: 'SINE',
      interval_ms: 1000,
      min: 0,
      max: 100
    });
  };

  const handleStop = async () => {
    setStreamActive(false);
    setIsOverriding(false);
    await sensorsApi.stopStream(sensor.id);
  };

  const isCritical = currentValue > 80;
  const isWarning = currentValue > 60 && currentValue <= 80;
  const statusColor = isCritical ? 'text-red-500 bg-red-500/10 border-red-500/50' : 
                      isWarning ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/50' : 
                      'text-green-500 bg-green-500/10 border-green-500/50';

  const sliderAccent = isCritical ? 'accent-red-500' : isWarning ? 'accent-yellow-500' : 'accent-green-500';

  return (
    <div className="bg-[#0B1220]/60 border border-blue-900/30 rounded-lg p-3 space-y-3">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="text-sm font-medium text-blue-100">{sensor.name}</div>
          <div className="text-[10px] text-blue-300/50 font-mono">{sensor.id.substring(0, 8)}...</div>
        </div>
        <div className={`px-2 py-0.5 rounded text-[10px] border ${statusColor} uppercase font-bold tracking-wider`}>
          {isOverriding ? 'MANUAL' : streamActive ? 'STREAM' : 'IDLE'}
        </div>
      </div>

      {/* Value Display */}
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-mono text-white">{currentValue.toFixed(2)}</span>
        <span className="text-xs text-blue-300">{sensor.unit}</span>
      </div>

      {/* Slider */}
      <div className="pt-2">
        <div className="flex justify-between text-[10px] text-blue-300 mb-1">
          <span>0</span>
          <span>100</span>
        </div>
        <input 
          type="range" 
          min="0" max="100" step="0.1" 
          value={isOverriding ? sliderValue : currentValue} 
          onChange={handleSliderChange}
          onMouseDown={() => setIsOverriding(true)}
          className={`w-full h-1 bg-blue-900/50 rounded-lg appearance-none cursor-pointer ${sliderAccent}`} 
        />
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-2 pt-2">
        <button onClick={handleManual} className="flex items-center justify-center gap-1.5 py-1.5 bg-blue-900/20 hover:bg-blue-800/40 text-blue-300 text-xs rounded transition-colors border border-blue-800/30">
          <SlidersHorizontal size={12} />
          Override
        </button>
        <button onClick={handleClear} className="flex items-center justify-center gap-1.5 py-1.5 bg-blue-900/20 hover:bg-blue-800/40 text-blue-300 text-xs rounded transition-colors border border-blue-800/30">
          <RefreshCcw size={12} />
          Clear
        </button>
        <button onClick={handleStream} className="flex items-center justify-center gap-1.5 py-1.5 bg-green-900/20 hover:bg-green-800/40 text-green-400 text-xs rounded transition-colors border border-green-800/30">
          <Play size={12} />
          Stream
        </button>
        <button onClick={handleStop} className="flex items-center justify-center gap-1.5 py-1.5 bg-red-900/20 hover:bg-red-800/40 text-red-400 text-xs rounded transition-colors border border-red-800/30">
          <Square size={12} />
          Stop
        </button>
      </div>
    </div>
  );
}
