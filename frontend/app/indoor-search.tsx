import { colors, SHADOW } from "@/app/styles/theme";
import { formatIndoorPoiName } from "@/app/utils/indoorNameFormattingUtils";
import IndoorPoiFilters from "@/components/indoor/IndoorPoiFilters";
import IndoorRecentSearches from "@/components/indoor/IndoorRecentSearches";
import IndoorSearchResults from "@/components/indoor/IndoorSearchResults";
import SearchPill from "@/components/shared/SearchPill";
import { useGetBuildingFloors } from "@/hooks/queries/indoorMapQueries";
import { RecentIndoorSearch, useIndoorSearch } from "@/hooks/useIndoorSearch";
import { useIndoorSearchStore } from "@/hooks/useIndoorSearchStore";
import { useIndoorNavigationStore } from "@/hooks/useIndoorNavigationStore";
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
  itineraryField?: "start" | "end";
};

export default function IndoorSearchPage() {
  const router = useRouter();
  const params = useLocalSearchParams<SearchParams>();
  const { buildingCode, buildingName, itineraryField } = params;

  const [query, setQuery] = useState("");

  const setStart = useIndoorNavigationStore((s) => s.setStart);
  const setEnd = useIndoorNavigationStore((s) => s.setEnd);
  const setCurrentFloor = useIndoorNavigationStore((s) => s.setCurrentFloor);

  useFocusEffect(
    useCallback(() => {
      setQuery("");
    }, []),
  );

  const { data, isLoading } = useGetBuildingFloors(buildingCode);
  const floors = data?.floors || [];

  const { results, recentSearches, addRecentSearch, clearRecentSearches } =
    useIndoorSearch(floors, query, buildingCode);

  const handleResultSelect = (
    roomCode: string,
    floorNumber: number,
    displayName: string,
  ) => {
    const floor = floors.find((f) => f.number === floorNumber);
    const poi = floor?.pois.find((p) => p.name === roomCode);
    if (!poi) return;

    if (itineraryField === "start" || itineraryField === "end") {
      const selectedPoint = {
        label: poi.name,
        displayLabel: displayName,
        floor: floorNumber,
        coord: {
          x: poi.position.x,
          y: poi.position.y,
        },
      };

      if (itineraryField === "start") {
        setStart(selectedPoint);
      } else {
        setEnd(selectedPoint);
      }

      setCurrentFloor(floorNumber);
      router.back();
    } else {
      router.navigate({
        pathname: "/indoor-map",
        params: {
          buildingCode: params.buildingCode,
          selectedRoom: roomCode,
          selectedFloor: floorNumber.toString(),
        },
      });
    }

    if (poi.type.toLowerCase() === "room") {
      addRecentSearch(displayName, roomCode, floorNumber);
    }
  };

  const handleRecentSearchPress = (search: RecentIndoorSearch) => {
    const floor = floors.find((f) => f.number === search.floor);

    const normalizedDisplayName = search.displayName.trim().toLowerCase();

    const poiByFormattedName = floor?.pois.find(
      (p) =>
        formatIndoorPoiName(p.name, p.type, buildingCode).trim().toLowerCase() ===
        normalizedDisplayName,
    );

    const extractedRoomCode = search.displayName
      .trim()
      .replace(new RegExp(String.raw`^${buildingCode}\s*`, "i"), "")
      .trim();

    const poiByExtractedCode =
      extractedRoomCode.length > 0
        ? floor?.pois.find(
            (p) => p.name.trim().toLowerCase() === extractedRoomCode.toLowerCase(),
          )
        : undefined;

    const poi = poiByFormattedName ?? poiByExtractedCode;

    if (poi) {
      addRecentSearch(search.displayName, poi.name, search.floor);

      if (itineraryField === "start" || itineraryField === "end") {
        const selectedPoint = {
          label: poi.name,
          displayLabel: search.displayName,
          floor: search.floor,
          coord: {
            x: poi.position.x,
            y: poi.position.y,
          },
        };

        if (itineraryField === "start") {
          setStart(selectedPoint);
        } else {
          setEnd(selectedPoint);
        }

        setCurrentFloor(search.floor);
        router.back();
      } else {
        router.navigate({
          pathname: "/indoor-map",
          params: {
            buildingCode,
            selectedRoom: poi.name,
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
      if (itineraryField === "start") {
        return `Choose start in ${buildingName}...`;
      }

      if (itineraryField === "end") {
        return `Choose destination in ${buildingName}...`;
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

          {query.trim().length === 0 && !itineraryField && (
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