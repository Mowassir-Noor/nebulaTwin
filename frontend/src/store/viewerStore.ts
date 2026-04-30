import { create } from 'zustand';

interface ViewerState {
  selectedMeshName: string | null;
  selectedMeshId: string | null;
  hoveredMeshName: string | null;
  selectMesh: (name: string | null, id?: string | null) => void;
  hoverMesh: (name: string | null) => void;
  clearSelection: () => void;
}

export const useViewerStore = create<ViewerState>((set) => ({
  selectedMeshName: null,
  selectedMeshId: null,
  hoveredMeshName: null,

  selectMesh: (name, id = null) =>
    set({ selectedMeshName: name, selectedMeshId: id }),

  hoverMesh: (name) => set({ hoveredMeshName: name }),

  clearSelection: () =>
    set({ selectedMeshName: null, selectedMeshId: null }),
}));
