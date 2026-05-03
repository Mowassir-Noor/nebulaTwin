import { useState, useCallback, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { analyticsApi } from '@/services/api';
import type { TimeSeriesPoint } from '@/types';

interface PlaybackControlsProps {
  sensorIds: string[];
  onPlaybackTick: (values: Map<string, number>, timestamp: string) => void;
  onPlaybackEnd: () => void;
}

export function PlaybackControls({ sensorIds, onPlaybackTick, onPlaybackEnd }: PlaybackControlsProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() - 1);
    return d.toISOString().slice(0, 16);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 16));
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [totalFrames, setTotalFrames] = useState(0);

  const dataRef = useRef<Map<string, TimeSeriesPoint[]>>(new Map());
  const frameRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const fromDate = new Date(from).toISOString();
    const toDate = new Date(to).toISOString();

    const dataMap = new Map<string, TimeSeriesPoint[]>();
    let maxLength = 0;

    await Promise.all(
      sensorIds.map(async (id) => {
        try {
          const res = await analyticsApi.history(id, fromDate, toDate, 1000);
          const points = res.data || [];
          dataMap.set(id, points);
          maxLength = Math.max(maxLength, points.length);
        } catch {
          dataMap.set(id, []);
        }
      }),
    );

    dataRef.current = dataMap;
    setTotalFrames(maxLength);
    frameRef.current = 0;
    setProgress(0);
    setLoading(false);
    return maxLength > 0;
  }, [sensorIds, from, to]);

  const tick = useCallback(() => {
    const frame = frameRef.current;
    const values = new Map<string, number>();
    let timestamp = '';

    for (const [sensorId, points] of dataRef.current) {
      const idx = Math.min(frame, points.length - 1);
      if (points[idx]) {
        values.set(sensorId, points[idx].value);
        if (!timestamp) timestamp = points[idx].time;
      }
    }

    onPlaybackTick(values, timestamp);
    setProgress(totalFrames > 0 ? (frame / totalFrames) * 100 : 0);

    frameRef.current++;
    if (frameRef.current >= totalFrames) {
      setIsPlaying(false);
      onPlaybackEnd();
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [totalFrames, onPlaybackTick, onPlaybackEnd]);

  const play = useCallback(async () => {
    if (dataRef.current.size === 0) {
      const hasData = await loadData();
      if (!hasData) return;
    }
    setIsPlaying(true);
    timerRef.current = setInterval(tick, 100 / speed);
  }, [loadData, tick, speed]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const reset = useCallback(() => {
    pause();
    frameRef.current = 0;
    setProgress(0);
  }, [pause]);

  const skipForward = useCallback(() => {
    frameRef.current = Math.min(frameRef.current + 10, totalFrames - 1);
    tick();
  }, [totalFrames, tick]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col gap-3 p-3 bg-card border border-border rounded-lg">
      <div className="flex items-center gap-2">
        <Clock size={16} className="text-muted-foreground" />
        <span className="text-sm font-medium">Sensor Playback</span>
      </div>

      <div className="flex gap-2">
        <Input
          type="datetime-local"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="text-xs"
        />
        <Input
          type="datetime-local"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="text-xs"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={reset} disabled={loading}>
          <SkipBack size={14} />
        </Button>
        {isPlaying ? (
          <Button size="sm" onClick={pause}>
            <Pause size={14} />
          </Button>
        ) : (
          <Button size="sm" onClick={play} disabled={loading || sensorIds.length === 0}>
            <Play size={14} />
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={skipForward} disabled={!isPlaying}>
          <SkipForward size={14} />
        </Button>

        <select
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="text-xs bg-background border border-border rounded px-2 py-1"
        >
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={2}>2x</option>
          <option value={5}>5x</option>
        </select>

        <span className="text-xs text-muted-foreground ml-auto">
          {loading ? 'Loading...' : `${frameRef.current}/${totalFrames}`}
        </span>
      </div>

      <div className="w-full bg-secondary rounded-full h-1.5">
        <div
          className="bg-primary h-1.5 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export default PlaybackControls;
