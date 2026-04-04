import { COLORS } from "@/app/constants";
import NavigationBottomSheetStyles from "@/app/styles/navigationBottomSheetStyles";
import { useNavigationStore } from "@/hooks/useNavigationStore";
import MaterialCommunityIcons from "@expo/vector-icons/build/MaterialCommunityIcons";
import { Text, TouchableOpacity } from "react-native";

export default function RecenterButton() {
  const navigationState = useNavigationStore();
  const shouldHide = navigationState.followingGPS;

  if (shouldHide) {
    return null;
  }

  const handlePress = () => {};
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
