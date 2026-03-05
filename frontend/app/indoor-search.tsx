import { colors, SHADOW } from "@/app/styles/theme";
import { formatIndoorPoiName } from "@/app/utils/indoorNameFormattingUtils";
import IndoorPoiFilters from "@/components/indoor/IndoorPoiFilters";
import IndoorRecentSearches from "@/components/indoor/IndoorRecentSearches";
import IndoorSearchResults from "@/components/indoor/IndoorSearchResults";
import SearchPill from "@/components/shared/SearchPill";
import { useGetBuildingFloors } from "@/hooks/queries/indoorMapQueries";
import { RecentIndoorSearch, useIndoorSearch } from "@/hooks/useIndoorSearch";
import { useIndoorSearchStore } from "@/hooks/useIndoorSearchStore";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
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

  const [query, setQuery] = useState("");

  useFocusEffect(
    useCallback(() => {
      setQuery("");
    }, []),
  );

  const { data, isLoading } = useGetBuildingFloors(buildingCode);
  const floors = data?.floors || [];

  const { results, recentSearches, addRecentSearch, clearRecentSearches } =
    useIndoorSearch(floors, query, buildingCode);

  const recentItems = useMemo(() => {
    const seen = new Set<string>();
    const items: typeof recentSearches = [];

    for (const item of recentSearches) {
      const key = `${item.displayName}-${item.floor}`;

      if (seen.has(key)) continue;
      seen.add(key);

      items.push(item);
      if (items.length >= 6) break;
    }

    return items;
  }, [recentSearches]);

  const handleResultSelect = (
    roomCode: string,
    floorNumber: number,
    displayName: string,
  ) => {
    const floor = floors.find((f) => f.number === floorNumber);
    const poi = floor?.pois.find((p) => p.name === roomCode);

    router.navigate({
      pathname: "/indoor-map",
      params: {
        buildingCode: params.buildingCode,
        selectedRoom: roomCode,
        selectedFloor: floorNumber.toString(),
      },
    });

    if (poi?.type.toLowerCase() === "room") {
      addRecentSearch(displayName, roomCode, floorNumber);
    }
  };

  const handleRecentSearchPress = (search: RecentIndoorSearch) => {
    const floor = floors.find((f) => f.number === search.floor);

    const poi = floor?.pois.find(
      (p) =>
        formatIndoorPoiName(p.name, p.type, buildingCode) ===
        search.displayName,
    );

    if (poi) {
      addRecentSearch(search.displayName, poi.name, search.floor);

      router.navigate({
        pathname: "/indoor-map",
        params: {
          buildingCode,
          selectedRoom: poi.name,
          selectedFloor: search.floor.toString(),
        },
      });
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

  const showRecent = query.trim().length === 0 && recentItems.length > 0;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.page}>
          <View style={styles.header}>
            <Pressable
              style={styles.backButton}
              onPress={() => {
                router.navigate({
                  pathname: "/indoor-map",
                  params: { buildingCode: params.buildingCode },
                });
              }}
            >
              <Ionicons name="arrow-back" size={26} color={colors.maroon} />
            </Pressable>

            <SearchPill
              value={query}
              placeholder={`Search in ${buildingName}...`}
              onClear={() => setQuery("")}
              editable={true}
              onChangeText={setQuery}
              autoFocus={true}
            />
          </View>

          {/* POI Filters */}
          {query.trim().length === 0 && (
            <IndoorPoiFilters onFilterPress={handleFilterPress} />
          )}

          {/* Search content */}
          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" />
            </View>
          ) : (
            <>
              {/* Recent Searches */}
              {showRecent && (
                <IndoorRecentSearches
                  searches={recentItems}
                  onSearchPress={handleRecentSearchPress}
                  onClearPress={clearRecentSearches}
                />
              )}

              {/* Search Results */}
              {query.trim().length > 0 && (
                <IndoorSearchResults
                  results={results}
                  buildingCode={buildingCode}
                  onResultSelect={handleResultSelect}
                />
              )}

              {/* Empty */}
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
