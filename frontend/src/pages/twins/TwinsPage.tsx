/* eslint-disable */
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useTwinStore } from '@/store/twinStore';
import { twinsApi, assetsApi } from '@/services/api';
import { toast } from '@/components/ui/Toast';
import { Plus, ChevronRight, Box, Factory, Cog, Component, Pencil, Trash2, X } from 'lucide-react';
import { useRole } from '@/utils/rbac';
import type { Asset, AssetType, DigitalTwin } from '@/types';

const typeIcons: Record<AssetType, React.ReactNode> = {
  FACTORY: <Factory size={14} />,
  LINE: <ChevronRight size={14} />,
  MACHINE: <Cog size={14} />,
  COMPONENT: <Component size={14} />,
};

export default function TwinsPage() {
  const { twins, currentTwin, assets, fetchTwins, selectTwin, createTwin } = useTwinStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [editingTwin, setEditingTwin] = useState<DigitalTwin | null>(null);
  const [deletingTwin, setDeletingTwin] = useState<DigitalTwin | null>(null);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [deletingAsset, setDeletingAsset] = useState<Asset | null>(null);
  const { canEdit, canDelete } = useRole();

  useEffect(() => {
    fetchTwins();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createTwin(newName, newDesc);
    setNewName('');
    setNewDesc('');
    setShowCreate(false);
  };

  const handleDeleteTwin = async () => {
    if (!deletingTwin) return;
    try {
      await twinsApi.delete(deletingTwin.id);
      toast.success('Twin deleted');
      setDeletingTwin(null);
      fetchTwins();
    } catch {
      toast.error('Failed to delete twin');
    }
  };

  const handleDeleteAsset = async () => {
    if (!deletingAsset || !currentTwin) return;
    try {
      await assetsApi.delete(deletingAsset.id);
      toast.success('Asset deleted');
      setDeletingAsset(null);
      selectTwin(currentTwin.id);
    } catch {
      toast.error('Failed to delete asset');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Digital Twins</h1>
          <p className="text-sm text-muted-foreground">Manage your digital twin hierarchy</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus size={16} /> New Twin
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardContent className="flex items-end gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">Name</label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Smart Factory" />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">Description</label>
              <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Optional description" />
            </div>
            <Button onClick={handleCreate}>Create</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Twin list */}
        <div className="space-y-2">
          {twins.map((twin) => (
            <Card
              key={twin.id}
              className={`cursor-pointer transition-colors hover:border-primary/50 ${
                currentTwin?.id === twin.id ? 'border-primary' : ''
              }`}
              onClick={() => selectTwin(twin.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <Box size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{twin.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {twin.description || 'No description'}
                    </p>
                  </div>
                </div>
                {canEdit && (
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
                      onClick={() => setEditingTwin(twin)}
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    {canDelete && (
                      <button
                        className="rounded p-1 text-muted-foreground hover:bg-danger/10 hover:text-danger cursor-pointer"
                        onClick={() => setDeletingTwin(twin)}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
          {twins.length === 0 && (
            <p className="text-sm text-muted-foreground">No digital twins yet</p>
          )}
        </div>

        {/* Asset hierarchy */}
        <div className="lg:col-span-2">
          {currentTwin ? (
            <Card>
              <CardHeader>
                <CardTitle>{currentTwin.name} — Asset Hierarchy</CardTitle>
              </CardHeader>
              <CardContent>
                {assets.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No assets</p>
                ) : (
                  <AssetTree
                    assets={assets}
                    level={0}
                    onEdit={setEditingAsset}
                    onDelete={setDeletingAsset}
                  />
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              Select a twin to view its hierarchy
            </div>
          )}
        </div>
      </div>

      {/* Edit Twin Modal */}
      {editingTwin && (
        <EditTwinModal
          twin={editingTwin}
          onClose={() => setEditingTwin(null)}
          onSave={fetchTwins}
        />
      )}

      {/* Delete Twin Dialog */}
      {deletingTwin && (
        <ConfirmDialog
          title="Delete Digital Twin"
          message={`Delete "${deletingTwin.name}"? All associated assets, models, and sensors will be removed.`}
          onConfirm={handleDeleteTwin}
          onCancel={() => setDeletingTwin(null)}
        />
      )}

      {/* Edit Asset Modal */}
      {editingAsset && (
        <EditAssetModal
          asset={editingAsset}
          onClose={() => setEditingAsset(null)}
          onSave={() => currentTwin && selectTwin(currentTwin.id)}
        />
      )}

      {/* Delete Asset Dialog */}
      {deletingAsset && (
        <ConfirmDialog
          title="Delete Asset"
          message={`Delete "${deletingAsset.name}"? All child assets and sensors will be removed.`}
          onConfirm={handleDeleteAsset}
          onCancel={() => setDeletingAsset(null)}
        />
      )}
    </div>
  );
}

function AssetTree({
  assets,
  level,
  onEdit,
  onDelete,
}: {
  assets: Asset[];
  level: number;
  onEdit: (a: Asset) => void;
  onDelete: (a: Asset) => void;
}) {
  const rootAssets = assets.filter((a) => !a.parentId);
  const getChildren = (parentId: string) => assets.filter((a) => a.parentId === parentId);

  const renderAsset = (asset: Asset, depth: number) => (
    <div key={asset.id} style={{ paddingLeft: depth * 20 }} className="py-1">
      <div className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-secondary">
        <span className="text-muted-foreground">
          {typeIcons[asset.type] || <Box size={14} />}
        </span>
        <span className="text-sm text-foreground">{asset.name}</span>
        <Badge variant="secondary">{asset.type}</Badge>
        {asset.sensors && asset.sensors.length > 0 && (
          <Badge variant="success">{asset.sensors.length} sensors</Badge>
        )}
        <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="rounded p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={() => onEdit(asset)}
          >
            <Pencil size={12} />
          </button>
          <button
            className="rounded p-0.5 text-muted-foreground hover:text-danger cursor-pointer"
            onClick={() => onDelete(asset)}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      {getChildren(asset.id).map((child) => renderAsset(child, depth + 1))}
    </div>
  );

  return <div>{rootAssets.map((a) => renderAsset(a, level))}</div>;
}

function EditTwinModal({
  twin,
  onClose,
  onSave,
}: {
  twin: DigitalTwin;
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState(twin.name);
  const [description, setDescription] = useState(twin.description || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await twinsApi.update(twin.id, { name, description });
      toast.success('Twin updated');
      onSave();
      onClose();
    } catch {
      toast.error('Failed to update twin');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <Card className="w-96">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Edit Twin</CardTitle>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer"><X size={18} /></button>
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
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" disabled={saving || !name.trim()} onClick={handleSave}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EditAssetModal({
  asset,
  onClose,
  onSave,
}: {
  asset: Asset;
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState(asset.name);
  const [type, setType] = useState<string>(asset.type);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await assetsApi.update(asset.id, { name, type: type as AssetType });
      toast.success('Asset updated');
      onSave();
      onClose();
    } catch {
      toast.error('Failed to update asset');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <Card className="w-96">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Edit Asset</CardTitle>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer"><X size={18} /></button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Type</label>
            <select
              className="flex h-9 w-full rounded-lg border border-border bg-secondary px-3 text-sm text-foreground"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="FACTORY">Factory</option>
              <option value="LINE">Line</option>
              <option value="MACHINE">Machine</option>
              <option value="COMPONENT">Component</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" disabled={saving || !name.trim()} onClick={handleSave}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
