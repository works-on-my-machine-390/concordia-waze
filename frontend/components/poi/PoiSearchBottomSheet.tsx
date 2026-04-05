import { MapQueryParamsModel } from "@/app/(drawer)/map";
import { COLORS } from "@/app/constants";
import { poiFilterStyles } from "@/app/styles/poi/poiStyle";
import { getDistanceInMeters } from "@/app/utils/mapUtils";
import {
  PoiSearchResultModel,
  TextSearchRankPreferenceType,
  useGetNearbyPoi,
} from "@/hooks/queries/poiQueries";
import { MapMode, useMapStore } from "@/hooks/useMapStore";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { BottomSheetStyles } from "../BuildingBottomSheet";
import PoiSearchBottomSheetHeader from "./PoiSearchBottomSheetHeader";
import PoiSearchRankPreferenceFilter from "./PoiSearchRankPreferenceFilter";
import PoiSearchResult from "./PoiSearchResult";
import {
  NavigationPhase,
  useNavigationStore,
} from "@/hooks/useNavigationStore";
import useStartLocation from "@/hooks/useStartLocation";

export type PoiSearchBottomSheetProps = {
  moveCamera?: (params: { latitude: number; longitude: number }) => void;
  onSheetIndexChange?: (index: number) => void;
};

export type ExtendedPoiSearchResultModel = {
  distanceFromUserInMeters: number; // in meters
} & PoiSearchResultModel;

export default function PoiSearchBottomSheet(
  props: Readonly<PoiSearchBottomSheetProps>,
) {
  const { findAndSetStartLocation } = useStartLocation();
  const { closeSheet, userLocation, setCurrentMode } = useMapStore();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = ["20%", "70%"];
  const navigationState = useNavigationStore();

  const params = useLocalSearchParams<MapQueryParamsModel>();
  const router = useRouter();

  const poiSearchQuery = useGetNearbyPoi(
    params.query,
    Number.parseFloat(params.poiLat),
    Number.parseFloat(params.poiLng),
    params.rankPref,
  );

  const handleSheetChanges = useCallback((index: number) => {
    props.onSheetIndexChange?.(index);
  }, [props.onSheetIndexChange]);

  const handleSheetAnimate = useCallback(
    (_fromIndex: number, toIndex: number) => {
      props.onSheetIndexChange?.(toIndex);
    },
    [props.onSheetIndexChange],
  );

  const results: ExtendedPoiSearchResultModel[] = useMemo(() => {
    if (poiSearchQuery.isLoading || !poiSearchQuery.data) {
      return [];
    }

    const resultsWithDistances = poiSearchQuery.data.data.map((result) => {
      if (!userLocation) {
        return {
          ...result,
          distanceFromUserInMeters: 0,
        };
      }

      const distance = getDistanceInMeters(
        { latitude: result.latitude, longitude: result.longitude },
        {
          latitude: userLocation?.coords?.latitude,
          longitude: userLocation?.coords?.longitude,
        },
      );
      return {
        ...result,
        distanceFromUserInMeters: distance,
      };
    });
    if (params.rankPref === TextSearchRankPreferenceType.RELEVANCE) {
      return resultsWithDistances;
    }
    const sortedResults = [...resultsWithDistances].sort(
      (a, b) => a.distanceFromUserInMeters - b.distanceFromUserInMeters,
    );
    return sortedResults;
  }, [poiSearchQuery.data, poiSearchQuery.isLoading, userLocation]);

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
    setCurrentMode(MapMode.NAVIGATION);

    const endLocation = {
      latitude: result.latitude,
      longitude: result.longitude,
      name: result.name,
      code: "", // no code as it's not a concordia building
    }

    if (!navigationState.startLocation) {
      findAndSetStartLocation(endLocation);
    }
    navigationState.setEndLocation(endLocation);
    navigationState.setNavigationPhase(NavigationPhase.PREPARATION);
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
      enableContentPanningGesture
      enableDynamicSizing={false}
      onChange={handleSheetChanges}
      onAnimate={handleSheetAnimate}
      detached
      backgroundStyle={[BottomSheetStyles.bottomSheet]}
      containerStyle={{ overflow: "visible" }}
    >
      <View style={BottomSheetStyles.fakeHandleContainer}>
        <View style={BottomSheetStyles.fakeHandleBar} />
      </View>

      <PoiSearchBottomSheetHeader
        onClose={() => {
          router.setParams({
            query: "",
            poiLat: undefined,
            poiLng: undefined,
          });
          closeSheet();
        }}
      />

      <View style={{ zIndex: 1000, elevation: 1000 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled={true}
          style={{ overflow: "visible" }}
          contentContainerStyle={poiFilterStyles.filterScrollView}
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
            isDistanceAvailable={!!userLocation}
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
