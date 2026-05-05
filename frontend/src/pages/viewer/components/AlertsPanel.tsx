import { useCallback, useEffect, useRef, useState } from 'react';
import { alertsApi } from '@/services/api';
import wsService from '@/services/websocket';
import { AlertTriangle, CheckCircle, Clock, Radio, RefreshCw } from 'lucide-react';
import type { Alert, AlertEvent } from '@/types';

export function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAlerts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await alertsApi.unacknowledged();
      setAlerts(res.data);
    } catch (err) {
      console.error('Failed to fetch alerts', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    // Poll every 5s as fallback for when WebSocket is disconnected
    pollRef.current = setInterval(() => fetchAlerts(true), 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchAlerts]);

  useEffect(() => {
    const unsub = wsService.onAlert((_event: AlertEvent) => {
      setNewCount((n) => n + 1);
      fetchAlerts(true);
    });
    return unsub;
  }, [fetchAlerts]);

  const handleAcknowledge = async (id: string) => {
    try {
      await alertsApi.acknowledge(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error('Failed to acknowledge alert', err);
    }
  };

  const handleAcknowledgeAll = async () => {
    try {
      await alertsApi.acknowledgeAll();
      setAlerts([]);
      setNewCount(0);
    } catch (err) {
      console.error('Failed to acknowledge all alerts', err);
    }
  };

  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-red-400" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Active Alerts</span>
          {alerts.length > 0 && (
            <span className="rounded-full bg-red-500/20 border border-red-500/40 px-1.5 py-0.5 text-[9px] font-bold text-red-400">
              {alerts.length}
            </span>
          )}
          {criticalCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/30 px-1.5 py-0.5 text-[9px] font-bold text-red-300 animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              {criticalCount} CRITICAL
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[9px] text-emerald-400">
            <Radio size={9} className="animate-pulse" />
            LIVE
          </span>
          <button
            onClick={() => { setRefreshing(true); fetchAlerts(true); }}
            title="Refresh now"
            className="rounded-lg border border-slate-800 bg-slate-900/60 p-1 text-slate-500 transition hover:border-slate-600 hover:text-slate-300"
          >
            <RefreshCw size={10} className={refreshing ? 'animate-spin' : ''} />
          </button>
          {alerts.length > 0 && (
            <button
              onClick={handleAcknowledgeAll}
              className="rounded-lg border border-slate-700 bg-slate-900/60 px-2 py-1 text-[10px] text-slate-400 transition hover:border-cyan-400/50 hover:text-cyan-300"
            >
              Ack All
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-slate-600 animate-pulse py-4">
          <div className="h-3 w-3 rounded-full border-2 border-slate-600 border-t-transparent animate-spin" />
          Loading alerts...
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/25 p-6 text-center">
          <CheckCircle size={20} className="mb-2 text-emerald-500/60" />
          <span className="text-xs font-medium text-slate-500">All clear</span>
          <span className="text-[10px] text-slate-600 mt-1">No unacknowledged alerts</span>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onAcknowledge={() => handleAcknowledge(alert.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function AlertCard({ alert, onAcknowledge }: { alert: Alert; onAcknowledge: () => void }) {
  const isCritical = alert.severity === 'CRITICAL';

  return (
    <div className={`rounded-2xl border p-3 shadow-lg transition ${
      isCritical
        ? 'border-red-500/40 bg-red-500/8 shadow-red-950/20'
        : 'border-amber-500/30 bg-amber-500/8 shadow-black/10'
    }`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <AlertTriangle size={13} className={isCritical ? 'text-red-400' : 'text-amber-400'} />
          <span className={`text-[10px] font-bold uppercase tracking-wider ${isCritical ? 'text-red-400' : 'text-amber-400'}`}>
            {alert.severity}
          </span>
          {alert.sensor?.name && (
            <span className="text-[10px] text-slate-500">· {alert.sensor.name}</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1 text-[9px] text-slate-600">
          <Clock size={9} />
          {new Date(alert.createdAt).toLocaleTimeString()}
        </div>
      </div>

      <p className="text-xs text-slate-200 leading-5 mb-2">{alert.message}</p>

      <div className="flex items-center justify-between border-t border-slate-800/60 pt-2">
        <span className="font-mono text-[10px] text-slate-500">
          Value: <span className={isCritical ? 'text-red-300' : 'text-amber-300'}>{alert.value.toFixed(2)}</span>
        </span>
        <button
          onClick={onAcknowledge}
          className={`rounded-lg border px-2 py-1 text-[10px] font-medium transition ${
            isCritical
              ? 'border-red-500/40 text-red-300 hover:bg-red-500/10'
              : 'border-amber-500/30 text-amber-300 hover:bg-amber-500/10'
          }`}
        >
          Acknowledge
        </button>
      </div>
    </div>
  );
}
