import type { MapPolylineProps } from "react-native-maps";

import { COLORS, DIRECTION_COLORS } from "@/app/constants";
import { StyleSheet } from "react-native";

type DirectionPolylineStyle = Pick<
  MapPolylineProps,
  | "strokeColor"
  | "strokeWidth"
  | "lineDashPattern"
  | "lineCap"
  | "lineJoin"
  | "geodesic"
  | "zIndex"
>;

const basePolylineStyle: Partial<DirectionPolylineStyle> = {
  strokeWidth: 6,
  lineCap: "round",
  lineJoin: "round",
  geodesic: true,
};

export const directionPolylineStyles = {
  walking: {
    ...basePolylineStyle,
    strokeColor: DIRECTION_COLORS.walking,
    lineDashPattern: [10, 6],
    zIndex: 40,
  },
  driving: {
    ...basePolylineStyle,
    strokeColor: DIRECTION_COLORS.driving,
    zIndex: 35,
  },
  shuttle: {
    ...basePolylineStyle,
    strokeColor: DIRECTION_COLORS.shuttle,
    zIndex: 30,
  },
  transit: {
    ...basePolylineStyle,
    zIndex: 28,
  },
  bicycling: {
    ...basePolylineStyle,
    strokeColor: DIRECTION_COLORS.bicycling,
    zIndex: 33,
  },
};

export const directionStepsStyles = StyleSheet.create({
  sectionContainer: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  stepContainer: {
    flexDirection: "row",
    padding: 8,
    marginBottom: 8,
    gap: 12,
  },
  stepText: {
    maxWidth: "85%",
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  distanceDivider: {
    width: "100%",
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  distanceText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },

  placeholderStep: {
    padding: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  placeholderText: {
    color: COLORS.textMuted,
    fontSize: 16,
    textAlign: "center",
  },
  // transit steps specific styles

  checkpointText: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  checkpointContainer: {
    alignItems: "center",
    flexDirection: "row",
    padding: 8,
    gap: 12,
  },

  transitStepVerticalLine: {
    width: 6,
    height: 120,
    borderRadius: 2,
  },
  transitStepContainer: {
    flexDirection: "row",
    padding: 8,
    gap: 12,
  },
  transitLineChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 16,
  },
});
