/* eslint-disable */
import { useMemo } from 'react';
import { useSensorStore } from '@/store/sensorStore';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Radio, AlertTriangle, Activity } from 'lucide-react';

export function KPIView() {
  const sensors = useSensorStore(s => s.sensors);
  const realtimeValues = useSensorStore(s => s.realtimeValues);

  // Generate some mock history data based on current values to show a nice chart
  const chartData = useMemo(() => {
    const data = [];
     
    const now = Date.now();
    for (let i = 20; i >= 0; i--) {
      const time = new Date(now - i * 1000).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' });
      const point: Record<string, string | number> = { time };
      sensors.slice(0, 3).forEach((sensor, index) => {
        // Just mock some variation around the current value
        const currentVal = realtimeValues.get(sensor.id)?.value ?? 50;
         
        const noise = (Math.random() - 0.5) * 10;
        point[`sensor${index}`] = Math.max(0, Math.min(100, currentVal + noise));
      });
      data.push(point);
    }
    return data;
  }, [sensors, realtimeValues]);

  // High-level stats
  const totalSensors = sensors.length;
  const criticalSensors = Array.from(realtimeValues.values()).filter(v => v.value > 80).length;
  // We'll consider any sensor that recently updated as an "active stream"
   
  const activeStreams = Array.from(realtimeValues.values()).filter(v => (Date.now() - new Date(v.timestamp).getTime()) < 5000).length;

  const colors = ['#3b82f6', '#10b981', '#f59e0b']; // Blue, Green, Yellow

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard 
          icon={<Radio size={16} className="text-blue-400" />}
          label="Total Sensors"
          value={totalSensors}
        />
        <StatCard 
          icon={<Activity size={16} className="text-green-400" />}
          label="Active Streams"
          value={activeStreams}
        />
        <StatCard 
          icon={<AlertTriangle size={16} className="text-red-400" />}
          label="Critical Alerts"
          value={criticalSensors}
          className="col-span-2 border-red-900/30 bg-red-900/10"
          valueClassName={criticalSensors > 0 ? "text-red-400" : "text-blue-100"}
        />
      </div>

      {/* Chart */}
      <div className="bg-[#0B1220]/60 border border-blue-900/30 rounded-lg p-3">
        <h3 className="text-xs font-semibold text-blue-200 uppercase tracking-wider mb-4">System Performance</h3>
        
        {sensors.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-xs text-blue-300/50">
            No sensor data available for charting
          </div>
        ) : (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  {sensors.slice(0, 3).map((sensor, index) => (
                    <linearGradient key={sensor.id} id={`color${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors[index]} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={colors[index]} stopOpacity={0}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a8a" opacity={0.2} vertical={false} />
                <XAxis 
                  dataKey="time" 
                  stroke="#60a5fa" 
                  fontSize={10} 
                  tickMargin={8}
                  opacity={0.5}
                />
                <YAxis 
                  stroke="#60a5fa" 
                  fontSize={10} 
                  opacity={0.5}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#050B18', borderColor: '#1e3a8a', fontSize: '12px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                {sensors.slice(0, 3).map((sensor, index) => (
                  <Area 
                    key={sensor.id}
                    type="monotone" 
                    dataKey={`sensor${index}`} 
                    name={sensor.name}
                    stroke={colors[index]} 
                    fillOpacity={1} 
                    fill={`url(#color${index})`} 
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, className = '', valueClassName = 'text-blue-100' }: { icon: React.ReactNode, label: string, value: number | string, className?: string, valueClassName?: string }) {
  return (
    <div className={`bg-[#0B1220]/60 border border-blue-900/30 rounded-lg p-3 flex flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-2 text-xs text-blue-300">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`text-2xl font-mono ${valueClassName}`}>
        {value}
      </div>
    </div>
  );
}
