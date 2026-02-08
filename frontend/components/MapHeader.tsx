import { CampusCode } from "@/hooks/queries/buildingQueries";
import { Ionicons } from "@expo/vector-icons";
import { DrawerActions } from "@react-navigation/native";
import { useNavigation } from "expo-router";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, SHADOW } from "../app/styles/theme";

type Props = Readonly<{
  campus: CampusCode;
  onCampusChange: (campus: CampusCode) => void;
  onMenuPress?: () => void;
  searchText: string;
  onSearchTextChange: (t: string) => void;
}>;

export function MapHeader({
  campus,
  onCampusChange,
  onMenuPress,
  searchText,
  onSearchTextChange,
}: Props) {
  const navigation = useNavigation();

  const handleMenuButtonPress = () => {
    navigation.dispatch(DrawerActions.openDrawer());

    onMenuPress?.();
  };

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.headerRow}>
        {/* menu section */}
        <Pressable style={styles.iconButton} onPress={handleMenuButtonPress}>
          <Ionicons name="menu" size={26} color={colors.maroon} />
        </Pressable>

        {/* search section */}
        <View style={styles.searchPill}>
          <Ionicons name="search" size={26} color={colors.maroon} />
          <TextInput
            value={searchText}
            onChangeText={onSearchTextChange}
            placeholder="Where to…"
            placeholderTextColor="#818181"
            style={styles.searchInput}
          />
        </View>
      </View>

      {/* campus selection sections */}
      <View style={styles.chipsRow}>
        <CampusButton
          label="SGW"
          active={campus === CampusCode.SGW}
          onPress={() => onCampusChange(CampusCode.SGW)}
        />
        <CampusButton
          label="Loyola"
          active={campus === CampusCode.LOY}
          onPress={() => onCampusChange(CampusCode.LOY)}
        />
      </View>
    </View>
  );
}

function CampusButton({
  label,
  active,
  onPress,
}: Readonly<{
  label: "SGW" | "Loyola";
  active: boolean;
  onPress: () => void;
}>) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active ? styles.chipActive : styles.chipInactive,
        pressed && styles.chipPressed,
      ]}
    >
      <Text
        style={[
          styles.chipText,
          active ? styles.chipTextActive : styles.chipTextInactive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    paddingVertical: 24,
    paddingHorizontal: 16,
    width: "100%",
    top: 40, // need to test on different devices (gap from top of screen))
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 26,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW,
  },

  iconText: {
    fontSize: 18,
  },

  searchPill: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: "white",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    ...SHADOW,
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#111",
    paddingVertical: 0,
  },

  chipsRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    ...SHADOW,
  },

  chip: {
    height: 34,
    width: 80,
    paddingHorizontal: 14,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  chipPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },

  chipActive: {
    backgroundColor: colors.maroon,
  },

  chipInactive: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },

  chipText: { fontSize: 16, fontWeight: "700" },
  chipTextActive: { color: colors.pink },
  chipTextInactive: { color: "#222" },
});
