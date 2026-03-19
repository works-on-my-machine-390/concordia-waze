import { colors, SHADOW } from "@/app/styles/theme";
import SearchPill from "@/components/shared/SearchPill";
import { MapMode, useMapStore } from "@/hooks/useMapStore";
import {
  NavigationPhase,
  useNavigationStore,
} from "@/hooks/useNavigationStore";
import { Ionicons } from "@expo/vector-icons";
import { DrawerActions } from "@react-navigation/native";
import { useNavigation } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { MenuIcon } from "../../app/icons";
import ActiveNavigationHeader from "../activeNavigation/ActiveNavigationHeader";
import AccessibilityToggle from "./AccessibilityToggle";
import IndoorItineraryHeader from "./IndoorItineraryHeader";

type Props = {
  onSearchPress: () => void;
  onBackToOutdoor: () => void;
  isAccessibilityMode: boolean;
  onAccessibilityToggle: () => void;
};

export default function IndoorMapHeader({
  onSearchPress,
  onBackToOutdoor,
  isAccessibilityMode,
  onAccessibilityToggle,
}: Readonly<Props>) {
  const navigation = useNavigation();

  const handleMenuPress = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const currentMapMode = useMapStore((state) => state.currentMode);
  const navigationPhase = useNavigationStore((state) => state.navigationPhase);

  if (
    currentMapMode === MapMode.NAVIGATION &&
    navigationPhase === NavigationPhase.PREPARATION
  ) {
    return <IndoorItineraryHeader />;
  }

  if (
    currentMapMode === MapMode.NAVIGATION &&
    navigationPhase === NavigationPhase.ACTIVE
  ) {
    return <ActiveNavigationHeader />;
  }

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.headerRow}>
        <MenuIcon onPress={handleMenuPress} color={colors.maroon} />

        <SearchPill
          placeholder="Search rooms..."
          onPress={onSearchPress}
          onClear={() => {}}
        />

        <AccessibilityToggle
          isActive={isAccessibilityMode}
          onToggle={onAccessibilityToggle}
        />
      </View>

      <Pressable style={styles.backButton} onPress={onBackToOutdoor}>
        <Ionicons name="arrow-back" size={24} color={colors.maroon} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    paddingVertical: 24,
    paddingHorizontal: 16,
    width: "100%",
    top: 40,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    ...SHADOW,
  },
});
