import { useState } from 'react';
import { Sliders, BarChart2, AlertCircle } from 'lucide-react';
import { SensorControlsPanel } from './SensorControlsPanel';
import { KPIView } from './KPIView';
import { AlertsPanel } from './AlertsPanel';
import { SensorBindingPanel } from '@/components/sensors/SensorBindingPanel';
import { useViewerStore } from '@/store/viewerStore';

export function ControlSidebar() {
  const [activeTab, setActiveTab] = useState<'controls' | 'kpis' | 'alerts'>('controls');
  const selectedMeshName = useViewerStore(s => s.selectedMeshName);
  const activeModelTwinId = useViewerStore(s => s.activeModelTwinId);

  return (
    <div className="flex flex-col h-full bg-[#050B18]/90 backdrop-blur-md border-l border-blue-900/30 w-80">
      {/* Tabs Header */}
      <div className="flex items-center border-b border-blue-900/50 sticky top-0 bg-[#050B18]/95 z-10">
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
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {activeTab === 'controls' && (
          <div className="space-y-4">
            {/* Show Binding Panel if a mesh is selected */}
            {selectedMeshName && <SensorBindingPanel activeTwinId={activeModelTwinId ?? undefined} />}
            <SensorControlsPanel />
          </div>
        )}
        {activeTab === 'kpis' && <KPIView />}
        {activeTab === 'alerts' && <AlertsPanel />}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium transition-all relative ${
        active ? 'text-blue-400 bg-blue-900/10' : 'text-blue-300/50 hover:text-blue-200 hover:bg-blue-900/20'
      }`}
    >
      {icon}
      <span>{label}</span>
      {active && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-400 shadow-[0_-2px_8px_rgba(96,165,250,0.8)]" />
      )}
    </button>
  );
}
