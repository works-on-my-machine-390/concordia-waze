import { LocationObject } from "expo-location";
import { create } from "zustand";

/**
 * Zustand store for managing (most) states in the map page.
 */

export const MapMode = {
  POI: "POI",
  BUILDING: "BUILDING",
  SETTINGS: "SETTINGS",
  NAVIGATION: "NAVIGATION",
  NONE: "NONE",
} as const;

export type MapMode = (typeof MapMode)[keyof typeof MapMode];

interface MapPageState {
  userLocation?: LocationObject;
  setUserLocation: (location: LocationObject) => void;

  selectedBuildingCode?: string; // selected building is the one that was just pressed
  setSelectedBuildingCode: (code: string) => void;
  currentBuildingCode?: string; // current building is the one the user is in (if location available)
  setCurrentBuildingCode: (code: string) => void;

  currentMode: MapMode;
  setCurrentMode: (mode: MapMode) => void;

  closeSheet: () => void;
}

export const useMapStore = create<MapPageState>()((set) => ({
  userLocation: undefined,
  setUserLocation: (location: LocationObject) =>
    set({ userLocation: location }),

  currentBuildingCode: undefined,
  setCurrentBuildingCode: (code: string) => set({ currentBuildingCode: code }),

  selectedBuildingCode: undefined,
  setSelectedBuildingCode: (code: string) =>
    set({ selectedBuildingCode: code }),

  currentMode: MapMode.NONE,
  setCurrentMode: (mode: MapMode) =>
    set(() => {
      if (
        mode === MapMode.NONE ||
        mode === MapMode.SETTINGS ||
        mode === MapMode.POI
      ) {
        return {
          currentMode: mode,
          selectedBuildingCode: undefined, // deselect building when exiting building mode or opening settings/poi
        };
      }

      return {
        currentMode: mode,
      };
    }),

  closeSheet: () =>
    set({ currentMode: MapMode.NONE, selectedBuildingCode: undefined }),
}));
