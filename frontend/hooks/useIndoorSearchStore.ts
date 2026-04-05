import { create } from "zustand";
import { PointOfInterest } from "./queries/indoorMapQueries";

type IndoorSearchStore = {
  selectedPoiFilter: { type: string; label: string } | null;
  setSelectedPoiFilter: (type: string, label: string) => void;
  clearSelectedPoiFilter: () => void;

  filteredPois?: PointOfInterest[] | null;
  setFilteredPois: (pois: PointOfInterest[] | null) => void;
};

export const useIndoorSearchStore = create<IndoorSearchStore>((set) => ({
  selectedPoiFilter: null,
  setSelectedPoiFilter: (type, label) =>
    set({ selectedPoiFilter: { type, label } }),
  clearSelectedPoiFilter: () => set({ selectedPoiFilter: null }),
  filteredPois: null,
  setFilteredPois: (pois) => set({ filteredPois: pois }),
}));
