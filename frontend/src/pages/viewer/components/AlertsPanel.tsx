/* eslint-disable */
import { useEffect, useState } from 'react';
import { useSensorStore } from '@/store/sensorStore';
import { alertsApi } from '@/services/api';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import type { Alert } from '@/types';

export function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await alertsApi.unacknowledged();
      setAlerts(res.data);
    } catch (err) {
      console.error('Failed to fetch alerts', err);
    } finally {
      setLoading(false);
    }
  };

  // We fetch unacknowledged alerts on mount
  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleAcknowledge = async (id: string) => {
    try {
      await alertsApi.acknowledge(id);
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Failed to acknowledge alert', err);
    }
  };

  const handleAcknowledgeAll = async () => {
    try {
      await alertsApi.acknowledgeAll();
      setAlerts([]);
    } catch (err) {
      console.error('Failed to acknowledge all alerts', err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-blue-200 uppercase tracking-wider flex items-center gap-2">
          <AlertTriangle size={14} className="text-red-400" />
          Active Alerts
        </h3>
        {alerts.length > 0 && (
          <button 
            onClick={handleAcknowledgeAll}
            className="text-[10px] uppercase tracking-wider text-blue-400 hover:text-blue-300 transition-colors"
          >
            Ack All
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-xs text-blue-300/50 italic animate-pulse">Loading alerts...</div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-6 bg-blue-900/10 rounded-lg border border-blue-900/20 text-blue-300/50">
          <CheckCircle size={24} className="mb-2 text-green-500/50" />
          <span className="text-xs">No active alerts</span>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map(alert => (
            <AlertCard key={alert.id} alert={alert} onAcknowledge={() => handleAcknowledge(alert.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function AlertCard({ alert, onAcknowledge }: { alert: Alert, onAcknowledge: () => void }) {
  const isCritical = alert.severity === 'CRITICAL';
  const isWarning = alert.severity === 'WARNING';
  
  return (
    <div className={`p-3 rounded-lg border ${
      isCritical 
        ? 'bg-red-950/30 border-red-900/50' 
        : 'bg-yellow-950/30 border-yellow-900/50'
    }`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className={isCritical ? 'text-red-500' : 'text-yellow-500'} />
          <span className={`text-xs font-bold uppercase tracking-wider ${isCritical ? 'text-red-400' : 'text-yellow-400'}`}>
            {alert.severity}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-blue-300/50">
          <Clock size={10} />
          {new Date(alert.createdAt).toLocaleTimeString()}
        </div>
      </div>
      
      <p className="text-xs text-blue-100 mb-3">{alert.message}</p>
      
      <div className="flex justify-between items-center mt-2 pt-2 border-t border-blue-900/30">
        <span className="text-[10px] text-blue-400 font-mono">Value: {alert.value.toFixed(1)}</span>
        <button 
          onClick={onAcknowledge}
          className="text-[10px] bg-blue-900/30 hover:bg-blue-800/50 text-blue-200 px-2 py-1 rounded transition-colors"
        >
          Acknowledge
        </button>
      </div>
    </div>
  );
}
