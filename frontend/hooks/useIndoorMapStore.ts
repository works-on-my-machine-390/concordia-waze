import { create } from "zustand";

/**
 * Zustand store for managing (most) states in the indoor-map page.
 */

interface IndoorMapPageState {
//   currentMode: MapMode;
//   setCurrentMode: (mode: MapMode) => void;
}

export const useIndoorMapStore = create<IndoorMapPageState>()((set) => ({
//   currentMode: "indoor",
//   setCurrentMode: (mode: MapMode) => set({ currentMode: mode }),
}));
