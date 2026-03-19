import { StyleSheet } from "react-native";
import { COLORS } from "../constants";

const NavigationBottomSheetStyles = StyleSheet.create({
  bottomSheet: {
    backgroundColor: COLORS.background,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 12,
  },

  fakeHandleContainer: {
    alignItems: "center",
    paddingVertical: 10,
    paddingTop: 8,
  },

  fakeHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: "#D1D1D6",
    borderRadius: 2,
  },

  rootContent: {
    flex: 1,
  },

  headerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  stepsScrollView: {
    flex: 1,
  },

  navModeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  transitModeTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  transitModeDuration: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  transitRow: {
    display: "flex",
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    paddingBottom: 4,
    overflow: "visible",
    minHeight: 40,
  },

  transitChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },

  transitChipSelected: {
    backgroundColor: COLORS.maroon,
  },
  transitChipDisabled: {
    backgroundColor: "#e0e0e0",
  },

  transitChipText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },

  transitChipTextSelected: {
    color: "#fff",
  },

  transitChipTextDisabled: {
    color: "#a0a0a0",
  },

  closeIcon: {
    marginLeft: 7,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  emptyStateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
  },

  emptyStateImage: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },

  emptyStateText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: COLORS.conuRed,
    textAlign: "center",
  },
  toOutdoorButton: {
    position: "absolute",
    top: -80,
    left: 10,
    zIndex: 10,
  },
});

export default NavigationBottomSheetStyles;
