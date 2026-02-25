import {
  PoiSearchResultModel,
  useGetNearbyPoi,
} from "@/hooks/queries/poiQueries";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useRef } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { BottomSheetStyles } from "../BuildingBottomSheet";
import PoiSearchResult from "./PoiSearchResult";
import { MapPOIQueryParamsModel } from "@/app/(drawer)/map";
import { CloseIcon } from "@/app/icons";
import PoiSearchDistanceFilter from "./PoiSearchDistanceFilter";
import PoiSearchRankPreferenceFilter from "./PoiSearchRankPreferenceFilter";
import PoiSearchRefetchButton from "./PoiSearchRefetchButton";

export type PoiSearchBottomSheetProps = {
  onClose?: () => void;
  moveCamera?: (params: { latitude: number; longitude: number }) => void;
  onDirectionsPress: (result: PoiSearchResultModel) => void;
};

export default function PoiSearchBottomSheet(
  props: Readonly<PoiSearchBottomSheetProps>,
) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = ["20%", "70%"];

  const params = useLocalSearchParams<MapPOIQueryParamsModel>();
  const router = useRouter();

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

  const handleResultPressed = (result: PoiSearchResultModel) => {
    router.setParams({
      camLat: result.latitude,
      camLng: result.longitude,
    });
    props.moveCamera?.({
      latitude: result.latitude,
      longitude: result.longitude,
    });
  };

  const handleDirectionsPressed = (result: PoiSearchResultModel) => {
    props.onDirectionsPress(result);
  };

  return (
    <BottomSheet
      handleComponent={null}
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      onClose={props.onClose}
      enableContentPanningGesture
      enableDynamicSizing={false}
      detached
      backgroundStyle={[BottomSheetStyles.bottomSheet]}
      containerStyle={{ overflow: "visible" }}
    >
      <View style={BottomSheetStyles.fakeHandleContainer}>
        <View style={BottomSheetStyles.fakeHandleBar} />
      </View>

      <View
        style={[
          BottomSheetStyles.headerContainer,
          {
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
          },
        ]}
      >
        <View style={BottomSheetStyles.textContainer}>
          <Text style={BottomSheetStyles.name}>Nearby results</Text>
        </View>

        <TouchableOpacity
          onPress={props.onClose}
          style={BottomSheetStyles.closeIcon}
        >
          <CloseIcon size={28} />
        </TouchableOpacity>
      </View>
      {/*filters toolbar  */}
      <View
        style={{ display: "flex", flexDirection: "row", paddingHorizontal: 16 }}
      >
        <PoiSearchRankPreferenceFilter />
        <PoiSearchDistanceFilter />
        <PoiSearchRefetchButton />
      </View>

      <BottomSheetScrollView style={{ ...BottomSheetStyles.scrollContent }}>
        {results.map((result) => (
          <PoiSearchResult
            key={result.code}
            result={result}
            onPress={handleResultPressed}
            onDirectionsPress={handleDirectionsPressed}
          />
        ))}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
