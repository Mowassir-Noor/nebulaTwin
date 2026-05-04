import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useSensorStore } from '@/store/sensorStore';
import { useTwinStore } from '@/store/twinStore';
import { modelsApi, analyticsApi } from '@/services/api';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import { Activity, Box, Cpu, AlertTriangle, FileBox } from 'lucide-react';

export default function DashboardPage() {
  const { sensors, fetchSensors, realtimeValues, initWebSocket } = useSensorStore();
  const { twins, fetchTwins } = useTwinStore();
  const [modelCount, setModelCount] = useState(0);

  useEffect(() => {
    fetchSensors();
    fetchTwins();
    initWebSocket();
    modelsApi.list().then(({ data }) => setModelCount(data.length)).catch(() => {});
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

  // Pick the first active (streaming or manual) sensor for the chart, fallback to first sensor
  const chartSensorId = useMemo(
    () => activeSensors[0]?.id ?? sensors[0]?.id ?? null,
    [activeSensors, sensors],
  );

  const now = useMemo(() => new Date(), []);
  const from = useMemo(() => {
    const d = new Date(now);
    d.setHours(d.getHours() - 1);
    return d.toISOString();
  }, [now]);

  const { data: historyData, isLoading: chartLoading } = useQuery({
    queryKey: ['analytics', 'history', chartSensorId],
    queryFn: () =>
      analyticsApi
        .history(chartSensorId!, from, now.toISOString(), 60)
        .then((r) => r.data),
    enabled: !!chartSensorId,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const chartData = useMemo(() => {
    if (!historyData || historyData.length === 0) return [];
    return historyData.map((p) => ({
      time: new Date(p.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      value: p.value,
    }));
  }, [historyData]);

  const chartSensorName = useMemo(
    () => sensors.find((s) => s.id === chartSensorId)?.name ?? 'Sensor Activity',
    [sensors, chartSensorId],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Real-time overview of your digital twins</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
          icon={<FileBox size={20} />}
          label="3D Models"
          value={modelCount}
          color="text-info"
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
            <CardTitle>{chartSensorName}</CardTitle>
          </CardHeader>
          <CardContent>
            {chartLoading ? (
              <div className="flex h-[280px] items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex h-[280px] flex-col items-center justify-center gap-2 text-center">
                <Activity size={32} className="text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">No sensor history yet</p>
                <p className="text-[10px] text-muted-foreground/60">Start a sensor stream to see live data</p>
              </div>
            ) : (
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
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
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
