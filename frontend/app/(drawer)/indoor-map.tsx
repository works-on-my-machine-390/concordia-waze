import IndoorMapContainer from "@/components/indoor/IndoorMapContainer";
import IndoorMapHeader from "@/components/indoor/IndoorMapHeader";
import IndoorItineraryHeader from "@/components/indoor/IndoorItineraryHeader";
import IndoorItineraryBottomSheet, {
  ITINERARY_SHEET_HEIGHT,
} from "@/components/indoor/IndoorItineraryBottomSheet";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { GetDirectionsIcon } from "@/app/icons";
import { useIndoorItineraryController } from "@/hooks/useIndoorItineraryController";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function IndoorMapPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{ buildingCode?: string }>();
  const buildingCode = params.buildingCode ?? "";

  const ctrl = useIndoorItineraryController(buildingCode);

  const handleBackToOutdoor = () => router.push("/map");

  return (
    <View style={styles.container}>
      <IndoorMapContainer
        buildingCode={buildingCode}
        routeSegments={ctrl.routeSegments}
        onPickPoint={ctrl.mode === "ITINERARY" ? ctrl.onPickPoint : undefined}
        preferredFloorNumber={
          ctrl.mode === "ITINERARY" ? ctrl.start?.floor ?? null : null
        }
        floorSelectorBottomOffset={
          ctrl.mode === "ITINERARY"
            ? ITINERARY_SHEET_HEIGHT + Math.max(insets.bottom, 8) + 24
            : 24
        }
      />

      {ctrl.mode === "ITINERARY" ? (
        <IndoorItineraryHeader />
      ) : (
        <IndoorMapHeader
          searchText={""}
          onSearchPress={() => {}}
          onSearchClear={() => {}}
          onBackToOutdoor={handleBackToOutdoor}
        />
      )}

      {ctrl.mode === "BROWSE" ? (
        <TouchableOpacity
          style={[
            styles.floatingIcon,
            {
              right: 16,
              bottom: Math.max(insets.bottom, 12) + 110,
            },
          ]}
          onPress={ctrl.enterItinerary}
          activeOpacity={0.85}
        >
          <GetDirectionsIcon size={90} color={"#912338"} />
        </TouchableOpacity>
      ) : null}

      <IndoorItineraryBottomSheet />
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