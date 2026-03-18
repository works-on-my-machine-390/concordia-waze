import { IndoorMapPageParams } from "@/app/(drawer)/indoor-map";
import { COLORS } from "@/app/constants";
import { isFloorPlanAvailable } from "@/app/utils/indoorMapUtils";
import {
  IndoorNavigableLocation,
  NavigationPhase,
  useNavigationStore,
} from "@/hooks/useNavigationStore";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

export default function StartNavigationButton() {
  const navigationState = useNavigationStore();
  const router = useRouter();

  const isButtonHidden = !navigationState.startLocation;
  if (isButtonHidden) return null; // hides button instead of disabling to leave space for the "Please select a start location" message.

  const isNavigationReady =
    navigationState.navigationPhase === NavigationPhase.PREPARATION &&
    !!navigationState.currentDirections &&
    !!navigationState.startLocation &&
    !!navigationState.endLocation &&
    !!navigationState.transitMode;

  // start navigation logic centralized here
  const handleStartNavigation = () => {
    if (!isNavigationReady) return;

    navigationState.setNavigationPhase(NavigationPhase.ACTIVE);
    navigationState.setCurrentStepIndex(0);
    navigationState.setStartDateTime(new Date()); // set start time to now

    const startLocation = navigationState.startLocation;

    // If the start location is an indoor location, validate that we have the floor map for it before navigating to the indoor map page.
    if ((startLocation as IndoorNavigableLocation).building) {
      const startAsIndoorLocation = startLocation as IndoorNavigableLocation;

      if (
        isFloorPlanAvailable(
          startAsIndoorLocation.building,
          startAsIndoorLocation.floor_number,
        )
      ) {
        const upcomingQueryParams: IndoorMapPageParams = {
          buildingCode: startAsIndoorLocation.building,
          selectedFloor: startAsIndoorLocation.floor_number.toString(),
          selectedPoiName: startAsIndoorLocation.name,
        };

        router.push({
          pathname: "/indoor-map",
          params: upcomingQueryParams,
        });
      }
    }
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