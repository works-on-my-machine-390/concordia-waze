import { colors, SHADOW } from "@/app/styles/theme";
import SearchPill from "@/components/shared/SearchPill";
import { Ionicons } from "@expo/vector-icons";
import { DrawerActions } from "@react-navigation/native";
import { useNavigation } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { MenuIcon } from "../../app/icons";

type Props = {
  onSearchPress: () => void;
  onBackToOutdoor: () => void;
};

export default function IndoorMapHeader({
  onSearchPress,
  onBackToOutdoor,
}: Readonly<Props>) {
  const navigation = useNavigation();

  const handleMenuPress = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.headerRow}>
        <MenuIcon onPress={handleMenuPress} color={colors.maroon} />

        <SearchPill
          placeholder="Search rooms..."
          onPress={onSearchPress}
          onClear={() => {}}
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
