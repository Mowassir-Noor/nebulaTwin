import { create } from 'zustand';

interface DashboardState {
  selectedAsset: string | null;
  setSelectedAsset: (id: string | null) => void;
  activeTab: 'controls' | 'kpis' | 'alerts';
  setActiveTab: (tab: 'controls' | 'kpis' | 'alerts') => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  selectedAsset: null,
  setSelectedAsset: (id) => set({ selectedAsset: id }),
  activeTab: 'controls',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
