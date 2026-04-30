import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useTwinStore } from '@/store/twinStore';
import { Plus, ChevronRight, Box, Factory, Cog, Component } from 'lucide-react';
import type { Asset, AssetType } from '@/types';

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

      {/* Create form */}
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
                  <AssetTree assets={assets} level={0} />
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
    </div>
  );
}

function AssetTree({ assets, level }: { assets: Asset[]; level: number }) {
  // Build tree: find roots (no parentId) and nest children
  const rootAssets = assets.filter((a) => !a.parentId);
  const getChildren = (parentId: string) => assets.filter((a) => a.parentId === parentId);

  const renderAsset = (asset: Asset, depth: number) => (
    <div key={asset.id} style={{ paddingLeft: depth * 20 }} className="py-1">
      <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-secondary">
        <span className="text-muted-foreground">
          {typeIcons[asset.type] || <Box size={14} />}
        </span>
        <span className="text-sm text-foreground">{asset.name}</span>
        <Badge variant="secondary">{asset.type}</Badge>
        {asset.sensors && asset.sensors.length > 0 && (
          <Badge variant="success">{asset.sensors.length} sensors</Badge>
        )}
      </div>
      {getChildren(asset.id).map((child) => renderAsset(child, depth + 1))}
    </div>
  );

  return <div>{rootAssets.map((a) => renderAsset(a, level))}</div>;
}
