import {
  addGuestSearchHistory,
  clearGuestSearchHistory,
  getGuestSearchHistory,
} from "@/hooks/guestStorage";
import type { Building } from "@/hooks/queries/buildingQueries";
import {
  CampusCode,
  useGetAllBuildings,
  useGetBuildings,
} from "@/hooks/queries/buildingQueries";
import {
  useClearUserHistory,
  useGetUserHistory,
  useSaveToHistory,
} from "@/hooks/queries/userHistoryQueries";
import { useGetProfile } from "@/hooks/queries/userQueries";
import { Ionicons } from "@expo/vector-icons";
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

type RecentItem = {
  query: string;
  locations: string;
  code?: string;
  campus?: CampusCode;
};

type SearchResult = {
  code: string;
  campus: CampusCode;
  longName?: string;
  name?: string;
  address?: string;
};

type RecentDisplayItem = RecentItem & { title: string };

const getCampusFromParam = (campus?: string): CampusCode => {
  if (campus === CampusCode.LOY) return CampusCode.LOY;
  return CampusCode.SGW;
};

const getResultLabel = (code: string, longName?: string, name?: string) => {
  const resolvedName = longName ?? name;
  if (!resolvedName) return code;
  return `${code} - ${resolvedName}`;
};

const getNormalizedRecentCode = (
  item: { query: string; code?: string },
  lookup: Map<string, CampusCode>,
): string => {
  if (item.code && lookup.has(item.code)) {
    return item.code;
  }

  const candidateCode = item.query.split("-")[0]?.trim() ?? "";
  if (lookup.has(candidateCode)) {
    return candidateCode;
  }

  if (lookup.has(item.query)) {
    return item.query;
  }

  return "";
};

