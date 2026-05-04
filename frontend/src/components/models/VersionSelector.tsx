/* eslint-disable */
import { useState, useEffect } from 'react';
import { GitBranch, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { modelsApi } from '@/services/api';
import type { ModelVersion } from '@/types';

interface VersionSelectorProps {
  modelId: string;
  currentVersion: number;
  onSelectVersion: (versionId: string) => void;
  onRollback?: (versionId: string) => void;
  canRollback?: boolean;
}

export function VersionSelector({
  modelId,
  currentVersion,
  onSelectVersion,
  onRollback,
  canRollback = false,
}: VersionSelectorProps) {
  const [versions, setVersions] = useState<ModelVersion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    modelsApi
      .versions(modelId)
      .then((res) => setVersions(res.data))
      .catch(() => setVersions([]))
      .finally(() => setLoading(false));
  }, [modelId, open]);

  return (
    <div className="relative">
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(!open)}
        className="gap-1.5"
      >
        <GitBranch size={14} />
        v{currentVersion}
      </Button>

      {open && (
        <div className="absolute top-full mt-1 right-0 z-50 w-64 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-border bg-muted/50">
            <span className="text-xs font-medium">Version History</span>
          </div>
          {loading ? (
            <div className="p-3 text-xs text-muted-foreground">Loading...</div>
          ) : versions.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground">No versions found</div>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer text-xs"
                  onClick={() => {
                    onSelectVersion(v.id);
                    setOpen(false);
                  }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">v{v.version}</span>
                      {v.isLatest && <Badge variant="success">latest</Badge>}
                    </div>
                    <div className="text-muted-foreground mt-0.5">
                      {new Date(v.createdAt).toLocaleDateString()}
                      {v.sizeBytes && ` · ${(v.sizeBytes / 1024 / 1024).toFixed(1)}MB`}
                    </div>
                  </div>
                  {canRollback && !v.isLatest && onRollback && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRollback(v.id);
                        setOpen(false);
                      }}
                      title="Rollback to this version"
                    >
                      <RotateCcw size={12} />
                    </Button>
                  )}
                  {v.isLatest && <Check size={14} className="text-green-500" />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default VersionSelector;
