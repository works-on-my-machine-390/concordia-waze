import { create } from "zustand";
import { OutdoorDirectionsModel, TransitMode } from "./queries/navigationQueries";
import { Coordinates } from "./queries/indoorDirectionsQueries";

/**
 * Zustand store for managing states during navigation.
 */

export type NavigableLocation =
  | OutdoorNavigableLocation
  | IndoorNavigableLocation;

export type OutdoorNavigableLocation = {
  latitude: number;
  longitude: number;
  name: string;
  code?: string;
  address?: string;
};

export type IndoorNavigableLocation = {
  name: string;
  building: string;
  floor_number: string;
  indoor_position: Coordinates;
  fallback?: OutdoorNavigableLocation;
};

interface NavigationState {
  startLocation?: NavigableLocation;
  setStartLocation: (location: NavigableLocation) => void;
  endLocation?: NavigableLocation;
  setEndLocation: (location: NavigableLocation) => void;
  transitMode?: TransitMode;
  setTransitMode?: (mode: TransitMode) => void;
  currentDirections?: OutdoorDirectionsModel;
  setCurrentDirections?: (directions: OutdoorDirectionsModel) => void;

  clearState: () => void;
}

export const useNavigationStore = create<NavigationState>()((set) => ({
  startLocation: undefined,
  setStartLocation: (location: NavigableLocation) =>
    set({ startLocation: location }),
  endLocation: undefined,
  setEndLocation: (location: NavigableLocation) =>
    set({ endLocation: location }),
  transitMode: undefined,
  setTransitMode: (mode: TransitMode) => set({ transitMode: mode }),

  currentDirections: undefined,
  setCurrentDirections: (directions: OutdoorDirectionsModel) =>
    set({ currentDirections: directions }),

  clearState: () =>
    set({
      startLocation: undefined,
      endLocation: undefined,
      transitMode: undefined,
      currentDirections: undefined,
    }),
}));
