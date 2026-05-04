import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTwinStore } from '@/store/twinStore';
import { useSensorStore } from '@/store/sensorStore';
import { useViewerStore } from '@/store/viewerStore';
import { ChevronRight, ChevronDown, Box, Cpu } from 'lucide-react';
import type { Asset, DigitalTwin } from '@/types';

export function AssetTreePanel() {
  const { twins } = useTwinStore();
  const activeModelTwinId = useViewerStore((s) => s.activeModelTwinId);
  
  // Find twin for the current active model, or show all if none
  const displayTwins = activeModelTwinId 
    ? twins.filter(t => t.id === activeModelTwinId) 
    : twins;

  return (
    <div className="flex flex-col h-full bg-[#0B1220]/80 backdrop-blur-md border-r border-blue-900/30 overflow-y-auto custom-scrollbar">
      <div className="p-4 border-b border-blue-900/30">
        <h2 className="text-sm font-bold text-blue-100 uppercase tracking-widest flex items-center gap-2">
          <Box size={16} className="text-blue-400" />
          Asset Explorer
        </h2>
      </div>
      <div className="p-3 space-y-2">
        {displayTwins.length === 0 ? (
          <div className="text-xs text-blue-300/50 p-2">No assets available</div>
        ) : (
          displayTwins.map(twin => <TwinNode key={twin.id} twin={twin} />)
        )}
      </div>
    </div>
  );
}

function TwinNode({ twin }: { twin: DigitalTwin }) {
  const [expanded, setExpanded] = useState(true);
  
  return (
    <div className="space-y-1">
      <div 
        className="flex items-center gap-2 p-2 rounded-md hover:bg-blue-900/20 cursor-pointer text-blue-100 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown size={14} className="text-blue-400" /> : <ChevronRight size={14} className="text-blue-400" />}
        <span className="text-sm font-medium">{twin.name}</span>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden pl-5 border-l border-blue-900/20 ml-3 space-y-1"
          >
            {twin.assets?.length ? (
              twin.assets.map(asset => <AssetNode key={asset.id} asset={asset} />)
            ) : (
              <div className="text-xs text-blue-300/50 p-1">No hierarchy defined</div>
            )}
            
            {/* Display flat sensors for the twin if no deep asset hierarchy exists */}
            <TwinSensors twinId={twin.id} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AssetNode({ asset }: { asset: Asset }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="space-y-1">
      <div 
        className="flex items-center gap-2 p-1.5 rounded-md hover:bg-blue-900/20 cursor-pointer text-blue-200 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {asset.children?.length || asset.sensors?.length ? (
          expanded ? <ChevronDown size={14} className="text-blue-500" /> : <ChevronRight size={14} className="text-blue-500" />
        ) : (
          <div className="w-[14px]" />
        )}
        <span className="text-xs">{asset.name}</span>
        <span className="text-[10px] bg-blue-900/40 text-blue-300 px-1.5 py-0.5 rounded ml-auto">
          {asset.type}
        </span>
      </div>
      
      <AnimatePresence>
        {expanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden pl-4 border-l border-blue-900/20 ml-2 space-y-1 mt-1"
          >
            {asset.children?.map(child => <AssetNode key={child.id} asset={child} />)}
            {asset.sensors?.map(sensor => <SensorNode key={sensor.id} sensorId={sensor.id} name={sensor.name} modelPartId={sensor.modelPartId} />)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TwinSensors({ twinId }: { twinId: string }) {
  const sensors = useSensorStore(s => s.sensors);
  // Get sensors that belong to this twin but aren't strictly attached to a specific deep asset in our mock/flat view
  const twinSensors = sensors.filter(s => s.asset?.twinId === twinId || (!s.assetId));
  
  if (!twinSensors.length) return null;
  
  return (
    <div className="mt-2 space-y-1">
      {twinSensors.map(sensor => (
        <SensorNode key={sensor.id} sensorId={sensor.id} name={sensor.name} modelPartId={sensor.modelPartId} />
      ))}
    </div>
  );
}

function SensorNode({ sensorId, name, modelPartId }: { sensorId: string, name: string, modelPartId?: string }) {
  const realtimeValues = useSensorStore(s => s.realtimeValues);
  const focusOnModelPart = useViewerStore(s => s.focusOnModelPart);
  const val = realtimeValues.get(sensorId);
  
  const isCritical = val && val.value > 80;
  const isWarning = val && val.value > 60 && val.value <= 80;

  return (
    <div 
      className="flex items-center justify-between p-1.5 rounded-md hover:bg-blue-800/30 cursor-pointer text-blue-200 transition-colors group"
      onClick={() => {
        if (modelPartId) {
          focusOnModelPart(modelPartId);
        }
      }}
    >
      <div className="flex items-center gap-2 truncate">
        <Cpu size={12} className="text-blue-400 group-hover:text-blue-300" />
        <span className="text-xs truncate">{name}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {val && <span className="font-mono text-[10px] text-blue-300">{val.value.toFixed(1)}</span>}
        <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${
          isCritical ? 'bg-red-500 text-red-500' : 
          isWarning ? 'bg-yellow-500 text-yellow-500' : 
          val ? 'bg-green-500 text-green-500' : 'bg-slate-600 text-transparent shadow-none'
        }`} />
      </div>
    </div>
  );
}
