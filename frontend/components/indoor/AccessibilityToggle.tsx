import { COLORS } from "@/app/constants";
import { WheelchairIcon } from "@/app/icons";
import { useRef } from "react";
import { Animated, Pressable, StyleSheet, Text } from "react-native";

interface AccessibilityToggleProps {
  isActive: boolean;
  onToggle: () => void;
  isNavigationBottomSheet?: boolean; // for overriding styling
}

export default function AccessibilityToggle({
  isActive,
  onToggle,
  isNavigationBottomSheet,
}: Readonly<AccessibilityToggleProps>) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.88,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 130,
        useNativeDriver: true,
      }),
    ]).start();
    onToggle();
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={
        isActive ? "Disable accessibility mode" : "Enable accessibility mode"
      }
      accessibilityState={{ checked: isActive }}
    >
      <Animated.View
        style={[
          styles.button,
          isActive && styles.buttonActive,
          isNavigationBottomSheet && {
            paddingHorizontal: 10,
            paddingVertical: 8,
            ...noShadow,
          },
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <WheelchairIcon
          size={isNavigationBottomSheet ? 20 : 22}
          color={isActive ? COLORS.surface : COLORS.accessibilityIcon}
        />
        {isActive && <Text style={styles.activeLabel}>Accessible</Text>}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: COLORS.accessibilityIcon,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  buttonActive: {
    backgroundColor: COLORS.accessibilityIcon,
    borderColor: COLORS.accessibilityIcon,
  },
  activeLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.surface,
    letterSpacing: 0.2,
  },
});

const noShadow = {
  shadowColor: null,
  shadowOpacity: null,
  shadowRadius: null,
  shadowOffset: null,
  elevation: 0,
};
