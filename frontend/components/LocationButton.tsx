import React from "react";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface LocationButtonProps {
  onPress: () => void; // function to go to current location
  bottomPositionPercentage?: number; // optional prop to adjust bottom position of the button
}

export default function LocationButton({
  onPress,
  bottomPositionPercentage = 10,
}: Readonly<LocationButtonProps>) {
  return (
    <View
      style={[
        MapButtonStyles.wrapper,
        { bottom: `${bottomPositionPercentage}%` as any },
      ]}
    >
      {/* Adds fade (opacity) effect on press */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Go to my location"
        onPress={onPress}
        style={MapButtonStyles.button}
        activeOpacity={0.8}
      >
        {/* GPS crosshairs icon */}
        <MaterialCommunityIcons
          name="crosshairs-gps"
          size={30}
          color="#1f2937"
        />
      </TouchableOpacity>
    </View>
  );
}

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
