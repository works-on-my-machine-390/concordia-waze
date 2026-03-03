import BottomSheet from "@gorhom/bottom-sheet";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/app/constants";
import { useIndoorNavigationStore } from "@/hooks/useIndoorNavigationStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const ITINERARY_SHEET_HEIGHT = 140; // used by FloorSelector offset

export default function IndoorItineraryBottomSheet() {
  const nav = useIndoorNavigationStore();
  const insets = useSafeAreaInsets();

  // fixed height like mockup
  const snapPoints = useMemo(() => [ITINERARY_SHEET_HEIGHT], []);

  if (nav.mode !== "ITINERARY") return null;

  return (
    <BottomSheet
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      detached
      bottomInset={Math.max(insets.bottom, 8)}
      backgroundStyle={styles.sheet}
      containerStyle={styles.sheetContainer}
      handleIndicatorStyle={styles.handleIndicator}   // ✅ shows the small grab bar
      handleStyle={styles.handle}                     // ✅ small top padding
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>
          Walk{" "}
{     nav.totalDistance != null ? `(${nav.totalDistance.toFixed(1)} m)` : ""}        </Text>

        <Pressable onPress={() => nav.exitItinerary()} style={styles.close}>
          <Ionicons name="close" size={22} color={COLORS.maroon} />
        </Pressable>
      </View>

      <View style={styles.divider} />

      <Text style={styles.sub}>Tap rooms on the map to set Start/End.</Text>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetContainer: {
    overflow: "visible",
    // ✅ sheet should be UNDER the floor selector
    zIndex: 50,
    elevation: 50,
  },
  sheet: {
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 10,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },

  handle: {
    paddingTop: 8,
  },
  handleIndicator: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#BDBDBD",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    justifyContent: "space-between",
  },
  title: {
    fontSize: 18,
    fontWeight: "500",
    color: "#111",
  },
  divider: {
    height: 1,
    backgroundColor: "#CCCCCC",
    marginHorizontal: 16,
  },
  sub: {
    paddingHorizontal: 16,
    paddingTop: 12,
    color: "#666",
    fontWeight: "600",
  },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
});