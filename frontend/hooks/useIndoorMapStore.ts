import { create } from "zustand";

/**
 * Zustand store for managing (most) states in the indoor-map page.
 */

interface IndoorMapPageState {}

export const useIndoorMapStore = create<IndoorMapPageState>()((set) => ({}));
