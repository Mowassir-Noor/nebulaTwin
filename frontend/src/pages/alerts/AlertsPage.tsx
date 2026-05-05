import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsApi } from '@/services/api';
import wsService from '@/services/websocket';
import { toast } from '@/components/ui/Toast';
import { AlertTriangle, CheckCircle, Clock, Radio } from 'lucide-react';
import type { Alert, AlertEvent } from '@/types';

function SeverityBadge({ severity }: { severity: string }) {
  if (severity === 'CRITICAL') {
    return <span className="rounded-full border border-red-500/50 bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">{severity}</span>;
  }
  if (severity === 'WARNING') {
    return <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">{severity}</span>;
  }
  return <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-400">{severity}</span>;
}

export default function AlertsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unacknowledged'>('unacknowledged');

  const { data: alerts = [], isLoading, error } = useQuery({
    queryKey: ['alerts', filter],
    queryFn: () =>
      filter === 'unacknowledged'
        ? alertsApi.unacknowledged().then((r) => r.data)
        : alertsApi.list(100).then((r) => r.data),
    refetchInterval: 10000,
  });

  const { data: stats } = useQuery({
    queryKey: ['alerts', 'stats'],
    queryFn: () => alertsApi.stats().then((r) => r.data),
    refetchInterval: 10000,
  });

  const ackMutation = useMutation({
    mutationFn: (id: string) => alertsApi.acknowledge(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Alert acknowledged');
    },
  });

  const ackAllMutation = useMutation({
    mutationFn: () => alertsApi.acknowledgeAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('All alerts acknowledged');
    },
  });

  useEffect(() => {
    const unsub = wsService.onAlert((alert: AlertEvent) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      if (alert.severity === 'CRITICAL') {
        toast.error(`CRITICAL: ${alert.message}`);
      } else {
        toast.warning(`${alert.severity}: ${alert.message}`);
      }
    });
    return unsub;
  }, [queryClient]);

  const criticalAlerts = alerts.filter((a: Alert) => a.severity === 'CRITICAL' && !a.acknowledged);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-slate-100">Alerts</h1>
          <span className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-emerald-400">
            <Radio size={9} className="animate-pulse" />
            LIVE
          </span>
        </div>
        <div className="flex items-center gap-3">
          {stats && (
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1 font-semibold text-red-400">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                {stats.critical} critical
              </span>
              <span className="font-semibold text-amber-400">{stats.warning} warning</span>
              <span className="text-slate-500">{stats.unacknowledged} unack.</span>
            </div>
          )}
          <div className="flex overflow-hidden rounded-xl border border-slate-700">
            <button
              onClick={() => setFilter('unacknowledged')}
              className={`px-3 py-1.5 text-xs font-medium transition ${filter === 'unacknowledged' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Unacknowledged
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium transition ${filter === 'all' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'}`}
            >
              All
            </button>
          </div>
          <button
            onClick={() => ackAllMutation.mutate()}
            disabled={ackAllMutation.isPending}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-cyan-400/50 hover:text-cyan-300 disabled:opacity-50"
          >
            Acknowledge All
          </button>
        </div>
      </div>

      {criticalAlerts.length > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/50 bg-red-500/10 px-4 py-3 shadow-lg shadow-red-950/20">
          <AlertTriangle size={16} className="shrink-0 text-red-400 animate-pulse" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-300">
              {criticalAlerts.length} critical alert{criticalAlerts.length !== 1 ? 's' : ''} require attention
            </p>
            <p className="text-xs text-red-400/70 mt-0.5 truncate">
              {criticalAlerts.map((a) => a.sensor?.name ?? 'Unknown sensor').join(', ')}
            </p>
          </div>
          <button
            onClick={() => ackAllMutation.mutate()}
            disabled={ackAllMutation.isPending}
            className="shrink-0 rounded-xl border border-red-500/50 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
          >
            Ack All Critical
          </button>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          Failed to load alerts. Please try again.
        </div>
      )}

      {!isLoading && alerts.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 py-16 text-center">
          <CheckCircle size={28} className="mb-3 text-emerald-500/50" />
          <p className="text-sm font-semibold text-slate-400">All clear</p>
          <p className="mt-1 text-xs text-slate-600">All sensors are operating within thresholds</p>
        </div>
      )}

      <div className="space-y-2">
        {alerts.map((alert: Alert) => {
          const isCritical = alert.severity === 'CRITICAL';
          const isWarning = alert.severity === 'WARNING';
          return (
            <div
              key={alert.id}
              className={`flex items-center gap-4 rounded-2xl border p-4 transition ${
                alert.acknowledged
                  ? 'border-slate-800 bg-slate-900/30 opacity-50'
                  : isCritical
                  ? 'border-red-500/40 bg-red-500/8 shadow-sm shadow-red-950/30'
                  : isWarning
                  ? 'border-amber-500/30 bg-amber-500/8'
                  : 'border-slate-800 bg-slate-900/45'
              }`}
            >
              {isCritical && !alert.acknowledged && (
                <span className="h-full w-0.5 self-stretch rounded-full bg-red-500 shrink-0" />
              )}
              <SeverityBadge severity={alert.severity} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-100 truncate">{alert.message}</p>
                <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                  {alert.sensor?.name && (
                    <span className="text-slate-400 font-medium">{alert.sensor.name}</span>
                  )}
                  <span>Value: <span className={isCritical ? 'text-red-300 font-mono' : 'text-amber-300 font-mono'}>{alert.value.toFixed(2)}</span></span>
                  <span className="flex items-center gap-1"><Clock size={10} />{new Date(alert.createdAt).toLocaleString()}</span>
                </p>
              </div>
              {!alert.acknowledged && (
                <button
                  onClick={() => ackMutation.mutate(alert.id)}
                  disabled={ackMutation.isPending}
                  className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                    isCritical
                      ? 'border-red-500/40 text-red-300 hover:bg-red-500/10'
                      : 'border-slate-700 text-slate-300 hover:border-cyan-400/50 hover:text-cyan-300'
                  }`}
                >
                  Acknowledge
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
