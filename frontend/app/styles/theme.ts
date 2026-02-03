/* 
Design system exporting color palette, spacing scale, border radii, and typography sizes used throughout the app for consistent styling.
*/

import { StyleSheet } from "react-native";

export const colors = {
  background: "#f5f3f3",
  surface: "#ffffff",
  maroon: "#8A2B36",
  maroonDark: "#6b1f2a",
  accent: "#c64a54",
  inputError: "#d32f2f",
  text: "#222222",
  subText: "#6d7074",
  muted: "#bfb8b8",
  shadow: "#000000",
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 36,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 18,
};

export const typography = {
  headingXL: 32,
  headingL: 22,
  body: 16,
  label: 14,
};

export default { colors, spacing, radii, typography };