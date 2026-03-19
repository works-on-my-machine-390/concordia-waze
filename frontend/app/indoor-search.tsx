import { colors, SHADOW } from "@/app/styles/theme";
import { formatIndoorPoiName } from "@/app/utils/indoorNameFormattingUtils";
import IndoorPoiFilters from "@/components/indoor/IndoorPoiFilters";
import IndoorRecentSearches from "@/components/indoor/IndoorRecentSearches";
import IndoorSearchResults from "@/components/indoor/IndoorSearchResults";
import SearchPill from "@/components/shared/SearchPill";
import { useGetAllBuildings } from "@/hooks/queries/buildingQueries";
import {
  PointOfInterest,
  useGetBuildingFloors,
} from "@/hooks/queries/indoorMapQueries";
import { RecentIndoorSearch, useIndoorSearch } from "@/hooks/useIndoorSearch";
import { useIndoorSearchStore } from "@/hooks/useIndoorSearchStore";
import {
  ModifyingFieldOptions,
  useNavigationStore,
} from "@/hooks/useNavigationStore";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type SearchParams = {
  buildingCode: string;
  buildingName: string;
};

export default function IndoorSearchPage() {
  const router = useRouter();
  const params = useLocalSearchParams<SearchParams>();
  const { buildingCode, buildingName } = params;
  const navigationState = useNavigationStore();

  const [query, setQuery] = useState("");

  useFocusEffect(
    useCallback(() => {
      setQuery("");
    }, []),
  );

  const buildingListQuery = useGetAllBuildings(true);
  const allFloors = Object.values(buildingListQuery.data?.buildings || {})
    .flat()
    .flatMap((building) =>
      building.floors?.map((floor) => ({
        ...floor,
        building: building.code,
        latitude: building.latitude,
        longitude: building.longitude,
      })),
    )
    .filter((floor) => !!floor);
  const { data, isLoading } = useGetBuildingFloors(buildingCode);
  const floors = data?.floors || [];

  const { results, recentSearches, addRecentSearch, clearRecentSearches } =
    useIndoorSearch(allFloors, query, buildingCode);

  const updateNavigationModifyingField = (
    poi: PointOfInterest,
    displayName: string,
  ) => {
    if (!navigationState.modifyingField) return; // extra guard

    const selectedLocation = {
      name: displayName,
      code: poi.building,
      indoor_position: {
        x: poi.position.x,
        y: poi.position.y,
      },
      building: poi.building,
      floor_number: poi.floor_number,
      latitude: poi.latitude,
      longitude: poi.longitude,
    };

    if (navigationState.modifyingField === ModifyingFieldOptions.start) {
      navigationState.setStartLocation(selectedLocation);
    } else if (navigationState.modifyingField === ModifyingFieldOptions.end) {
      navigationState.setEndLocation(selectedLocation);
    }
    navigationState.setModifyingField(null);

    router.push({
      pathname: "/map",

      params: {
        camLat: poi.latitude,
        camLng: poi.longitude,
      },
    });
  };

  const handleResultSelect = (poi: PointOfInterest, displayName: string) => {
    if (!poi) return;

    if (navigationState.modifyingField) {
      updateNavigationModifyingField(poi, displayName);
      return;
    } else {
      router.navigate({
        pathname: "/indoor-map",
        params: {
          buildingCode: poi.building,
          selectedPoiName: poi.name,
          selectedFloor: poi.floor_number.toString(),
        },
      });
    }

    if (poi.type.toLowerCase() === "room") {
      addRecentSearch(displayName, poi.name, poi.floor_number);
    }
  };

  const handleRecentSearchPress = (search: RecentIndoorSearch) => {
    const floor = floors.find((f) => f.number === search.floor);

    const normalizedDisplayName = search.displayName.trim().toLowerCase();

    const poiByFormattedName = floor?.pois.find(
      (p) =>
        formatIndoorPoiName(p.name, p.type, buildingCode)
          .trim()
          .toLowerCase() === normalizedDisplayName,
    );

    const extractedRoomCode = search.displayName
      .trim()
      .replace(new RegExp(String.raw`^${buildingCode}\s*`, "i"), "")
      .trim();

    const poiByExtractedCode =
      extractedRoomCode.length > 0
        ? floor?.pois.find(
            (p) =>
              p.name.trim().toLowerCase() === extractedRoomCode.toLowerCase(),
          )
        : undefined;

    const poi = poiByFormattedName ?? poiByExtractedCode;

    if (poi) {
      addRecentSearch(search.displayName, poi.name, search.floor);

      if (navigationState.modifyingField) {
        updateNavigationModifyingField(poi, search.displayName);
      } else {
        router.navigate({
          pathname: "/indoor-map",
          params: {
            buildingCode,
            selectedPoiName: poi.name,
            selectedFloor: search.floor.toString(),
          },
        });
      }
    } else {
      setQuery(search.displayName);
    }
  };

  const handleFilterPress = (type: string, label: string) => {
    useIndoorSearchStore.getState().setSelectedPoiFilter(type, label);
    router.navigate({
      pathname: "/indoor-map",
      params: { buildingCode: params.buildingCode },
    });
  };

  const showRecent = query.trim().length === 0 && recentSearches.length > 0;

  const searchPlaceholder = (() => {
    if (!buildingName) {
      return "Search for indoor locations...";
    }

    return `Search in ${buildingName}...`;
  })();
  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.page}>
          <View style={styles.header}>
            <Pressable
              testID="indoor-search-back-button"
              style={styles.backButton}
              onPress={() => {
                router.back();
              }}
            >
              <Ionicons name="arrow-back" size={26} color={colors.maroon} />
            </Pressable>

            <SearchPill
              value={query}
              placeholder={searchPlaceholder}
              onClear={() => setQuery("")}
              editable={true}
              onChangeText={setQuery}
              autoFocus={true}
            />
          </View>

          {query.trim().length === 0 && !navigationState.modifyingField && (
            <IndoorPoiFilters onFilterPress={handleFilterPress} />
          )}

          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" />
            </View>
          ) : (
            <>
              {showRecent && (
                <IndoorRecentSearches
                  searches={recentSearches}
                  onSearchPress={handleRecentSearchPress}
                  onClearPress={clearRecentSearches}
                />
              )}

              {query.trim().length > 0 && (
                <IndoorSearchResults
                  results={results}
                  buildingCode={buildingCode}
                  onResultSelect={handleResultSelect}
                />
              )}

              {!showRecent && query.trim().length === 0 && (
                <View style={styles.center}>
                  <Text style={styles.emptyText}>Start typing to search</Text>
                </View>
              )}
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyText: {
    color: colors.subText,
    fontSize: 16,
  },
});