function RecentSearchesSection({
  items,
  onClear,
  onPressItem,
}: Readonly<{
  items: RecentDisplayItem[];
  onClear: () => void;
  onPressItem: (item: RecentDisplayItem) => void;
}>) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent searches</Text>
        <Pressable onPress={onClear}>
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      </View>
      {items.map((item) => (
        <Pressable
          key={`${item.query}-${item.locations}`}
          style={styles.resultItem}
          onPress={() => onPressItem(item)}
        >
          <Text style={styles.resultTitle}>{item.title}</Text>
          {item.locations ? (
            <Text style={styles.resultSubtitle}>{item.locations}</Text>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

function SearchResultRow({
  item,
  onPressItem,
}: Readonly<{
  item: SearchResult;
  onPressItem: (item: SearchResult) => void;
}>) {
  return (
    <Pressable style={styles.resultItem} onPress={() => onPressItem(item)}>
      <Text style={styles.resultTitle}>
        {getResultLabel(item.code, item.longName, item.name)}
      </Text>
      {item.address ? (
        <Text style={styles.resultSubtitle}>{item.address}</Text>
      ) : null}
    </Pressable>
  );
}

function EmptyState({
  query,
  showRecent,
}: Readonly<{
  query: string;
  showRecent: boolean;
}>) {
  if (query.trim()) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No matches found</Text>
      </View>
    );
  }

  if (showRecent) {
    return null;
  }

  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>Start typing to search</Text>
    </View>
  );
}

export default function SearchPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    campus?: string;
    editMode?: string;
    preserveEnd?: string;
    preserveStart?: string;
  }>();

  const campus = getCampusFromParam(params.campus);
  const editMode = params.editMode as "start" | "end" | undefined;

  const { data: userProfile } = useGetProfile();
  const userId = userProfile?.id || "";
  const saveToHistory = useSaveToHistory(userId);
  const clearUserHistory = useClearUserHistory(userId);
  const userHistoryQuery = useGetUserHistory(userId);

  const [query, setQuery] = useState("");
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

  const allBuildingsQuery = useGetAllBuildings();

  useEffect(() => {
    let active = true;

    (async () => {
      if (userId) {
        const entries = userHistoryQuery.data ?? [];
        if (!active) return;

        setRecentSearches(
          entries.map((item) => ({
            query: item.name,
            locations: item.address,
            code: item.building_code || undefined,
          })),
        );
        return;
      }

      const items = await getGuestSearchHistory();
      if (!active) return;

      setRecentSearches(
        items.map((item) => ({
          query: item.query,
          locations: item.locations,
        })),
      );
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
    const items: RecentItem[] = [];

    for (const item of recentSearches) {
      if (seen.has(item.query)) continue;
      seen.add(item.query);

      const normalizedCode = getNormalizedRecentCode(item, lookup);
      const resolvedCampus = normalizedCode
        ? lookup.get(normalizedCode)
        : undefined;

      items.push({
        ...item,
        code: normalizedCode || undefined,
        campus: resolvedCampus,
      });

      if (items.length >= 6) break;
    }

    return items;
  }, [
    recentSearches,
    sgwBuildingsQuery.data?.buildings,
    loyBuildingsQuery.data?.buildings,
  ]);

  const results = useMemo<SearchResult[]>(() => {
    if (allBuildingsQuery.isLoading || !allBuildingsQuery.data) {
      return [];
    }

    const allBuildings = [
      ...allBuildingsQuery.data.buildings.SGW,
      ...allBuildingsQuery.data.buildings.LOY,
    ];
    const q = query.trim().toLowerCase();

    return filterBuildingsByQuery(q, allBuildings);
  }, [query, allBuildingsQuery.data, allBuildingsQuery.isLoading]);

  const recordRecentSearch = async (
    code: string,
    label: string,
    address: string,
  ) => {
    try {
      if (userProfile?.id) {
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

        return;
      }

      await addGuestSearchHistory({
        query: label,
        locations: address,
        timestamp: new Date(),
      });

      setRecentSearches((prev) => [
        { query: label, locations: address },
        ...prev.filter((entry) => entry.query !== label),
      ]);
    } catch {
      // Best effort only.
    }
  };

  const handleSelect = (
    code: string,
    targetCampus?: CampusCode,
    label?: string,
    address?: string,
  ) => {
    const resolvedCampus = targetCampus ?? campus;

    if (editMode) {
      router.replace({
        pathname: "/map",
        params: {
          selected: code,
          campus: resolvedCampus,
          editMode,
          editValue: code,
          preserveEnd: params.preserveEnd || "",
          preserveStart: params.preserveStart || "",
        },
      });
    } else {
      router.replace({
        pathname: "/map",
        params: { selected: code, campus: resolvedCampus },
      });
    }

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
          onSuccess: () => setRecentSearches([]),
          onError: () => setRecentSearches([]),
        });
        return;
      }

      await clearGuestSearchHistory();
    } finally {
      setRecentSearches([]);
    }
  };

  const handleSearchResultPress = (item: SearchResult) => {
    handleSelect(
      item.code,
      item.campus,
      getResultLabel(item.code, item.longName, item.name),
      item.address,
    );
  };

  const handleRecentItemPress = (item: RecentDisplayItem) => {
    if (item.code) {
      handleSelect(
        item.code,
        item.campus ?? campus,
        item.query,
        item.locations,
      );
      return;
    }

    const extracted = extractCodeFromQuery(item.query);
    if (extracted) {
      handleSelect(extracted, campus, item.query, item.locations);
      return;
    }

    setPendingRecent({
      query: item.query,
      locations: item.locations,
    });
    setQuery(item.query);
  };

  useEffect(() => {
    if (!pendingRecent || results.length === 0) return;

    const normalized = pendingRecent.query.trim().toLowerCase();
    const match =
      results.find((item) => {
        const name = item.longName ?? item.name ?? "";
        if (!name) return false;

        const label = `${item.code} - ${name}`.toLowerCase();
        return name.toLowerCase() === normalized || label === normalized;
      }) ?? results[0];

    handleSelect(
      match.code,
      match.campus,
      getResultLabel(match.code, match.longName, match.name),
      match.address,
    );
    setPendingRecent(null);
  }, [pendingRecent, results]);

  const recentDisplayItems = useMemo<RecentDisplayItem[]>(() => {
    return recentItems.map((item) => {
      if (!item.code) {
        return { ...item, title: item.query };
      }

      const details = queryClient.getQueryData<Building>([
        "buildingDetails",
        item.code,
      ]);
      const name = details?.long_name ?? details?.name;

      let title = item.code;
      if (name) {
        title = `${item.code} - ${name}`;
      } else if (item.query.includes(" - ")) {
        title = item.query;
      }

      return { ...item, title };
    });
  }, [recentItems, queryClient]);

  const showRecent = query.trim().length === 0 && recentDisplayItems.length > 0;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <View style={styles.page}>
        <View style={styles.header}>
          <Pressable
            style={styles.iconButton}
            onPress={() => router.back()}
            testID="back-button"
          >
            <Ionicons name="arrow-back" size={26} color={colors.maroon} />
          </Pressable>
          <View style={styles.searchPill}>
            <Ionicons name="search" size={22} color={colors.maroon} />
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="Where to…"
              placeholderTextColor="#818181"
              style={styles.searchInput}
            />
          </View>
        </View>

        <FlatList<SearchResult>
          data={results}
          keyExtractor={(item) => item.code}
          contentContainerStyle={styles.listContainer}
          ListHeaderComponent={
            showRecent ? (
              <RecentSearchesSection
                items={recentDisplayItems}
                onClear={handleClearRecent}
                onPressItem={handleRecentItemPress}
              />
            ) : null
          }
          renderItem={({ item }) => (
            <SearchResultRow
              item={item}
              onPressItem={handleSearchResultPress}
            />
          )}
          ListEmptyComponent={
            <EmptyState query={query} showRecent={showRecent} />
          }
        />
      </View>
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
