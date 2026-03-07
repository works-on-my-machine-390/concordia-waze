/** Persists the user's accessibility preference for indoor navigation */

import { create } from "zustand";

interface AccessibilityModeStore {
  isAccessibilityMode: boolean;
  toggleAccessibilityMode: () => void;
  setAccessibilityMode: (value: boolean) => void;
}

export const useAccessibilityMode = create<AccessibilityModeStore>((set) => ({
  isAccessibilityMode: false,
  toggleAccessibilityMode: () =>
    set((state) => ({ isAccessibilityMode: !state.isAccessibilityMode })),
  setAccessibilityMode: (value: boolean) =>
    set({ isAccessibilityMode: value }),
}));