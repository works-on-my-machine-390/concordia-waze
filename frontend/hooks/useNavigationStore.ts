import { create } from "zustand";
import type { IndoorNavigationStep } from "@/app/utils/indoorNavigationSteps";
import { Coordinates } from "./queries/indoorDirectionsQueries";
import {
  DirectionsModel,
  DirectionsResponseBlockModel,
  DirectionsResponseBlockType,
  TransitMode,
} from "./queries/navigationQueries";

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
  code?: string; // duplicate of building if indoors
};

export type OutdoorNavigableLocation = {
  address?: string;
} & NavigableLocationBase;

export type IndoorNavigableLocation = {
  code: string;
  building: string;
  floor_number: number;
  indoor_position: Coordinates;
} & NavigableLocationBase;

export const NavigationPhase = {
  PREPARATION: "PREPARATION",
  ACTIVE: "ACTIVE",
} as const;

export const ModifyingFieldOptions = {
  start: "start",
  end: "end",
} as const;

export type ModifyingField =
  (typeof ModifyingFieldOptions)[keyof typeof ModifyingFieldOptions];

export type NavigationPhase =
  (typeof NavigationPhase)[keyof typeof NavigationPhase];

interface NavigationState {
  startLocation?: NavigableLocation | null; // null means user needs to set (or re-set) it themselves
  setStartLocation: (location: NavigableLocation | null) => void;

  endLocation?: NavigableLocation;
  setEndLocation: (location: NavigableLocation | null) => void;

  transitMode?: TransitMode;
  setTransitMode?: (mode: TransitMode) => void;

  currentDirections?: DirectionsModel;
  setCurrentDirections?: (directions: DirectionsModel) => void;

  currentOutdoorStepIndex?: number; // differs from the trackedOutdoorStep, as in this corresponds to the step being displayed.
  setCurrentOutdoorStepIndex?: (index: number) => void;

  trackedOutdoorStepIndex?: number; // the current step the user is at based on GPS location.
  setTrackedOutdoorStepIndex?: (index: number) => void;

  followingGPS?: boolean; // whether the app is currently trying to sync the displayed step with the user's actual location.
  setFollowingGPS?: (following: boolean) => void;

  currentIndoorStepIndex?: number;
  setCurrentIndoorStepIndex?: (index: number) => void;

  indoorNavigationSteps?: IndoorNavigationStep[];
  setIndoorNavigationSteps?: (steps: IndoorNavigationStep[]) => void;

  startDateTime?: Date;
  setStartDateTime?: (dateTime: Date) => void;

  modifyingField?: ModifyingField | null;
  setModifyingField?: (field: ModifyingField | null) => void;

  navigationPhase?: NavigationPhase;
  setNavigationPhase?: (phase: NavigationPhase) => void;

  clearState: () => void;
}

export const useNavigationStore = create<NavigationState>()((set) => ({
  startLocation: undefined,
  setStartLocation: (location: NavigableLocation | null) =>
    set({ startLocation: location }),
  endLocation: undefined,
  setEndLocation: (location: NavigableLocation | null) =>
    set({ endLocation: location }),
  transitMode: undefined,
  setTransitMode: (mode: TransitMode) => set({ transitMode: mode }),

  currentDirections: undefined,
  setCurrentDirections: (directions: DirectionsModel) =>
    set({ currentDirections: directions }),

  currentOutdoorStepIndex: 0,
  setCurrentOutdoorStepIndex: (index: number) =>
    set({ currentOutdoorStepIndex: index }),

  trackedOutdoorStepIndex: 0,
  setTrackedOutdoorStepIndex: (index: number) =>
    set({ trackedOutdoorStepIndex: index }),

  followingGPS: true,
  setFollowingGPS: (following: boolean) => set({ followingGPS: following }),

  currentIndoorStepIndex: 0,
  setCurrentIndoorStepIndex: (index: number) =>
    set({ currentIndoorStepIndex: index }),

  indoorNavigationSteps: [],
  setIndoorNavigationSteps: (steps: IndoorNavigationStep[]) =>
    set({ indoorNavigationSteps: steps }),

  startDateTime: undefined,
  setStartDateTime: (dateTime: Date) => set({ startDateTime: dateTime }),

  modifyingField: null,
  setModifyingField: (field: ModifyingField | null) =>
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
      trackedOutdoorStepIndex: undefined,
      currentIndoorStepIndex: undefined,
      indoorNavigationSteps: [],
      startDateTime: undefined,
      modifyingField: null,
      followingGPS: true,
      navigationPhase: undefined,
    }),
}));

/**
 * utility function for parsing over an ordered list of direction blocks (should already be assigned sequenceNumbers)
 * and returning a mapping of sequenceNumber to "indoor" vs "outdoor" for use in determining what kind of multi-segment directions we may have.
 */
export function getDirectionsSequence(
  directionBlocks: DirectionsResponseBlockModel[],
): Record<number, "outdoor" | "indoor"> {
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
