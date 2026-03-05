import { create } from "zustand";

type IndoorSearchStore = {
  selectedPoiFilter: { type: string; label: string } | null;
  setSelectedPoiFilter: (type: string, label: string) => void;
  clearSelectedPoiFilter: () => void;
};

export const useIndoorSearchStore = create<IndoorSearchStore>((set) => ({
  selectedPoiFilter: null,
  setSelectedPoiFilter: (type, label) =>
    set({ selectedPoiFilter: { type, label } }),
  clearSelectedPoiFilter: () => set({ selectedPoiFilter: null }),
}));
