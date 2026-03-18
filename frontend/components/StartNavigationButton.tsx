import { COLORS } from "@/app/constants";
import {
  NavigationPhase,
  useNavigationStore,
} from "@/hooks/useNavigationStore";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

export default function StartNavigationButton() {
  const navigationState = useNavigationStore();

  const isNavigationReady =
    navigationState.navigationPhase === NavigationPhase.PREPARATION &&
    !!navigationState.currentDirections &&
    !!navigationState.startLocation &&
    !!navigationState.endLocation &&
    !!navigationState.transitMode;

  const handleStartNavigation = () => {
    if (!isNavigationReady) return;

    navigationState.setNavigationPhase(NavigationPhase.ACTIVE);
  };

  return (
    <TouchableOpacity
      onPress={handleStartNavigation}
      disabled={!isNavigationReady}
      style={[styles.button, !isNavigationReady && styles.disabledButton]}
    >
      <Text style={[styles.text, !isNavigationReady && styles.disabledText]}>
        Start
      </Text>
      <MaterialCommunityIcons
        name="navigation"
        size={20}
        color={isNavigationReady ? COLORS.textPrimary : COLORS.textMuted}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.conuRedLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 32,
    flexDirection: "row",
    gap: 8,
  },

  disabledButton: {
    backgroundColor: COLORS.bgDark,
  },
  text: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  disabledText: {
    color: COLORS.textMuted,
  },
});
