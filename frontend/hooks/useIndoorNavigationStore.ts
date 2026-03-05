import { create } from "zustand";
import type { FloorSegment, Coordinates } from "@/hooks/queries/indoorDirectionsQueries";

export type IndoorNavMode = "BROWSE" | "ITINERARY";
export type PickMode = "start" | "end";

export type SelectedPoint = {
  label: string;
  floor: number;
  coord: Coordinates;
};

type IndoorNavigationState = {
  mode: IndoorNavMode;
  pickMode: PickMode;

  selectedRoom: SelectedPoint | null;

  start: SelectedPoint | null;
  end: SelectedPoint | null;

  routeSegments: FloorSegment[] | null;
  totalDistance: number | null;

  currentFloor: number | null;
  setCurrentFloor: (f: number | null) => void;

  setSelectedRoom: (p: SelectedPoint | null) => void;

  enterItineraryFromSelected: () => void;
  exitItinerary: () => void;

  setPickMode: (m: PickMode) => void;
  setStart: (p: SelectedPoint | null) => void;
  setEnd: (p: SelectedPoint | null) => void;

  setRoute: (segments: FloorSegment[] | null, totalDistance: number | null) => void;
  clearRoute: () => void;
};

export const useIndoorNavigationStore = create<IndoorNavigationState>((set, get) => ({
  mode: "BROWSE",
  pickMode: "start",

  selectedRoom: null,

  start: null,
  end: null,

  routeSegments: null,
  totalDistance: null,

  currentFloor: null,
  setCurrentFloor: (f) => set({ currentFloor: f }),

  setSelectedRoom: (p) => set({ selectedRoom: p }),

 enterItineraryFromSelected: () => {
    const sel = get().selectedRoom;
    if (!sel) return;

    set({
      mode: "ITINERARY",
      pickMode: "end",
      start: sel,
      end: null,
      routeSegments: null,
      totalDistance: null,
    });
  },

  exitItinerary: () =>
    set({
      mode: "BROWSE",
      pickMode: "start",
      start: null,
      end: null,
      routeSegments: null,
      totalDistance: null,
      selectedRoom: null,
    }),

  setPickMode: (m) => set({ pickMode: m }),
  setStart: (p) => set({ start: p }),
  setEnd: (p) => set({ end: p }),

  setRoute: (segments, totalDistance) => set({ routeSegments: segments, totalDistance }),

  clearRoute: () => set({ routeSegments: null, totalDistance: null }),
}));