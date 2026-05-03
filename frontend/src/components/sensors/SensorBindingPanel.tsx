import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useViewerStore } from '@/store/viewerStore';
import { useSensorStore } from '@/store/sensorStore';
import { Link2, Unlink, Plus, GripVertical } from 'lucide-react';
import { sensorsApi } from '@/services/api';
import { toast } from '@/components/ui/Toast';
import { DraggableSensorChip } from '@/components/3d/SensorDragOverlay';

export function SensorBindingPanel() {
  const selectedMeshName = useViewerStore((s) => s.selectedMeshName);
  const selectedModelPartId = useViewerStore((s) => s.selectedModelPartId);
  const clearSelection = useViewerStore((s) => s.clearSelection);
  const { sensors, fetchSensors, realtimeValues } = useSensorStore();

  const [sensorName, setSensorName] = useState('');
  const [sensorType, setSensorType] = useState('temperature');
  const [sensorUnit, setSensorUnit] = useState('°C');
  const [bindSensorId, setBindSensorId] = useState('');

  if (!selectedMeshName) return null;

  // Find sensors bound to this model part or mesh name
  const boundSensors = sensors.filter(
    (s) =>
      (selectedModelPartId && s.modelPartId === selectedModelPartId) ||
      (s.modelPart?.name === selectedMeshName),
  );

  // Unbound sensors available for binding
  const unboundSensors = sensors.filter((s) => !s.modelPartId);

  const handleCreateAndBind = async () => {
    if (!sensorName.trim()) return;
    try {
      const { data } = await sensorsApi.create({
        name: sensorName,
        type: sensorType,
        unit: sensorUnit,
      });
      // If we have a model part ID, bind immediately
      if (selectedModelPartId) {
        await sensorsApi.bind(data.id, selectedModelPartId);
        toast.success(`Sensor "${sensorName}" created and bound`);
      } else {
        toast.success(`Sensor "${sensorName}" created`);
      }
      await fetchSensors();
      setSensorName('');
    } catch (err) {
      toast.error('Failed to create sensor');
    }
  };

  const handleBindExisting = async () => {
    if (!bindSensorId || !selectedModelPartId) return;
    try {
      await sensorsApi.bind(bindSensorId, selectedModelPartId);
      toast.success('Sensor bound to part');
      await fetchSensors();
      setBindSensorId('');
    } catch (err) {
      toast.error('Failed to bind sensor');
    }
  };

  const handleUnbind = async (sensorId: string) => {
    try {
      await sensorsApi.unbind(sensorId);
      toast.success('Sensor unbound');
      await fetchSensors();
    } catch {
      toast.error('Failed to unbind sensor');
    }
  };

  return (
    <Card className="w-80">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          Part: <span className="text-primary">{selectedMeshName}</span>
        </CardTitle>
        <button
          onClick={clearSelection}
          className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
        >
          ✕
        </button>
      </CardHeader>
      <CardContent className="space-y-3">
        {selectedModelPartId && (
          <p className="text-[10px] font-mono text-muted-foreground truncate">
            ID: {selectedModelPartId}
          </p>
        )}

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
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-primary">
                      {val ? val.value.toFixed(1) : '--'} {s.unit}
                    </span>
                    <button
                      onClick={() => handleUnbind(s.id)}
                      className="text-muted-foreground hover:text-danger cursor-pointer"
                      title="Unbind"
                    >
                      <Unlink size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bind existing sensor */}
        {selectedModelPartId && unboundSensors.length > 0 && (
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-xs font-medium text-muted-foreground">Bind Existing Sensor</p>
            <div className="flex gap-2">
              <select
                className="h-8 flex-1 rounded-lg border border-border bg-secondary px-2 text-xs text-foreground"
                value={bindSensorId}
                onChange={(e) => setBindSensorId(e.target.value)}
              >
                <option value="">Select sensor...</option>
                {unboundSensors.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
                ))}
              </select>
              <Button size="sm" variant="outline" onClick={handleBindExisting} disabled={!bindSensorId}>
                <Link2 size={14} />
              </Button>
            </div>
          </div>
        )}

        {/* Drag to bind (unbound sensors) */}
        {unboundSensors.length > 0 && (
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <GripVertical size={12} /> Drag to 3D Model
            </p>
            <div className="flex flex-wrap gap-1.5">
              {unboundSensors.map((s) => (
                <DraggableSensorChip
                  key={s.id}
                  sensorId={s.id}
                  sensorName={`${s.name} (${s.type})`}
                />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Drag a chip onto a mesh in the 3D viewer to bind it
            </p>
          </div>
        )}

        {/* Attach new sensor */}
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-xs font-medium text-muted-foreground">Create & Bind New Sensor</p>
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
            <Plus size={14} /> {selectedModelPartId ? 'Create & Bind' : 'Create Sensor'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
