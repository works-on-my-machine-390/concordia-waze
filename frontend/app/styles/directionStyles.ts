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
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
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
  checkpointIconContainer: {
    minWidth: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  checkpointTextWithMaxWidth: {
    maxWidth: "80%",
  },

  transitStepVerticalLine: {
    width: 6,
    height: 120,
    borderRadius: 2,
  },
  transitStepVerticalLineContainer: {
    minWidth: 40,
    alignItems: "center",
  },
  transitStepContainer: {
    flexDirection: "row",
    padding: 8,
    gap: 12,
  },
  transitStepContentContainer: {
    flex: 1,
    height: 100,
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  transitStepRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  transitStepMainInfoContainer: {
    height: "100%",
    justifyContent: "center",
  },
  transitStepLineInfoRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  transitLineChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 16,
  },
  mutedText: {
    color: COLORS.textMuted,
  },
  walkingStepLineContainer: {
    alignItems: "center",
    width: 40,
    height: 100,
    marginTop: -8,
  },
  walkingStepContentContainer: {
    flex: 1,
    height: 100,
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  walkingStepRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  walkingStepMainInfoContainer: {
    maxWidth: "80%",
  },
  walkingStepTextFullWidth: {
    maxWidth: "100%",
  },
  indoorStepContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 16,
  },
});

export const getTransitStepVerticalLineColorStyle = (color?: string) => ({
  backgroundColor: color || DIRECTION_COLORS.transit,
});

export const getTransitLineChipColorsStyle = (
  lineColor?: string,
  textColor?: string,
) => ({
  backgroundColor: lineColor || DIRECTION_COLORS.transit,
  color: textColor || COLORS.textPrimary,
});
