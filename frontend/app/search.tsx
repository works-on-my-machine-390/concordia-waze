import SearchNearbyButton from "@/components/poi/SearchNearbyButton";
import SearchNearbySuggestions from "@/components/poi/SearchNearbySuggestions";
import {
  addGuestSearchHistory,
  clearGuestSearchHistory,
  getGuestSearchHistory,
} from "@/hooks/guestStorage";
import type {
  Building,
  BuildingListItem,
} from "@/hooks/queries/buildingQueries";
import {
  CampusCode,
  useGetAllBuildings,
  useGetBuildings,
} from "@/hooks/queries/buildingQueries";
import { POI_DEFAULT_RANK_PREFERENCE } from "@/hooks/queries/poiQueries";
import {
  useClearUserHistory,
  useGetUserHistory,
  useSaveToHistory,
} from "@/hooks/queries/userHistoryQueries";
import { useGetProfile } from "@/hooks/queries/userQueries";
import {
  ModifyingFieldOptions,
  useNavigationStore,
} from "@/hooks/useNavigationStore";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, SHADOW } from "./styles/theme";
import { filterBuildingsByQuery } from "./utils/searchUtils";
import SearchForTypeButton from "@/components/SearchForTypeButton";
import { COLORS } from "./constants";

export type SearchQueryParamsModel = {
  campus?: string;
  editMode?: "start" | "end";
} & SearchPOIQueryParamsModel;

export type SearchPOIQueryParamsModel = {
  query?: string;
  camLat?: string;
  camLng?: string;
};

