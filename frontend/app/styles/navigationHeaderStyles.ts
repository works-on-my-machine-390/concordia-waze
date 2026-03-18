import { StyleSheet } from "react-native";
import { COLORS } from "../constants";

export const navigationHeaderStyles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 1000,
    marginTop: 10,
  },

  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },

  locationsContainer: {
    paddingVertical: 4,
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconContainer: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },

  dotsConnector: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },

  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#CCCCCC",
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#CCCCCC",
    marginLeft: 12,
  },

  endDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.maroon,
  },

  connectingLine: {
    width: 2,
    height: 20,
    backgroundColor: "#CCCCCC",
    marginLeft: 15,
    marginVertical: 2,
  },

  locationTextContainer: {
    flex: 1,
    marginLeft: 10,
    paddingVertical: 2,
  },

  locationLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 1,
  },

  locationText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
});
