import { useState } from 'react';
import { useSensorStore } from '@/store/sensorStore';
import { useTwinStore } from '@/store/twinStore';
import { useDashboardStore } from './dashboardStore';
import { ChevronRight, ChevronDown, Box, Cpu } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export function LeftSidebar() {
  const { twins } = useTwinStore();
  const { sensors, realtimeValues } = useSensorStore();
  const { selectedAsset, setSelectedAsset } = useDashboardStore();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    twins: true,
    sensors: true
  });

  const toggle = (section: string) => setExpanded(p => ({ ...p, [section]: !p[section] }));

  return (
    <div className="p-4 space-y-6">
      <div>
        <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 px-2">Asset Tree</h2>
        
        {/* Twins Section */}
        <div className="space-y-1">
          <div 
            className="flex items-center justify-between px-2 py-2 hover:bg-secondary/40 rounded-lg cursor-pointer text-sm font-medium transition-colors"
            onClick={() => toggle('twins')}
          >
            <div className="flex items-center gap-2">
              {expanded.twins ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
              <Box size={14} className="text-primary" />
              <span>Digital Twins</span>
            </div>
            <Badge variant="secondary">{twins.length}</Badge>
          </div>
          
          {expanded.twins && (
            <div className="pl-8 pr-2 space-y-1 mt-1 border-l border-border/50 ml-3">
              {twins.map(twin => (
                <div 
                  key={twin.id}
                  onClick={() => setSelectedAsset(twin.id)}
                  className={`px-3 py-1.5 text-xs rounded-md cursor-pointer transition-colors ${
                    selectedAsset === twin.id ? 'bg-primary/20 text-primary font-medium' : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                  }`}
                >
                  {twin.name}
                </div>
              ))}
              {twins.length === 0 && <div className="text-xs text-muted-foreground/60 px-3 py-1">No twins found</div>}
            </div>
          )}
        </div>

        {/* Sensors Section */}
        <div className="space-y-1 mt-6">
          <div 
            className="flex items-center justify-between px-2 py-2 hover:bg-secondary/40 rounded-lg cursor-pointer text-sm font-medium transition-colors"
            onClick={() => toggle('sensors')}
          >
            <div className="flex items-center gap-2">
              {expanded.sensors ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
              <Cpu size={14} className="text-success" />
              <span>Sensors</span>
            </div>
            <Badge variant="success">{sensors.length}</Badge>
          </div>
          
          {expanded.sensors && (
            <div className="pl-8 pr-2 space-y-1 mt-1 border-l border-border/50 ml-3">
              {sensors.map(sensor => {
                const val = realtimeValues.get(sensor.id);
                const isCritical = val && val.value > 80;
                const isWarning = val && val.value > 60 && val.value <= 80;
                
                return (
                  <div 
                    key={sensor.id}
                    onClick={() => setSelectedAsset(sensor.id)}
                    className={`flex items-center justify-between px-3 py-1.5 text-xs rounded-md cursor-pointer transition-colors ${
                      selectedAsset === sensor.id ? 'bg-primary/20 text-primary font-medium' : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                    }`}
                  >
                    <span className="truncate mr-2">{sensor.name}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {val && <span className="font-mono text-[10px] opacity-70">{val.value.toFixed(1)}</span>}
                      <div className={`w-2 h-2 rounded-full ${isCritical ? 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]' : isWarning ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]' : val ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-muted'}`} />
                    </div>
                  </div>
                );
              })}
              {sensors.length === 0 && <div className="text-xs text-muted-foreground/60 px-3 py-1">No sensors found</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