export default function SearchPage() {
  const router = useRouter();
  const params = useLocalSearchParams<SearchQueryParamsModel>();
  const campus = params.campus || CampusCode.SGW;
  const editMode = params.editMode;
  const { data: userProfile } = useGetProfile();
  const userId = userProfile?.id || "";
  const saveToHistory = useSaveToHistory(userId);
  const clearUserHistory = useClearUserHistory(userId);
  const userHistoryQuery = useGetUserHistory(userId);

  const [query, setQuery] = useState("");
  // Fetch building lists for both campuses to support cross-campus search
  const sgwBuildingsQuery = useGetBuildings(CampusCode.SGW);
  const loyBuildingsQuery = useGetBuildings(CampusCode.LOY);
  const queryClient = useQueryClient();
  const [recentSearches, setRecentSearches] = useState<
    Array<{ query: string; locations: string; code?: string }>
  >([]);
  const [pendingRecent, setPendingRecent] = useState<{
    query: string;
    locations: string;
  } | null>(null);

  const allBuildingsQuery = useGetAllBuildings(true);
  const navigationState = useNavigationStore();

  useEffect(() => {
    let active = true;
    (async () => {
      if (userId) {
        // For authenticated users, use data from the query
        const entries = userHistoryQuery.data ?? [];
        if (active) {
          setRecentSearches(
            entries
              .filter(
                (item) => (item.destinationType ?? "building") === "building", // for legacy entries -> assume building if type is missing
              )
              .map((item) => ({
                query: item.name,
                locations: item.address,
                code: item.building_code || undefined,
              })),
          );
        }
      } else if (!userId) {
        // For guests, load recent searches from local storage
        const items = await getGuestSearchHistory();
        if (active) {
          setRecentSearches(
            items
              .filter(
                (item) => (item.destinationType ?? "building") === "building",
              )
              .map((item) => ({
                query: item.query,
                locations: item.locations,
              })),
          );
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [userId, userHistoryQuery.data]);

  const recentItems = useMemo(() => {
    const lookup = new Map<string, CampusCode>();
    for (const building of sgwBuildingsQuery.data?.buildings ?? []) {
      lookup.set(building.code, CampusCode.SGW);
    }
    for (const building of loyBuildingsQuery.data?.buildings ?? []) {
      lookup.set(building.code, CampusCode.LOY);
    }

    const seen = new Set<string>();
    const items: Array<{
      query: string;
      locations: string;
      code?: string;
      campus?: CampusCode;
    }> = [];
    for (const item of recentSearches) {
      if (seen.has(item.query)) continue;
      seen.add(item.query);

      const split = item.query.split("-");
      const candidateCode = split[0]?.trim() ?? "";
      let normalizedCode = "";
      if (item.code && lookup.has(item.code)) {
        normalizedCode = item.code;
      } else if (lookup.has(candidateCode)) {
        normalizedCode = candidateCode;
      } else if (lookup.has(item.query)) {
        normalizedCode = item.query;
      }
      const campus = normalizedCode ? lookup.get(normalizedCode) : undefined;

      items.push({
        ...item,
        code: normalizedCode || undefined,
        campus,
      });
      if (items.length >= 6) break;
    }
    return items;
  }, [
    recentSearches,
    sgwBuildingsQuery.data?.buildings,
    loyBuildingsQuery.data?.buildings,
  ]);

  const allBuildingsData = useMemo(() => {
    if (allBuildingsQuery.isLoading || !allBuildingsQuery.data) {
      return [];
    }
    return [
      ...allBuildingsQuery.data.buildings.SGW,
      ...allBuildingsQuery.data.buildings.LOY,
    ];
  }, [allBuildingsQuery.data]);

  const results: BuildingListItem[] = useMemo(() => {
    if (allBuildingsQuery.isLoading) {
      return [];
    }

    const allBuildings = [
      ...allBuildingsQuery.data.buildings.SGW,
      ...allBuildingsQuery.data.buildings.LOY,
    ];
    const q = query.trim().toLowerCase();

    return filterBuildingsByQuery(q, allBuildings);
  }, [query, allBuildingsQuery.data]);

  const recordRecentSearch = async (
    code: string,
    label: string,
    address: string,
  ) => {
    try {
      if (userProfile?.id) {
        // For authenticated users, save to backend
        const buildingDetails = queryClient.getQueryData<Building>([
          "buildingDetails",
          code,
        ]);
        if (buildingDetails) {
          saveToHistory.mutate({
            name: buildingDetails.long_name,
            address: buildingDetails.address,
            lat: buildingDetails.latitude,
            lng: buildingDetails.longitude,
            building_code: buildingDetails.code,
            destinationType: "building",
          });
        }
      } else {
        // For guests, persist to local storage
        await addGuestSearchHistory({
          query: label,
          locations: address,
          timestamp: new Date(),
          destinationType: "building",
        });
      }
    } catch {
      // Best effort only; search should still navigate even if persistence fails.
    }
  };

  useEffect(() => {
    if (!pendingRecent || results.length === 0) return;
    const normalized = pendingRecent.query.trim().toLowerCase();
    const match =
      results.find((item) => {
        const name = item.long_name ?? item.name ?? "";
        if (!name) return false;
        const label = `${item.code} - ${name}`.toLowerCase();
        return name.toLowerCase() === normalized || label === normalized;
      }) ?? results[0];

    handleSelect(
      match.code,
      match.campus,
      match.long_name || match.name
        ? `${match.code} - ${match.long_name ?? match.name}`
        : match.code,
      match.address,
      match.latitude && match.longitude
        ? { latitude: match.latitude, longitude: match.longitude }
        : undefined,
    );
    setPendingRecent(null);
  }, [pendingRecent, results]);

  const handleSelect = (
    code: string,
    targetCampus?: CampusCode,
    label?: string,
    address?: string,
    cameraPosition?: { latitude: number; longitude: number },
  ) => {
    const resolvedCampus = targetCampus ?? (campus as CampusCode);
    const resolvedLabel = label ?? code;
    const resolvedAddress = address ?? "";

    if (!userProfile?.id) {
      // Update local recent list before navigation unmounts this screen.
      setRecentSearches((prev) => [
        { query: resolvedLabel, locations: resolvedAddress },
        ...prev.filter((entry) => entry.query !== resolvedLabel),
      ]);
    }

    // if user in edit mode, pass the edit info back to map
    if (editMode) {
      if (
        editMode === "start" ||
        navigationState.modifyingField === ModifyingFieldOptions.start
      ) {
        navigationState.setStartLocation({
          name: label ?? code,
          latitude:
            allBuildingsData.find((r) => r.code === code)?.latitude || 0,
          longitude:
            allBuildingsData.find((r) => r.code === code)?.longitude || 0,
          code,
          address:
            address ||
            allBuildingsData.find((r) => r.code === code)?.address ||
            "",
        });
      } else if (
        editMode === "end" ||
        navigationState.modifyingField === ModifyingFieldOptions.end
      ) {
        navigationState.setEndLocation({
          name: label ?? code,
          latitude:
            allBuildingsData.find((r) => r.code === code)?.latitude || 0,
          longitude:
            allBuildingsData.find((r) => r.code === code)?.longitude || 0,
          code,
          address:
            address ||
            allBuildingsData.find((r) => r.code === code)?.address ||
            "",
        });
      }
      navigationState.setModifyingField(null);

      router.replace({
        pathname: "/map",
        params: {
          selected: code,
          campus: resolvedCampus,
          editMode: editMode,
          editValue: code,
        },
      });
    } else {
      // Navigate immediately to avoid UI interruptions from state updates

      const lat = cameraPosition?.latitude;
      const lng = cameraPosition?.longitude;

      router.replace({
        pathname: "/map",
        params: {
          selected: code,
          campus: resolvedCampus,
          camLat: lat?.toString() ?? "",
          camLng: lng?.toString() ?? "",
        },
      });
    }
    // Record the search asynchronously (non-blocking)
    void recordRecentSearch(code, label ?? code, address ?? "");
  };

  const extractCodeFromQuery = (value: string): string | null => {
    const candidate = value.split("-")[0]?.trim() ?? "";
    if (!candidate) return null;
    if (!/^[a-z0-9]{1,5}$/i.test(candidate)) return null;
    return candidate.toUpperCase();
  };

  const handleClearRecent = async () => {
    try {
      if (userId) {
        clearUserHistory.mutate(undefined, {
          onSuccess: () => {
            setRecentSearches([]);
          },
          onError: () => {
            // optional: still clear UI even if backend fails
            setRecentSearches([]);
          },
        });
        return;
      }

      await clearGuestSearchHistory();
    } finally {
      setRecentSearches([]);
    }
  };

  const showRecent = query.trim().length === 0 && recentItems.length > 0;

  const handleRecentItemPress = (item: (typeof recentItems)[0]) => {
    if (item.code) {
      const entryFromBuildingList =
        allBuildingsQuery.data?.buildings[
          item.campus ?? (campus as CampusCode)
        ]?.find((b) => b.code === item.code) ?? null;

      const latitude = entryFromBuildingList?.latitude;
      const longitude = entryFromBuildingList?.longitude;

      handleSelect(
        item.code,
        item.campus ?? (campus as CampusCode),
        item.query,
        item.locations,
        latitude && longitude ? { latitude, longitude } : undefined,
      );
    } else {
      const extracted = extractCodeFromQuery(item.query);
      if (extracted) {
        handleSelect(
          extracted,
          campus as CampusCode,
          item.query,
          item.locations,
        );
        return;
      }
      setPendingRecent({
        query: item.query,
        locations: item.locations,
      });
      setQuery(item.query);
    }
  };

  const getRecentItemTitle = (item: (typeof recentItems)[0]): string => {
    if (!item.code) return item.query;

    const details = queryClient.getQueryData<Building>([
      "buildingDetails",
      item.code,
    ]);
    const name = details?.long_name ?? details?.name;
    if (name) return `${item.code} - ${name}`;
    if (item.query.includes(" - ")) return item.query;
    return item.code;
  };

  const handleSearchNearbyPressed = (label?: string) => {
    router.push({
      pathname: "/map",
      params: {
        query: label || query.trim(),
        campus: campus as CampusCode,
        poiLat: params.camLat,
        poiLng: params.camLng,
        camLat: params.camLat,
        camLng: params.camLng,
        rankPref: POI_DEFAULT_RANK_PREFERENCE,
      },
    });
  };

  const handleSearchForRoomsPress = () => {
    router.replace({
      pathname: "/indoor-search",
      params: {},
    });
  };
  const renderHeaderComponent = () => {
    // search nearby and recent searches are mutually exclusive,
    // so nearby gets priority when query is present
    if (query.trim().length > 0 && editMode !== "start") {
      return (
        <SearchNearbyButton onPress={handleSearchNearbyPressed} query={query} />
      );
    }

    if (showRecent) {
      return (
        <View style={searchStyles.section}>
          <View style={searchStyles.sectionHeader}>
            <Text style={searchStyles.sectionTitle}>Recent searches</Text>
            <Pressable onPress={handleClearRecent}>
              <Text style={searchStyles.clearText}>Clear</Text>
            </Pressable>
          </View>
          {recentItems.map((item) => (
            <Pressable
              key={`${item.query}-${item.locations}`}
              style={searchStyles.resultItem}
              onPress={() => handleRecentItemPress(item)}
            >
              <Text style={searchStyles.resultTitle}>
                {getRecentItemTitle(item)}
              </Text>
              {item.locations ? (
                <Text style={searchStyles.resultSubtitle}>
                  {item.locations}
                </Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      );
    }
  };

  const renderEmptyComponent = () => {
    if (query.trim().length > 0)
      return (
        <View style={searchStyles.empty}>
          <Text style={searchStyles.emptyText}>No matches found</Text>
        </View>
      );

    if (showRecent) {
      return null;
    }

    return (
      <View style={searchStyles.empty}>
        <Text style={searchStyles.emptyText}>Start typing to search</Text>
      </View>
    );
  };

  const getSearchPlaceholderText = () => {
    if (
      params.editMode === "start" ||
      navigationState.modifyingField === ModifyingFieldOptions.start
    ) {
      return "Search for start location";
    } else if (
      params.editMode === "end" ||
      navigationState.modifyingField === ModifyingFieldOptions.end
    ) {
      return "Search for destination";
    }
    return "Where to…";
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <View style={searchStyles.page}>
        <View style={searchStyles.headerContainer}>
          <View style={searchStyles.header}>
            <Pressable
              style={searchStyles.iconButton}
              onPress={() => {
                router.back();
                navigationState.setModifyingField(null);
              }}
              testID="back-button"
            >
              <Ionicons name="arrow-back" size={26} color={colors.maroon} />
            </Pressable>
            <View style={searchStyles.searchPill}>
              <Ionicons name="search" size={22} color={colors.maroon} />
              <TextInput
                autoFocus
                value={query}
                onChangeText={setQuery}
                placeholder={getSearchPlaceholderText()}
                placeholderTextColor="#818181"
                style={searchStyles.searchInput}
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery("")}>
                  <Ionicons name="close-circle" size={20} color="#818181" />
                </Pressable>
              )}
            </View>
          </View>
          {!(
            editMode === "start" ||
            navigationState.modifyingField === ModifyingFieldOptions.start
          ) && <SearchNearbySuggestions onClick={handleSearchNearbyPressed} />}
          <SearchForTypeButton
            onPress={handleSearchForRoomsPress}
            label={"Looking for rooms?"}
            icon={
              <FontAwesome6
                name="door-open"
                size={24}
                color={COLORS.textMuted}
              />
            }
          />
        </View>

        <FlatList
          data={results}
          keyExtractor={(item) => item.code}
          contentContainerStyle={searchStyles.listContainer}
          ListHeaderComponent={renderHeaderComponent()}
          renderItem={({ item }) => (
            <Pressable
              style={searchStyles.resultItem}
              onPress={() =>
                handleSelect(
                  item.code,
                  item.campus,
                  item.long_name || item.name
                    ? `${item.code} - ${item.long_name ?? item.name}`
                    : item.code,
                  item.address,
                  { latitude: item.latitude, longitude: item.longitude },
                )
              }
            >
              <Text style={searchStyles.resultTitle}>
                {item.long_name || item.name
                  ? `${item.code} - ${item.long_name ?? item.name}`
                  : item.code}
              </Text>
              {item.address ? (
                <Text style={searchStyles.resultSubtitle}>{item.address}</Text>
              ) : null}
            </Pressable>
          )}
          ListEmptyComponent={renderEmptyComponent()}
        />
      </View>
    </SafeAreaView>
  );
}

export const searchStyles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    flexDirection: "column",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 26,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW,
  },
  searchPill: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: "white",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    ...SHADOW,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#111",
    paddingVertical: 0,
  },
  listContainer: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 14,
    color: colors.subText,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  clearText: {
    fontSize: 13,
    color: colors.maroon,
    fontWeight: "600",
  },
  resultItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    ...SHADOW,
  },
  resultTitle: {
    fontSize: 16,
    color: colors.text,
    fontWeight: "600",
  },
  resultSubtitle: {
    fontSize: 13,
    color: colors.subText,
    marginTop: 2,
  },
  empty: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    color: colors.subText,
  },
});
