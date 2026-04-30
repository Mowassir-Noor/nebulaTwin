import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useViewerStore } from '@/store/viewerStore';
import { useSensorStore } from '@/store/sensorStore';
import { Link2, Unlink, Plus } from 'lucide-react';
import { sensorsApi } from '@/services/api';

export function SensorBindingPanel() {
  const selectedMeshName = useViewerStore((s) => s.selectedMeshName);
  const clearSelection = useViewerStore((s) => s.clearSelection);
  const { sensors, fetchSensors, realtimeValues } = useSensorStore();

  const [sensorName, setSensorName] = useState('');
  const [sensorType, setSensorType] = useState('temperature');
  const [sensorUnit, setSensorUnit] = useState('°C');

  if (!selectedMeshName) return null;

  // Find sensors bound to this mesh
  const boundSensors = sensors.filter((s) => s.modelPart?.meshName === selectedMeshName);

  const handleCreateAndBind = async () => {
    if (!sensorName.trim()) return;
    try {
      const { data } = await sensorsApi.create({
        name: sensorName,
        type: sensorType,
        unit: sensorUnit,
      });
      // For MVP, just refresh
      await fetchSensors();
      setSensorName('');
    } catch (err) {
      console.error('Failed to create sensor:', err);
    }
  };

  return (
    <Card className="w-80">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          Mesh: <span className="text-primary">{selectedMeshName}</span>
        </CardTitle>
        <button
          onClick={clearSelection}
          className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
        >
          ✕
        </button>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Bound sensors */}
        {boundSensors.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Bound Sensors</p>
            {boundSensors.map((s) => {
              const val = realtimeValues.get(s.id);
              return (
                <div key={s.id} className="flex items-center justify-between rounded-lg bg-secondary p-2">
                  <div>
                    <span className="text-xs text-foreground">{s.name}</span>
                    <Badge variant="secondary" className="ml-2">{s.type}</Badge>
                  </div>
                  <span className="text-xs font-mono text-primary">
                    {val ? val.value.toFixed(1) : '--'} {s.unit}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Attach new sensor */}
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-xs font-medium text-muted-foreground">Attach New Sensor</p>
          <Input
            placeholder="Sensor name"
            value={sensorName}
            onChange={(e) => setSensorName(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              className="h-9 rounded-lg border border-border bg-secondary px-2 text-xs text-foreground"
              value={sensorType}
              onChange={(e) => setSensorType(e.target.value)}
            >
              <option value="temperature">Temperature</option>
              <option value="vibration">Vibration</option>
              <option value="pressure">Pressure</option>
              <option value="rpm">RPM</option>
              <option value="humidity">Humidity</option>
              <option value="power">Power</option>
            </select>
            <Input
              placeholder="Unit"
              value={sensorUnit}
              onChange={(e) => setSensorUnit(e.target.value)}
            />
          </div>
          <Button size="sm" className="w-full" onClick={handleCreateAndBind}>
            <Plus size={14} /> Attach Sensor
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
