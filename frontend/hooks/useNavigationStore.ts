import { create } from "zustand";

/**
 * Zustand store for managing states during navigation.
 */

export type NavigableLocation = {
  latitude: number;
  longitude: number;
  name: string;
  code?: string;
  address?: string;
};

interface NavigationState {
  startLocation?: NavigableLocation;
  setStartLocation: (location: NavigableLocation) => void;
  endLocation?: NavigableLocation;
  setEndLocation: (location: NavigableLocation) => void;
}

export const useNavigationStore = create<NavigationState>()((set) => ({
  startLocation: undefined,
  setStartLocation: (location: NavigableLocation) =>
    set({ startLocation: location }),
  endLocation: undefined,
  setEndLocation: (location: NavigableLocation) =>
    set({ endLocation: location }),
}));
