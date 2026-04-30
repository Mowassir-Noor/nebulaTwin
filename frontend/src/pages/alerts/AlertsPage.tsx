import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsApi } from '@/services/api';
import wsService from '@/services/websocket';
import { toast } from '@/components/ui/Toast';
import type { Alert, AlertEvent } from '@/types';

function severityBadge(severity: string) {
  const base = 'px-2 py-0.5 rounded text-xs font-semibold uppercase';
  if (severity === 'CRITICAL') return `${base} bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300`;
  return `${base} bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300`;
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

  // Live alerts via WebSocket
  useEffect(() => {
    const unsub = wsService.onAlert((alert: AlertEvent) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.warning(`${alert.severity}: ${alert.message}`);
    });
    return unsub;
  }, [queryClient]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Alerts</h1>
        <div className="flex items-center gap-3">
          {stats && (
            <div className="flex gap-4 text-sm mr-4">
              <span className="text-red-500 font-semibold">{stats.critical} critical</span>
              <span className="text-amber-500 font-semibold">{stats.warning} warning</span>
              <span className="text-slate-400">{stats.unacknowledged} unacknowledged</span>
            </div>
          )}
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
              onClick={() => setFilter('unacknowledged')}
              className={`px-3 py-1.5 text-sm ${filter === 'unacknowledged' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}
            >
              Unacknowledged
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-sm ${filter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}
            >
              All
            </button>
          </div>
          <button
            onClick={() => ackAllMutation.mutate()}
            disabled={ackAllMutation.isPending}
            className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            Acknowledge All
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">
          Failed to load alerts. Please try again.
        </div>
      )}

      {!isLoading && alerts.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          No alerts to display
        </div>
      )}

      <div className="space-y-2">
        {alerts.map((alert: Alert) => (
          <div
            key={alert.id}
            className={`flex items-center gap-4 p-4 rounded-lg border ${
              alert.acknowledged
                ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 opacity-60'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
            }`}
          >
            <span className={severityBadge(alert.severity)}>{alert.severity}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-900 dark:text-white truncate">{alert.message}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {alert.sensor?.name && <span className="mr-3">Sensor: {alert.sensor.name}</span>}
                Value: {alert.value.toFixed(2)} &middot; {new Date(alert.createdAt).toLocaleString()}
              </p>
            </div>
            {!alert.acknowledged && (
              <button
                onClick={() => ackMutation.mutate(alert.id)}
                disabled={ackMutation.isPending}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
              >
                Acknowledge
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
