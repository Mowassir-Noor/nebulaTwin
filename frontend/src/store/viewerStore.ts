import { create } from 'zustand';

interface ViewerState {
  selectedMeshName: string | null;
  selectedMeshId: string | null;
  selectedModelPartId: string | null;
  hoveredMeshName: string | null;
  activeModelId: string | null;
  selectMesh: (name: string | null, id?: string | null, modelPartId?: string | null) => void;
  hoverMesh: (name: string | null) => void;
  clearSelection: () => void;
  setActiveModel: (modelId: string | null) => void;
}

export const useViewerStore = create<ViewerState>((set) => ({
  selectedMeshName: null,
  selectedMeshId: null,
  selectedModelPartId: null,
  hoveredMeshName: null,
  activeModelId: null,

  selectMesh: (name, id = null, modelPartId = null) =>
    set({ selectedMeshName: name, selectedMeshId: id, selectedModelPartId: modelPartId }),

  hoverMesh: (name) => set({ hoveredMeshName: name }),

  clearSelection: () =>
    set({ selectedMeshName: null, selectedMeshId: null, selectedModelPartId: null }),

  setActiveModel: (modelId) => set({ activeModelId: modelId }),
}));
