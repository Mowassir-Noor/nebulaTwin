import { useDashboardStore } from './dashboardStore';
import { Sliders, BarChart2, AlertCircle, Activity, Settings2 } from 'lucide-react';
import { useSensorStore } from '@/store/sensorStore';

export function RightPanel() {
  const { activeTab, setActiveTab, selectedAsset } = useDashboardStore();

  return (
    <div className="flex flex-col h-full bg-secondary/20">
      {/* Tabs Header */}
      <div className="flex items-center border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur z-10">
        <TabButton 
          active={activeTab === 'controls'} 
          onClick={() => setActiveTab('controls')}
          icon={<Sliders size={14} />}
          label="Controls"
        />
        <TabButton 
          active={activeTab === 'kpis'} 
          onClick={() => setActiveTab('kpis')}
          icon={<BarChart2 size={14} />}
          label="KPIs"
        />
        <TabButton 
          active={activeTab === 'alerts'} 
          onClick={() => setActiveTab('alerts')}
          icon={<AlertCircle size={14} />}
          label="Alerts"
        />
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'controls' && <ControlsTab assetId={selectedAsset} />}
        {activeTab === 'kpis' && <KPIsTab assetId={selectedAsset} />}
        {activeTab === 'alerts' && <AlertsTab assetId={selectedAsset} />}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium transition-all relative ${
        active ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
      }`}
    >
      {icon}
      <span>{label}</span>
      {active && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary shadow-[0_-2px_8px_rgba(99,102,241,0.6)]" />
      )}
    </button>
  );
}

function ControlsTab({ assetId }: { assetId: string | null }) {
  if (!assetId) return <EmptyState message="Select an asset from the tree to view controls" />;
  
  return (
    <div className="space-y-4">
      <div className="p-3 bg-secondary/30 rounded-lg border border-border/50 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Power Status</span>
          <div className="w-10 h-5 bg-primary/20 rounded-full relative cursor-pointer border border-primary/50">
            <div className="absolute right-1 top-0.5 w-4 h-4 bg-primary rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
          </div>
        </div>
        <div className="h-px bg-border/50" />
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Calibration Mode</span>
          <button className="px-3 py-1 bg-secondary hover:bg-secondary/80 rounded text-xs font-medium transition-colors border border-border">
            Calibrate
          </button>
        </div>
      </div>
      
      <div className="p-3 bg-secondary/30 rounded-lg border border-border/50 space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <Settings2 size={14} />
          <span className="text-xs font-medium uppercase tracking-wider">Parameters</span>
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Sample Rate</span>
              <span className="font-mono text-primary">100ms</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden border border-border/50">
              <div className="w-2/3 h-full bg-primary/80" />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Threshold</span>
              <span className="font-mono text-warning">80.0</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden border border-border/50">
              <div className="w-4/5 h-full bg-warning/80" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPIsTab({ assetId }: { assetId: string | null }) {
  const { sensors, realtimeValues } = useSensorStore();
  
  if (!assetId) {
    // Show aggregate KPIs if no asset selected
    const totalActive = sensors.filter(s => realtimeValues.has(s.id)).length;
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-secondary/30 rounded-lg border border-border/50 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Active Streams</span>
            <span className="text-xl font-bold font-mono text-primary">{totalActive}</span>
          </div>
          <div className="p-3 bg-secondary/30 rounded-lg border border-border/50 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Total Sensors</span>
            <span className="text-xl font-bold font-mono">{sensors.length}</span>
          </div>
          <div className="col-span-2 p-3 bg-secondary/30 rounded-lg border border-border/50 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">System Health</span>
            <div className="flex items-end gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-success">99.8%</span>
              <Activity size={16} className="text-success mb-1" />
            </div>
            <div className="w-full h-1 bg-secondary rounded-full mt-2 overflow-hidden">
              <div className="w-[99.8%] h-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Asset specific KPIs
  const val = realtimeValues.get(assetId);
  return (
    <div className="space-y-4">
      <div className="p-4 bg-secondary/30 rounded-lg border border-border/50 flex flex-col items-center justify-center gap-2">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">Current Value</span>
        <span className="text-4xl font-bold font-mono text-primary shadow-primary/20 drop-shadow-md">
          {val ? val.value.toFixed(2) : '--'}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-secondary/30 rounded-lg border border-border/50">
          <span className="text-[10px] text-muted-foreground uppercase block mb-1">Min (1h)</span>
          <span className="text-sm font-mono">12.4</span>
        </div>
        <div className="p-3 bg-secondary/30 rounded-lg border border-border/50">
          <span className="text-[10px] text-muted-foreground uppercase block mb-1">Max (1h)</span>
          <span className="text-sm font-mono">87.2</span>
        </div>
      </div>
    </div>
  );
}

function AlertsTab({ assetId }: { assetId: string | null }) {
  const { realtimeValues, sensors } = useSensorStore();
  
  // Aggregate alerts
  const alerts: any[] = [];
  realtimeValues.forEach((val, id) => {
    if (val.value > 60) {
      alerts.push({
        id,
        name: sensors.find(s => s.id === id)?.name || id,
        value: val.value,
        level: val.value > 80 ? 'critical' : 'warning'
      });
    }
  });

  const filteredAlerts = assetId ? alerts.filter(a => a.id === assetId) : alerts;

  if (filteredAlerts.length === 0) return (
    <div className="flex flex-col items-center justify-center py-10 gap-2 opacity-60">
      <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
        <AlertCircle size={20} className="text-success" />
      </div>
      <p className="text-xs font-medium text-success">No active alerts</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {filteredAlerts.map(alert => (
        <div key={alert.id} className={`p-3 rounded-lg border flex flex-col gap-2 relative overflow-hidden ${
          alert.level === 'critical' ? 'bg-danger/5 border-danger/30' : 'bg-warning/5 border-warning/30'
        }`}>
          {/* Subtle gradient glow */}
          <div className={`absolute top-0 right-0 w-16 h-16 blur-2xl opacity-20 rounded-full ${
            alert.level === 'critical' ? 'bg-danger' : 'bg-warning'
          }`} />
          
          <div className="flex justify-between items-start z-10">
            <span className="text-sm font-medium">{alert.name}</span>
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
              alert.level === 'critical' ? 'bg-danger/20 text-danger' : 'bg-warning/20 text-warning'
            }`}>
              {alert.level}
            </span>
          </div>
          <div className="flex items-end justify-between z-10">
            <span className="text-xs text-muted-foreground">Threshold Exceeded</span>
            <span className={`font-mono font-bold ${
              alert.level === 'critical' ? 'text-danger' : 'text-warning'
            }`}>
              {alert.value.toFixed(1)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 text-center px-4">
      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
        <Activity size={20} className="text-muted-foreground/50" />
      </div>
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}
