import { MapQueryParamsModel } from "@/app/(drawer)/map";
import {
  PoiSearchResultModel,
  TextSearchRankPreferenceType,
  useGetNearbyPoi,
} from "@/hooks/queries/poiQueries";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useRef } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { BottomSheetStyles } from "../BuildingBottomSheet";
import PoiSearchBottomSheetHeader from "./PoiSearchBottomSheetHeader";
import PoiSearchRankPreferenceFilter from "./PoiSearchRankPreferenceFilter";
import PoiSearchResult from "./PoiSearchResult";
import { getDistance } from "@/app/utils/mapUtils";
import { COLORS } from "@/app/constants";

export type PoiSearchBottomSheetProps = {
  onClose?: () => void;
  moveCamera?: (params: { latitude: number; longitude: number }) => void;
  onDirectionsPress: (result: PoiSearchResultModel) => void;
  userLocation?: {
    latitude: number;
    longitude: number;
  };
};

export type ExtendedPoiSearchResultModel = {
  distanceFromUser: number;
} & PoiSearchResultModel;

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
    params.rankPref,
  );

  const results: ExtendedPoiSearchResultModel[] = useMemo(() => {
    if (poiSearchQuery.isLoading || !poiSearchQuery.data) {
      return [];
    }

    const resultsWithDistances = poiSearchQuery.data.data.map((result) => {
      if (!props.userLocation) {
        return {
          ...result,
          distanceFromUser: 0,
        };
      }

      const distance = getDistance(
        { latitude: result.latitude, longitude: result.longitude },
        {
          latitude: props.userLocation?.latitude,
          longitude: props.userLocation?.longitude,
        },
      );
      return {
        ...result,
        distanceFromUser: distance,
      };
    });
    if (params.rankPref === TextSearchRankPreferenceType.RELEVANCE) {
      return resultsWithDistances;
    }
    const sortedResults = resultsWithDistances.sort((a, b) => a.distanceFromUser - b.distanceFromUser);
    return sortedResults;
  }, [poiSearchQuery.data, poiSearchQuery.isLoading, props.userLocation]);

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

  const performRefetch = () => {
    poiSearchQuery.refetch();
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

      <PoiSearchBottomSheetHeader onClose={props.onClose} />

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
            minHeight: 52,
            paddingVertical: 4,
            overflow: "visible",
          }}
        >
          <PoiSearchRankPreferenceFilter onChange={performRefetch} />
        </ScrollView>
      </View>

      <BottomSheetScrollView
        style={{ ...BottomSheetStyles.scrollContent, zIndex: 1, elevation: 1 }}
      >
        {poiSearchQuery.isLoading && (
          <View style={{ padding: 16 }}>
            <ActivityIndicator size="large" color={COLORS.poiMarkerBlue} />
          </View>
        )}
        {results?.map((result) => (
          <PoiSearchResult
            isDistanceAvailable={!!props.userLocation}
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
