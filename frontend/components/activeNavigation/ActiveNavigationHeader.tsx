import { activeNavigationHeaderStyles } from "@/app/styles/navigationHeaderStyles";
import { usePathname } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ActiveNavigationIndoorHeaderContent from "./ActiveNavigationIndoorHeaderContent";
import ActiveNavigationOutdoorHeaderContent from "./ActiveNavigationOutdoorHeaderContent";
import {
  getDirectionsSequence,
  useNavigationStore,
} from "@/hooks/useNavigationStore";

export default function ActiveNavigationHeader() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  const navigationState = useNavigationStore();

  const sequence = getDirectionsSequence(
    navigationState.currentDirections?.directionBlocks,
  );

  return (
    <View
      style={[
        activeNavigationHeaderStyles.container,
        { paddingTop: insets.top },
      ]}
    >
      {pathname === "/indoor-map" && <ActiveNavigationIndoorHeaderContent />}
      {pathname === "/map" && <ActiveNavigationOutdoorHeaderContent />}
    </View>
  );
}
