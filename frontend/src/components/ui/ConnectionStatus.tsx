import { useState, useEffect } from 'react';
import wsService from '@/services/websocket';

const statusConfig = {
  connected: { color: 'bg-emerald-500', label: 'Connected', pulse: false },
  connecting: { color: 'bg-amber-500', label: 'Connecting...', pulse: true },
  reconnecting: { color: 'bg-amber-500', label: 'Reconnecting...', pulse: true },
  disconnected: { color: 'bg-red-500', label: 'Disconnected', pulse: false },
} as const;

export function ConnectionStatus() {
  const [status, setStatus] = useState(wsService.status);

  useEffect(() => {
    return wsService.onStatusChange(setStatus);
  }, []);

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <span className={`w-2 h-2 rounded-full ${config.color} ${config.pulse ? 'animate-pulse' : ''}`} />
      <span>{config.label}</span>
    </div>
  );
}
