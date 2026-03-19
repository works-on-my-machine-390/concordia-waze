import { create } from "zustand";
import type { IndoorNavigationStep } from "@/app/utils/indoorNavigationSteps";
import { Coordinates } from "./queries/indoorDirectionsQueries";
import { DirectionsModel, DirectionsResponseBlockModel, DirectionsResponseBlockType, TransitMode } from "./queries/navigationQueries";

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

  currentOutdoorStepIndex?: number;
  setCurrentOutdoorStepIndex?: (index: number) => void;

  currentIndoorStepIndex?: number;
  setCurrentIndoorStepIndex?: (index: number) => void;

  indoorNavigationSteps?: IndoorNavigationStep[];
  setIndoorNavigationSteps?: (steps: IndoorNavigationStep[]) => void;

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

  currentOutdoorStepIndex: 0,
  setCurrentOutdoorStepIndex: (index: number) => set({ currentOutdoorStepIndex: index }),

  currentIndoorStepIndex: 0,
  setCurrentIndoorStepIndex: (index: number) => set({ currentIndoorStepIndex: index }),

  indoorNavigationSteps: [],
  setIndoorNavigationSteps: (steps: IndoorNavigationStep[]) =>
    set({ indoorNavigationSteps: steps }),

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
      currentOutdoorStepIndex: undefined,
      currentIndoorStepIndex: undefined,
      indoorNavigationSteps: [],
      startDateTime: undefined,
      modifyingField: null,
      navigationPhase: undefined,
    }),
}));


/**
 * utility function for parsing over an ordered list of direction blocks (should already be assigned sequenceNumbers)
 * and returning a mapping of sequenceNumber to "indoor" vs "outdoor" for use in determining what kind of multi-segment directions we may have.
 */
export function getDirectionsSequence(directionBlocks: DirectionsResponseBlockModel[]): Record<number, "outdoor" | "indoor"> {
  let sequence: Record<number, "outdoor" | "indoor"> = {};
  directionBlocks.forEach((block, index) => {
    // this shouldn't happen with its planned usage, but it's for type safety.
    if (block.type === DirectionsResponseBlockType.DURATION) {
      return; // skip duration blocks as they aren't relevant for determining the sequence of indoor vs outdoor steps.
    }
    sequence[index] = block.type;
  });
  return sequence;
}