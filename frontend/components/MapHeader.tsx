import React from "react";
import { View, Text, StyleSheet, Pressable, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";


const MAROON = "#912338";
const SOFT_PINK = "#DEBDC4";

type Props = {
  campus: "SGW" | "Loyola";
  onCampusChange: (campus: "SGW" | "Loyola") => void;
  onMenuPress: () => void;
  searchText: string;
  onSearchTextChange: (t: string) => void;
};

export function MapHeader({
  campus,
  onCampusChange,
  onMenuPress,
  searchText,
  onSearchTextChange,
}: Props) {
  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.headerRow}>
        {/* menu section */}
        <Pressable style={styles.iconButton} onPress={onMenuPress}>
          <Ionicons name="menu" size={26} color={MAROON} />
        </Pressable>

        {/* search section */}
        <View style={styles.searchPill}>
          <Ionicons name="search" size={18} color={MAROON} />
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
          active={campus === "SGW"}
          onPress={() => onCampusChange("SGW")}
        />
        <CampusButton
          label="Loyola"
          active={campus === "Loyola"}
          onPress={() => onCampusChange("Loyola")}
        />
      </View>
    </View>
  );
}

function CampusButton({
  label,
  active,
  onPress,
}: {
  label: "SGW" | "Loyola";
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
    >
      <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 55, 
    left: 16,
    right: 16,
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

    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
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
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  searchIcon: { fontSize: 14 },

  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111",
    paddingVertical: 0,
  },

  chipsRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 10,
    paddingLeft: 54, 
  },

  chip: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  chipActive: {
    backgroundColor: MAROON, 
  },
  chipInactive: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },

  chipText: { fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: SOFT_PINK },
  chipTextInactive: { color: "#222" },
});
