import { create } from "zustand";
import { Coordinates } from "./queries/indoorDirectionsQueries";
import { DirectionsModel, TransitMode } from "./queries/navigationQueries";

/**
 * Zustand store for managing states during navigation.
 */

export type NavigableLocation =
  | OutdoorNavigableLocation
  | IndoorNavigableLocation;

type NavigableLocationBase = {
  latitude: number;
  longitude: number;
  name: string;
  code: string; // duplicate of building if indoors
};

export type OutdoorNavigableLocation = {
  code?: string;
  address?: string;
} & NavigableLocationBase;

export type IndoorNavigableLocation = {
  building: string;
  floor_number: string;
  indoor_position: Coordinates;
} & NavigableLocationBase;

interface NavigationState {
  startLocation?: NavigableLocation;
  setStartLocation: (location: NavigableLocation) => void;
  endLocation?: NavigableLocation;
  setEndLocation: (location: NavigableLocation) => void;
  transitMode?: TransitMode;
  setTransitMode?: (mode: TransitMode) => void;
  currentDirections?: DirectionsModel;
  setCurrentDirections?: (directions: DirectionsModel) => void;

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
  setCurrentDirections: (directions: DirectionsModel) =>
    set({ currentDirections: directions }),

  clearState: () =>
    set({
      startLocation: undefined,
      endLocation: undefined,
      transitMode: undefined,
      currentDirections: undefined,
    }),
}));
