import { useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useSensorStore } from '@/store/sensorStore';
import { Activity, Wifi, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SensorsPage() {
  const { sensors, fetchSensors, realtimeValues, initWebSocket } = useSensorStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSensors();
    initWebSocket();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sensors</h1>
        <p className="text-sm text-muted-foreground">All sensors across your digital twins</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sensors.map((sensor) => {
          const val = realtimeValues.get(sensor.id);
          const isStreaming = sensor.streamActive;
          const isManual = sensor.mode === 'MANUAL';

          return (
            <Card
              key={sensor.id}
              className="cursor-pointer transition-colors hover:border-primary/50"
              onClick={() => navigate('/sensor-testing')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${isStreaming ? 'bg-success/10 text-success' : 'bg-secondary text-muted-foreground'}`}>
                    {isStreaming ? <Wifi size={16} /> : <WifiOff size={16} />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{sensor.name}</p>
                    <p className="text-xs text-muted-foreground">{sensor.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-mono font-bold text-foreground">
                    {val ? val.value.toFixed(1) : sensor.manualValue?.toFixed(1) ?? '--'}
                  </p>
                  <p className="text-xs text-muted-foreground">{sensor.unit}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Badge variant={isManual ? 'warning' : 'success'}>
                  {sensor.mode}
                </Badge>
                {isStreaming && (
                  <Badge variant="default">{sensor.streamPattern}</Badge>
                )}
              </div>
            </Card>
          );
        })}
        {sensors.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-3">No sensors found</p>
        )}
      </div>
    </div>
  );
}
