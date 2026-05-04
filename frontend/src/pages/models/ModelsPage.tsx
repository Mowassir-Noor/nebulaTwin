import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { modelsApi, twinsApi } from '@/services/api';
import { toast } from '@/components/ui/Toast';
import { Upload, Trash2, Pencil, Eye, Box, FileBox, X, AlertTriangle, GitBranch, RotateCcw, ArchiveRestore } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '@/utils/rbac';
import { VersionSelector } from '@/components/models/VersionSelector';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Model3D, DigitalTwin } from '@/types';

export default function ModelsPage() {
  const [models, setModels] = useState<Model3D[]>([]);
  const [twins, setTwins] = useState<DigitalTwin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [editingModel, setEditingModel] = useState<Model3D | null>(null);
  const [deletingModel, setDeletingModel] = useState<Model3D | null>(null);
  const [boundCount, setBoundCount] = useState(0);
  const [versioningModel, setVersioningModel] = useState<Model3D | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const navigate = useNavigate();
  const { canUpload, canDelete, isAdmin } = useRole();

  const fetchModels = useCallback(async () => {
    setIsLoading(true);
    try {
      const [modelsRes, twinsRes] = await Promise.all([
        modelsApi.list(undefined, showDeleted),
        twinsApi.list(),
      ]);
      setModels(modelsRes.data);
      setTwins(twinsRes.data);
    } catch {
      toast.error('Failed to load models');
    } finally {
      setIsLoading(false);
    }
  }, [showDeleted]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const handleDelete = async () => {
    if (!deletingModel) return;
    try {
      await modelsApi.delete(deletingModel.id);
      toast.success('Model moved to trash');
      setDeletingModel(null);
      fetchModels();
    } catch {
      toast.error('Failed to delete model');
    }
  };

  const handleRestore = async (model: Model3D) => {
    try {
      await modelsApi.restore(model.id);
      toast.success('Model restored');
      fetchModels();
    } catch {
      toast.error('Failed to restore model');
    }
  };

  const handlePermanentDelete = async (model: Model3D) => {
    try {
      await modelsApi.permanentDelete(model.id);
      toast.success('Model permanently deleted');
      fetchModels();
    } catch {
      toast.error('Failed to permanently delete model');
    }
  };

  const handleRollback = async (versionId: string) => {
    try {
      await modelsApi.rollback(versionId);
      toast.success('Rolled back to selected version');
      fetchModels();
    } catch {
      toast.error('Failed to rollback');
    }
  };

  const handleConfirmDelete = async (model: Model3D) => {
    try {
      const { data } = await modelsApi.boundSensors(model.id);
      setBoundCount(data.count);
    } catch {
      setBoundCount(0);
    }
    setDeletingModel(model);
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '--';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">3D Models</h1>
          <p className="text-sm text-muted-foreground">Upload and manage 3D models for your digital twins</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
              className="rounded"
            />
            Show deleted
          </label>
          {canUpload && (
            <Button onClick={() => setShowUpload(!showUpload)}>
              <Upload size={16} /> Upload Model
            </Button>
          )}
        </div>
      </div>

      {showUpload && (
        <UploadPanel
          twins={twins}
          onSuccess={() => {
            setShowUpload(false);
            fetchModels();
          }}
          onCancel={() => setShowUpload(false)}
        />
      )}

      {/* Model Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {models.map((model) => (
          <Card key={model.id} className="group relative">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <FileBox size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{model.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {model.twin?.name || 'Unknown twin'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary">{model.format}</Badge>
                <Badge variant={model.isLatest ? 'success' : 'default'}>v{model.version}</Badge>
                {model.deletedAt && <Badge variant="danger">deleted</Badge>}
              </div>
            </div>

            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span>{formatSize(model.sizeBytes)}</span>
              <span>{(model.modelParts || model.parts || []).length} parts</span>
              <span>{new Date(model.createdAt).toLocaleDateString()}</span>
            </div>

            {model.description && (
              <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{model.description}</p>
            )}

            <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
              {!model.deletedAt && (
                <>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/viewer?modelId=${model.id}`)}>
                    <Eye size={14} /> View
                  </Button>
                  {canUpload && (
                    <Button size="sm" variant="outline" onClick={() => setEditingModel(model)}>
                      <Pencil size={14} /> Edit
                    </Button>
                  )}
                  {canUpload && (
                    <Button size="sm" variant="outline" onClick={() => setVersioningModel(model)}>
                      <GitBranch size={14} /> New Version
                    </Button>
                  )}
                  <VersionSelector
                    modelId={model.id}
                    currentVersion={model.version}
                    onSelectVersion={(id) => navigate(`/viewer?modelId=${id}`)}
                    onRollback={canUpload ? handleRollback : undefined}
                    canRollback={canUpload}
                  />
                  {canDelete && (
                    <Button size="sm" variant="destructive" onClick={() => handleConfirmDelete(model)}>
                      <Trash2 size={14} />
                    </Button>
                  )}
                </>
              )}
              {model.deletedAt && (
                <>
                  {canUpload && (
                    <Button size="sm" variant="outline" onClick={() => handleRestore(model)}>
                      <ArchiveRestore size={14} /> Restore
                    </Button>
                  )}
                  {isAdmin && (
                    <Button size="sm" variant="destructive" onClick={() => handlePermanentDelete(model)}>
                      <Trash2 size={14} /> Permanent Delete
                    </Button>
                  )}
                </>
              )}
            </div>
          </Card>
        ))}
        {isLoading && models.length === 0 && (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        )}
        {models.length === 0 && !isLoading && (
          <div className="col-span-3">
            <EmptyState
              icon={FileBox}
              title="No 3D models uploaded yet"
              description="Upload your first 3D model to get started with digital twin visualization."
              action={
                canUpload ? (
                  <Button size="sm" variant="outline" onClick={() => setShowUpload(true)}>
                    <Upload size={14} /> Upload your first model
                  </Button>
                ) : undefined
              }
            />
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingModel && (
        <EditModal
          model={editingModel}
          onClose={() => setEditingModel(null)}
          onSave={fetchModels}
        />
      )}

      {/* Upload New Version Modal */}
      {versioningModel && (
        <UploadVersionModal
          model={versioningModel}
          onClose={() => setVersioningModel(null)}
          onSuccess={() => {
            setVersioningModel(null);
            fetchModels();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingModel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <Card className="w-96">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-danger" />
                Delete Model
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-foreground">
                Are you sure you want to delete <strong>{deletingModel.name}</strong>?
              </p>
              {boundCount > 0 && (
                <div className="rounded-lg bg-warning/10 p-3 text-xs text-warning">
                  <AlertTriangle size={14} className="inline mr-1" />
                  {boundCount} sensor(s) are bound to this model and will be unbound.
                </div>
              )}
              <p className="text-xs text-muted-foreground">The model will be moved to trash. You can restore it later.</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setDeletingModel(null)}>
                  Cancel
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDelete}>
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Upload Panel ────────────────────────────────────────

function UploadPanel({
  twins,
  onSuccess,
  onCancel,
}: {
  twins: DigitalTwin[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [twinId, setTwinId] = useState(twins[0]?.id || '');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!file || !twinId) return;
    setUploading(true);
    setProgress(0);

    // Simulate progress
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 10, 90));
    }, 200);

    try {
      await modelsApi.upload(file, twinId, name || undefined, description || undefined);
      clearInterval(interval);
      setProgress(100);
      toast.success(`Model "${file.name}" uploaded successfully`);
      setTimeout(onSuccess, 300);
    } catch (err: any) {
      clearInterval(interval);
      setProgress(0);
      toast.error(err?.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Upload 3D Model</CardTitle>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground cursor-pointer">
          <X size={18} />
        </button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop Zone */}
        <div
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors cursor-pointer ${
            dragOver
              ? 'border-primary bg-primary/5'
              : file
                ? 'border-success bg-success/5'
                : 'border-border hover:border-primary/50'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".glb,.gltf,.obj,.fbx"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {file ? (
            <>
              <FileBox size={32} className="mb-2 text-success" />
              <p className="text-sm font-medium text-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground">{(file.size / 1048576).toFixed(1)} MB</p>
            </>
          ) : (
            <>
              <Upload size={32} className="mb-2 text-muted-foreground" />
              <p className="text-sm text-foreground">Drag & drop a 3D model here</p>
              <p className="text-xs text-muted-foreground">.glb, .gltf, .obj, .fbx (max 100MB)</p>
            </>
          )}
        </div>

        {/* Progress Bar */}
        {uploading && (
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Form Fields */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Digital Twin</label>
            <select
              className="flex h-9 w-full rounded-lg border border-border bg-secondary px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              value={twinId}
              onChange={(e) => setTwinId(e.target.value)}
            >
              {twins.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Model Name (optional)</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Factory Floor v2"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Description (optional)</label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the model"
          />
        </div>

        <Button
          className="w-full"
          disabled={!file || !twinId || uploading}
          onClick={handleUpload}
        >
          {uploading ? 'Uploading...' : 'Upload Model'}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Edit Modal ──────────────────────────────────────────

function EditModal({
  model,
  onClose,
  onSave,
}: {
  model: Model3D;
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState(model.name);
  const [description, setDescription] = useState(model.description || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await modelsApi.update(model.id, { name, description });
      toast.success('Model updated');
      onSave();
      onClose();
    } catch {
      toast.error('Failed to update model');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <Card className="w-96">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Edit Model</CardTitle>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer">
            <X size={18} />
          </button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" disabled={saving || !name.trim()} onClick={handleSave}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Upload New Version Modal ─────────────────────────────

function UploadVersionModal({
  model,
  onClose,
  onSuccess,
}: {
  model: Model3D;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState(model.name);
  const [description, setDescription] = useState(model.description || '');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      await modelsApi.uploadVersion(model.id, file, name || undefined, description || undefined);
      toast.success(`New version uploaded for "${model.name}"`);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <Card className="w-[28rem]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <GitBranch size={16} />
            Upload New Version
          </CardTitle>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer">
            <X size={18} />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            Creating new version of <strong className="text-foreground">{model.name}</strong> (current: v{model.version})
          </div>

          <div
            className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors cursor-pointer ${
              file ? 'border-success bg-success/5' : 'border-border hover:border-primary/50'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".glb,.gltf,.obj,.fbx"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file ? (
              <>
                <FileBox size={24} className="mb-1 text-success" />
                <p className="text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1048576).toFixed(1)} MB</p>
              </>
            ) : (
              <>
                <Upload size={24} className="mb-1 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Select new model file</p>
              </>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Name (optional)</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Description (optional)</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" disabled={!file || uploading} onClick={handleUpload}>
              {uploading ? 'Uploading...' : 'Upload Version'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
