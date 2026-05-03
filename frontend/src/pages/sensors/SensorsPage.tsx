import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useSensorStore } from '@/store/sensorStore';
import { sensorsApi } from '@/services/api';
import { toast } from '@/components/ui/Toast';
import { Activity, Wifi, WifiOff, Pencil, Trash2, X, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '@/utils/rbac';
import type { Sensor } from '@/types';

export default function SensorsPage() {
  const { sensors, fetchSensors, realtimeValues, initWebSocket } = useSensorStore();
  const navigate = useNavigate();
  const [editingSensor, setEditingSensor] = useState<Sensor | null>(null);
  const [deletingSensor, setDeletingSensor] = useState<Sensor | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const { canEdit, canDelete } = useRole();

  useEffect(() => {
    fetchSensors();
    initWebSocket();
  }, []);

  const handleDelete = async () => {
    if (!deletingSensor) return;
    try {
      await sensorsApi.delete(deletingSensor.id);
      toast.success('Sensor deleted');
      setDeletingSensor(null);
      fetchSensors();
    } catch {
      toast.error('Failed to delete sensor');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sensors</h1>
          <p className="text-sm text-muted-foreground">All sensors across your digital twins</p>
        </div>
        {canEdit && (
          <Button onClick={() => setShowCreate(!showCreate)}>
            <Plus size={16} /> New Sensor
          </Button>
        )}
      </div>

      {showCreate && (
        <CreateSensorPanel
          onCreated={() => { setShowCreate(false); fetchSensors(); }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sensors.map((sensor) => {
          const val = realtimeValues.get(sensor.id);
          const isStreaming = sensor.streamActive;
          const isManual = sensor.mode === 'MANUAL';

          return (
            <Card key={sensor.id} className="group transition-colors hover:border-primary/50">
              <div className="flex items-center justify-between">
                <div
                  className="flex flex-1 items-center gap-3 cursor-pointer"
                  onClick={() => navigate('/sensor-testing')}
                >
                  <div className={`rounded-lg p-2 ${isStreaming ? 'bg-success/10 text-success' : 'bg-secondary text-muted-foreground'}`}>
                    {isStreaming ? <Wifi size={16} /> : <WifiOff size={16} />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{sensor.name}</p>
                    <p className="text-xs text-muted-foreground">{sensor.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-lg font-mono font-bold text-foreground">
                      {val ? val.value.toFixed(1) : sensor.manualValue?.toFixed(1) ?? '--'}
                    </p>
                    <p className="text-xs text-muted-foreground">{sensor.unit}</p>
                  </div>
                  {canEdit && (
                    <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); setEditingSensor(sensor); }}
                      >
                        <Pencil size={12} />
                      </button>
                      {canDelete && (
                        <button
                          className="rounded p-1 text-muted-foreground hover:bg-danger/10 hover:text-danger cursor-pointer"
                          onClick={(e) => { e.stopPropagation(); setDeletingSensor(sensor); }}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Badge variant={isManual ? 'warning' : 'success'}>
                  {sensor.mode}
                </Badge>
                {isStreaming && (
                  <Badge variant="default">{sensor.streamPattern}</Badge>
                )}
                {sensor.modelPartId && (
                  <Badge variant="secondary">Bound</Badge>
                )}
              </div>
            </Card>
          );
        })}
        {sensors.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-3">No sensors found</p>
        )}
      </div>

      {editingSensor && (
        <EditSensorModal
          sensor={editingSensor}
          onClose={() => setEditingSensor(null)}
          onSave={fetchSensors}
        />
      )}

      {deletingSensor && (
        <ConfirmDialog
          title="Delete Sensor"
          message={`Delete "${deletingSensor.name}"? All associated time-series data and alerts will be removed.`}
          onConfirm={handleDelete}
          onCancel={() => setDeletingSensor(null)}
        />
      )}
    </div>
  );
}

function CreateSensorPanel({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState('temperature');
  const [unit, setUnit] = useState('°C');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await sensorsApi.create({ name, type, unit });
      toast.success('Sensor created');
      onCreated();
    } catch {
      toast.error('Failed to create sensor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>New Sensor</CardTitle>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground cursor-pointer"><X size={16} /></button>
      </CardHeader>
      <CardContent className="flex items-end gap-3">
        <div className="flex-1 space-y-1">
          <label className="text-xs text-muted-foreground">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Motor Temperature" />
        </div>
        <div className="w-36 space-y-1">
          <label className="text-xs text-muted-foreground">Type</label>
          <select
            className="flex h-9 w-full rounded-lg border border-border bg-secondary px-3 text-sm text-foreground"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="temperature">Temperature</option>
            <option value="vibration">Vibration</option>
            <option value="pressure">Pressure</option>
            <option value="rpm">RPM</option>
            <option value="humidity">Humidity</option>
            <option value="power">Power</option>
          </select>
        </div>
        <div className="w-24 space-y-1">
          <label className="text-xs text-muted-foreground">Unit</label>
          <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="°C" />
        </div>
        <Button onClick={handleCreate} disabled={saving || !name.trim()}>
          {saving ? 'Creating...' : 'Create'}
        </Button>
      </CardContent>
    </Card>
  );
}

function EditSensorModal({
  sensor,
  onClose,
  onSave,
}: {
  sensor: Sensor;
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState(sensor.name);
  const [type, setType] = useState(sensor.type);
  const [unit, setUnit] = useState(sensor.unit);
  const [minThreshold, setMinThreshold] = useState(sensor.alertMinThreshold?.toString() || '');
  const [maxThreshold, setMaxThreshold] = useState(sensor.alertMaxThreshold?.toString() || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await sensorsApi.update(sensor.id, {
        name,
        type,
        unit,
        alertMinThreshold: minThreshold ? parseFloat(minThreshold) : null,
        alertMaxThreshold: maxThreshold ? parseFloat(maxThreshold) : null,
      });
      toast.success('Sensor updated');
      onSave();
      onClose();
    } catch {
      toast.error('Failed to update sensor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <Card className="w-96">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Edit Sensor</CardTitle>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer"><X size={18} /></button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Type</label>
              <Input value={type} onChange={(e) => setType(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Unit</label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Min Threshold</label>
              <Input
                type="number"
                value={minThreshold}
                onChange={(e) => setMinThreshold(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Max Threshold</label>
              <Input
                type="number"
                value={maxThreshold}
                onChange={(e) => setMaxThreshold(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" disabled={saving || !name.trim()} onClick={handleSave}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
