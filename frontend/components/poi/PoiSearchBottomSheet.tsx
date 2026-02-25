import {
  MapPOIQueryParamsModel,
  MapQueryParamsModel,
} from "@/app/(drawer)/map";
import {
  POI_LOCATION_CHANGE_THRESHOLD_IN_DEGREES,
  PoiSearchResultModel,
  useGetNearbyPoi,
} from "@/hooks/queries/poiQueries";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { BottomSheetStyles } from "../BuildingBottomSheet";
import PoiSearchBottomSheetHeader from "./PoiSearchBottomSheetHeader";
import PoiSearchDistanceFilter from "./PoiSearchDistanceFilter";
import PoiSearchRankPreferenceFilter from "./PoiSearchRankPreferenceFilter";
import PoiSearchResult from "./PoiSearchResult";

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

  const params = useLocalSearchParams<MapQueryParamsModel>();
  const router = useRouter();

  const poiSearchQuery = useGetNearbyPoi(
    params.query,
    Number.parseFloat(params.poiLat),
    Number.parseFloat(params.poiLng),
    params.maxDist ? Number.parseInt(params.maxDist) : undefined,
    params.rankPref,
  );

  const [currentParams, setCurrentParams] =
    useState<MapQueryParamsModel>(params);

  const areParamsDifferent = useMemo(() => {

    const roundedLatDiff = Math.abs(
      Number.parseFloat(currentParams.poiLat) -
        Number.parseFloat(params.camLat),
    );
    const roundedLngDiff = Math.abs(
      Number.parseFloat(currentParams.poiLng) -
        Number.parseFloat(params.camLng),
    );
    const isLocationDifferent =
      roundedLatDiff > POI_LOCATION_CHANGE_THRESHOLD_IN_DEGREES ||
      roundedLngDiff > POI_LOCATION_CHANGE_THRESHOLD_IN_DEGREES;

    return (
      currentParams.query !== params.query ||
      isLocationDifferent ||
      currentParams.maxDist !== params.maxDist ||
      currentParams.rankPref !== params.rankPref
    );
  }, [params]);

  const handleUpdateParams = () => {
    if (!areParamsDifferent) return;
    setCurrentParams({...params, poiLat: params.camLat, poiLng: params.camLng});
    router.setParams({
      poiLat: params.camLat,
      poiLng: params.camLng,
    });
    poiSearchQuery.refetch();
  };

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

      <PoiSearchBottomSheetHeader
        onClose={props.onClose}
        areParamsDifferent={areParamsDifferent}
        onUpdateParams={handleUpdateParams}
      />

      {/*filters toolbar  */}
      <View style={{ zIndex: 1000, elevation: 1000 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled={true}
          style={{ overflow: "visible" }}
          contentContainerStyle={{
            display: "flex",
            flexDirection: "row",
            paddingHorizontal: 16,
            gap: 10,
            minHeight: 64,
            paddingVertical: 8,
            overflow: "visible",
          }}
        >
          <PoiSearchRankPreferenceFilter />
          <PoiSearchDistanceFilter />
        </ScrollView>
      </View>

      <BottomSheetScrollView
        style={{ ...BottomSheetStyles.scrollContent, zIndex: 1, elevation: 1 }}
      >
        {results?.map((result) => (
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
