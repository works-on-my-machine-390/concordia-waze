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
  floor_number: number;
  indoor_position: Coordinates;
} & NavigableLocationBase;

export const NavigationPhase = {
  PREPARATION: "PREPARATION",
  ACTIVE: "ACTIVE",
} as const;

export type NavigationPhase =
  (typeof NavigationPhase)[keyof typeof NavigationPhase];

interface NavigationState {
  startLocation?: NavigableLocation;
  setStartLocation: (location: NavigableLocation) => void;

  endLocation?: NavigableLocation;
  setEndLocation: (location: NavigableLocation) => void;

  transitMode?: TransitMode;
  setTransitMode?: (mode: TransitMode) => void;

  currentDirections?: DirectionsModel;
  setCurrentDirections?: (directions: DirectionsModel) => void;

  currentStepIndex?: number;
  setCurrentStepIndex?: (index: number) => void;

  startDateTime?: Date;
  setStartDateTime?: (dateTime: Date) => void;

  modifyingField?: "start" | "end" | null;
  setModifyingField?: (field: "start" | "end" | null) => void;

  navigationPhase?: NavigationPhase;
  setNavigationPhase?: (phase: NavigationPhase) => void;

  startNavigation?: () => void;

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

  currentStepIndex: 0,
  setCurrentStepIndex: (index: number) => set({ currentStepIndex: index }),

  startDateTime: undefined,
  setStartDateTime: (dateTime: Date) => set({ startDateTime: dateTime }),

  modifyingField: null,
  setModifyingField: (field: "start" | "end" | null) =>
    set({ modifyingField: field }),

  navigationPhase: undefined,
  setNavigationPhase: (phase: NavigationPhase) =>
    set({ navigationPhase: phase }),

  clearState: () =>
    set({
      startLocation: undefined,
      endLocation: undefined,
      transitMode: undefined,
      currentDirections: undefined,
      currentStepIndex: undefined,
      startDateTime: undefined,
      modifyingField: null,
      navigationPhase: undefined,
    }),
}));
