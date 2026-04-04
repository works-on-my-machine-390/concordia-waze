import { COLORS } from "@/app/constants";
import NavigationBottomSheetStyles from "@/app/styles/navigationBottomSheetStyles";
import { MoveCameraParams, useMapCamera } from "@/contexts/MapCameraContext";
import { useMapStore } from "@/hooks/useMapStore";
import { useNavigationStore } from "@/hooks/useNavigationStore";
import MaterialCommunityIcons from "@expo/vector-icons/build/MaterialCommunityIcons";
import { Text, TouchableOpacity } from "react-native";

export default function RecenterButton() {
  const userLocation = useMapStore((state) => state.userLocation);
  const navigationState = useNavigationStore();
  const shouldHide = !userLocation || navigationState.followingGPS;
    const {moveCamera} = useMapCamera();

  if (shouldHide) {
    return null;
  }

  const handlePress = () => {
    navigationState.setFollowingGPS?.(true);
    moveCamera({
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
    } as MoveCameraParams);
  };
  return (
    <TouchableOpacity
      style={NavigationBottomSheetStyles.recenterButton}
      onPress={handlePress}
    >
      <Text style={NavigationBottomSheetStyles.recenterButtonText}>
        Recenter
      </Text>
      <MaterialCommunityIcons
        name="navigation"
        size={24}
        color={COLORS.selectionBlue}
      />
    </TouchableOpacity>
  );
}
