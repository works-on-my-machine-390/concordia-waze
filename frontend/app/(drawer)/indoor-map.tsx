import IndoorMapContainer from "@/components/indoor/IndoorMapContainer";
import IndoorMapHeader from "@/components/indoor/IndoorMapHeader";
import IndoorItineraryHeader from "@/components/indoor/IndoorItineraryHeader";
import IndoorItineraryBottomSheet, {
  ITINERARY_SHEET_HEIGHT,
} from "@/components/indoor/IndoorItineraryBottomSheet";

import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { GetDirectionsIcon } from "@/app/icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIndoorItineraryController } from "@/hooks/useIndoorItineraryController";
import { useIndoorNavigationStore } from "@/hooks/useIndoorNavigationStore";

export default function IndoorMapPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{ buildingCode?: string }>();
  const buildingCode = params.buildingCode ?? "";

  // controller now just fetches route when start+end exist
  const ctrl = useIndoorItineraryController(buildingCode);

  //store used for selection + entering itinerary from selected room
  const nav = useIndoorNavigationStore();

  const handleBackToOutdoor = () => router.push("/map");

  const showItineraryButton =
    nav.mode === "BROWSE" && nav.selectedRoom != null;

  return (
    <View style={styles.container}>
      <IndoorMapContainer
        buildingCode={buildingCode}
        routeSegments={ctrl.routeSegments}
        preferredFloorNumber={
          nav.mode === "ITINERARY" ? nav.start?.floor ?? null : null
        }
        floorSelectorBottomOffset={
          nav.mode === "ITINERARY"
            ? ITINERARY_SHEET_HEIGHT + Math.max(insets.bottom, 8) + 24
            : 24
        }
      />

      {nav.mode === "ITINERARY" ? (
        <IndoorItineraryHeader />
      ) : (
        <IndoorMapHeader
          searchText={""}
          onSearchPress={() => {}}
          onSearchClear={() => {}}
          onBackToOutdoor={handleBackToOutdoor}
        />
      )}

      {/*show only after user selected a room (browse mode) */}
      {showItineraryButton ? (
        <TouchableOpacity
          style={[
            styles.floatingIcon,
            {
              right: 16,
              bottom: Math.max(insets.bottom, 12) + 110,
            },
          ]}
          onPress={nav.enterItineraryFromSelected}
          activeOpacity={0.85}
        >
          <GetDirectionsIcon size={90} color={"#912338"} />
        </TouchableOpacity>
      ) : null}

      <IndoorItineraryBottomSheet buildingCode={buildingCode} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: "relative" },
  floatingIcon: {
    position: "absolute",
    zIndex: 300,
    elevation: 300,
    borderRadius: 20,
    padding: 6,
  },
});