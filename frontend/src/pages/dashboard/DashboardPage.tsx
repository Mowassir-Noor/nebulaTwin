import { useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useSensorStore } from '@/store/sensorStore';
import { useTwinStore } from '@/store/twinStore';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import { Activity, Box, Cpu, AlertTriangle } from 'lucide-react';

export default function DashboardPage() {
  const { sensors, fetchSensors, realtimeValues, initWebSocket } = useSensorStore();
  const { twins, fetchTwins } = useTwinStore();

  useEffect(() => {
    fetchSensors();
    fetchTwins();
    initWebSocket();
  }, []);

  const activeSensors = sensors.filter((s) => s.mode === 'MANUAL' || s.streamActive);
  const alerts = useMemo(() => {
    const list: { sensorId: string; name: string; value: number; level: string }[] = [];
    realtimeValues.forEach((data, sensorId) => {
      const sensor = sensors.find((s) => s.id === sensorId);
      if (!sensor) return;
      if (data.value > 80) list.push({ sensorId, name: sensor.name, value: data.value, level: 'critical' });
      else if (data.value > 60) list.push({ sensorId, name: sensor.name, value: data.value, level: 'warning' });
    });
    return list;
  }, [realtimeValues, sensors]);

  // Generate demo chart data from realtime values
  const chartData = useMemo(() => {
    const points: { time: string; value: number }[] = [];
    const now = Date.now();
    for (let i = 29; i >= 0; i--) {
      points.push({
        time: new Date(now - i * 2000).toLocaleTimeString(),
        value: 40 + Math.random() * 30,
      });
    }
    return points;
  }, [realtimeValues]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Real-time overview of your digital twins</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          icon={<Box size={20} />}
          label="Digital Twins"
          value={twins.length}
          color="text-primary"
        />
        <KPICard
          icon={<Cpu size={20} />}
          label="Total Sensors"
          value={sensors.length}
          color="text-success"
        />
        <KPICard
          icon={<Activity size={20} />}
          label="Active Streams"
          value={activeSensors.length}
          color="text-warning"
        />
        <KPICard
          icon={<AlertTriangle size={20} />}
          label="Alerts"
          value={alerts.length}
          color="text-danger"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sensor Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#888898' }} />
                <YAxis tick={{ fontSize: 11, fill: '#888898' }} />
                <Tooltip
                  contentStyle={{
                    background: '#12121a',
                    border: '1px solid #2a2a3a',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#6366f1"
                  fill="url(#grad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.length === 0 ? (
              <p className="text-xs text-muted-foreground">No active alerts</p>
            ) : (
              alerts.map((a) => (
                <div
                  key={a.sensorId}
                  className="flex items-center justify-between rounded-lg bg-secondary p-2"
                >
                  <span className="text-xs text-foreground">{a.name}</span>
                  <Badge variant={a.level === 'critical' ? 'danger' : 'warning'}>
                    {a.value.toFixed(1)}
                  </Badge>
                </div>
              ))
            )}

            {/* Recent sensors */}
            <div className="mt-4 pt-3 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2">Live Sensors</p>
              {sensors.slice(0, 5).map((s) => {
                const val = realtimeValues.get(s.id);
                return (
                  <div key={s.id} className="flex items-center justify-between py-1">
                    <span className="text-xs text-foreground">{s.name}</span>
                    <span className="text-xs font-mono text-primary">
                      {val ? val.value.toFixed(1) : '--'} {s.unit}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPICard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Card className="flex items-center gap-4">
      <div className={`rounded-lg bg-secondary p-2.5 ${color}`}>{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </div>
    </Card>
  );
}
