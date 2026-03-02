import { StyleSheet } from "react-native";

export const MapButtonStyles = StyleSheet.create({
  // position of button
  wrapper: {
    position: "absolute",
    right: 20,
  },
  // style of button
  button: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    // shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    // Android elevation
    elevation: 3,
  },
});
