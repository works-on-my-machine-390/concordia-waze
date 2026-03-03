import { create } from "zustand";
import type { FloorSegment, Coordinates } from "@/hooks/queries/indoorDirectionsQueries";

export type IndoorNavMode = "BROWSE" | "ITINERARY";
export type PickMode = "start" | "end";

export type SelectedPoint = {
  label: string;
  floor: number;
  coord: Coordinates; // normalized 0..1
};

type IndoorNavigationState = {
  mode: IndoorNavMode;
  pickMode: PickMode;

  start: SelectedPoint | null;
  end: SelectedPoint | null;

  routeSegments: FloorSegment[] | null;
  totalDistance: number | null;

  // actions
  enterItinerary: () => void;
  exitItinerary: () => void;

  setPickMode: (m: PickMode) => void;
  setStart: (p: SelectedPoint | null) => void;
  setEnd: (p: SelectedPoint | null) => void;

  setRoute: (segments: FloorSegment[] | null, totalDistance: number | null) => void;
  clearRoute: () => void;
};

export const useIndoorNavigationStore = create<IndoorNavigationState>((set) => ({
  mode: "BROWSE",
  pickMode: "start",

  start: null,
  end: null,

  routeSegments: null,
  totalDistance: null,

  enterItinerary: () =>
    set({
      mode: "ITINERARY",
      pickMode: "start",
      start: null,
      end: null,
      routeSegments: null,
      totalDistance: null,
    }),

  exitItinerary: () =>
    set({
      mode: "BROWSE",
      pickMode: "start",
      start: null,
      end: null,
      routeSegments: null,
      totalDistance: null,
    }),

  setPickMode: (m) => set({ pickMode: m }),
  setStart: (p) => set({ start: p }),
  setEnd: (p) => set({ end: p }),

  setRoute: (segments, totalDistance) => set({ routeSegments: segments, totalDistance }),
  clearRoute: () => set({ routeSegments: null, totalDistance: null }),
}));