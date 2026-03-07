import BottomSheet from "@gorhom/bottom-sheet";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/app/constants";
import { useIndoorNavigationStore } from "@/hooks/useIndoorNavigationStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export const ITINERARY_SHEET_HEIGHT = 165;

type Props = {
  buildingCode: string;
};

export default function IndoorItineraryBottomSheet({
  buildingCode,
}: Readonly<Props>) {
  const nav = useIndoorNavigationStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const snapPoints = useMemo(() => [ITINERARY_SHEET_HEIGHT], []);

  if (nav.mode !== "ITINERARY") return null;

  const canGo =
    !!buildingCode &&
    !!nav.start &&
    !!nav.end &&
    !!nav.routeSegments &&
    nav.routeSegments.length > 0 &&
    !nav.routeError;

  const handleGo = () => {
    if (!canGo) return;

    router.push({
      pathname: "/indoor-navigation",
      params: { buildingCode },
    });
  };

  const distanceLabel =
    nav.totalDistance != null ? `(${nav.totalDistance.toFixed(1)} m)` : "";

  const startFloor = nav.start?.floor ?? null;
  const endFloor = nav.end?.floor ?? null;
  const currentFloor = nav.currentFloor;

  let floorMsg = "";
  if (
    startFloor != null &&
    endFloor != null &&
    startFloor !== endFloor &&
    currentFloor != null
  ) {
    if (currentFloor === startFloor) {
      floorMsg = `Floor change needed — go to Floor ${endFloor}.`;
    } else if (currentFloor === endFloor) {
      floorMsg = `Start is on Floor ${startFloor}.`;
    } else {
      floorMsg = `Route spans Floors ${startFloor} → ${endFloor}.`;
    }
  }

  const helperText = nav.routeError
    ? nav.routeError
    : "Tap rooms on the map to set Start/End.";

  return (
    <BottomSheet
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      bottomInset={0}
      backgroundStyle={styles.sheet}
      handleIndicatorStyle={styles.handleIndicator}
      handleStyle={styles.handle}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>Walk {distanceLabel}</Text>

        <View style={styles.rightActions}>
          <Pressable
            onPress={handleGo}
            disabled={!canGo}
            style={[styles.goBtn, !canGo && styles.goBtnDisabled]}
          >
            <Text style={[styles.goText, !canGo && styles.goTextDisabled]}>
              GO
            </Text>
          </Pressable>

          <Pressable
            testID="close-itinerary"
            onPress={() => nav.exitItinerary()}
            style={styles.close}
          >
            <Ionicons name="close" size={22} color={COLORS.maroon} />
          </Pressable>
        </View>
      </View>

      <View style={styles.divider} />

      {floorMsg ? <Text style={styles.floorMsg}>{floorMsg}</Text> : null}

      <Text style={[styles.sub, nav.routeError && styles.errorSub]}>
        {helperText}
      </Text>

      <View style={{ height: Math.max(insets.bottom, 10) }} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
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

  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  title: {
    fontSize: 18,
    fontWeight: "500",
    color: "#111",
  },

  goBtn: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.maroon,
  },
  goBtnDisabled: {
    backgroundColor: "#E6E6E6",
  },
  goText: {
    color: "white",
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  goTextDisabled: {
    color: "#999",
  },

  divider: {
    height: 1,
    backgroundColor: "#CCCCCC",
    marginHorizontal: 16,
  },

  floorMsg: {
    paddingHorizontal: 16,
    paddingTop: 10,
    color: "#1E73FF",
    fontWeight: "700",
  },

  sub: {
    paddingHorizontal: 16,
    paddingTop: 12,
    color: "#666",
    fontWeight: "600",
  },

  errorSub: {
    color: "#B42318",
  },

  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
});