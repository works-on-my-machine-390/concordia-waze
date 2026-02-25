import { useGetNearbyPoi } from "@/hooks/queries/poiQueries";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useLocalSearchParams } from "expo-router";
import { useMemo, useRef } from "react";
import { Text, View } from "react-native";
import { BottomSheetStyles } from "./BuildingBottomSheet";
import PoiSearchResult from "./PoiSearchResult";
import { MapPOIQueryParamsModel } from "@/app/(drawer)/map";

export type PoiSearchBottomSheetProps = {
  onClose?: () => void;
};

export default function PoiSearchBottomSheet(
  props: Readonly<PoiSearchBottomSheetProps>,
) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = ["20%", "70%"];

  const params = useLocalSearchParams<MapPOIQueryParamsModel>();

  const poiSearchQuery = useGetNearbyPoi(
    params.query,
    Number.parseFloat(params.camLat),
    Number.parseFloat(params.camLng),
  );

  const results = useMemo(() => {
    if (poiSearchQuery.isLoading || !poiSearchQuery.data) {
      return [];
    }

    return poiSearchQuery.data.data;
  }, [poiSearchQuery.data, poiSearchQuery.isLoading]);

  return (
    <BottomSheet
      handleComponent={null}
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={props.onClose}
      enableContentPanningGesture
      enableDynamicSizing={false}
      detached
      backgroundStyle={BottomSheetStyles.bottomSheet}
      containerStyle={{ overflow: "visible" }}
    >
      <View style={BottomSheetStyles.fakeHandleContainer}>
        <View style={BottomSheetStyles.fakeHandleBar} />
      </View>

      <View style={BottomSheetStyles.headerContainer}>
        <View style={BottomSheetStyles.textContainer}>
          <Text style={BottomSheetStyles.name}>Nearby results</Text>
        </View>
      </View>

      <BottomSheetScrollView style={BottomSheetStyles.scrollContent}>
        {results.map((result) => (
          <PoiSearchResult key={result.code} result={result} />
        ))}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
