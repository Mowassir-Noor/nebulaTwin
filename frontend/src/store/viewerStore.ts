import { create } from 'zustand';

interface ViewerState {
  selectedMeshName: string | null;
  selectedMeshId: string | null;
  selectedModelPartId: string | null;
  hoveredMeshName: string | null;
  hoveredModelPartId: string | null;
  activeModelId: string | null;
  activeModelTwinId: string | null;
  selectMesh: (name: string | null, id?: string | null, modelPartId?: string | null) => void;
  hoverMesh: (name: string | null, modelPartId?: string | null) => void;
  clearSelection: () => void;
  setActiveModel: (modelId: string | null, twinId?: string | null) => void;
}

export const useViewerStore = create<ViewerState>((set) => ({
  selectedMeshName: null,
  selectedMeshId: null,
  selectedModelPartId: null,
  hoveredMeshName: null,
  hoveredModelPartId: null,
  activeModelId: null,
  activeModelTwinId: null,

  selectMesh: (name, id = null, modelPartId = null) =>
    set({ selectedMeshName: name, selectedMeshId: id, selectedModelPartId: modelPartId }),

  hoverMesh: (name, modelPartId = null) =>
    set({ hoveredMeshName: name, hoveredModelPartId: modelPartId }),

  clearSelection: () =>
    set({ selectedMeshName: null, selectedMeshId: null, selectedModelPartId: null }),

  setActiveModel: (modelId, twinId = null) =>
    set({
      activeModelId: modelId,
      activeModelTwinId: twinId,
      selectedMeshName: null,
      selectedMeshId: null,
      selectedModelPartId: null,
      hoveredMeshName: null,
      hoveredModelPartId: null,
    }),
}));
