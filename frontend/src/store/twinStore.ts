import { create } from 'zustand';
import type { DigitalTwin, Asset } from '@/types';
import { twinsApi, assetsApi } from '@/services/api';

interface TwinState {
  twins: DigitalTwin[];
  currentTwin: DigitalTwin | null;
  assets: Asset[];
  isLoading: boolean;
  fetchTwins: () => Promise<void>;
  selectTwin: (id: string) => Promise<void>;
  fetchAssets: (twinId: string) => Promise<void>;
  createTwin: (name: string, description?: string) => Promise<void>;
}

export const useTwinStore = create<TwinState>((set, get) => ({
  twins: [],
  currentTwin: null,
  assets: [],
  isLoading: false,

  fetchTwins: async () => {
    set({ isLoading: true });
    try {
      const { data } = await twinsApi.list();
      set({ twins: data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  selectTwin: async (id) => {
    set({ isLoading: true });
    try {
      const { data } = await twinsApi.get(id);
      set({ currentTwin: data });
      await get().fetchAssets(id);
    } catch {
      set({ isLoading: false });
    }
  },

  fetchAssets: async (twinId) => {
    try {
      const { data } = await assetsApi.list(twinId);
      set({ assets: data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createTwin: async (name, description) => {
    await twinsApi.create({ name, description });
    await get().fetchTwins();
  },
}));
