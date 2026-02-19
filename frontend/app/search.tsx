import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, SHADOW } from "./styles/theme";
import {
  CampusCode,
  useGetBuildings,
} from "@/hooks/queries/buildingQueries";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/hooks/api";
import type { Building } from "@/hooks/queries/buildingQueries";
import {
  addGuestSearchHistory,
  clearGuestSearchHistory,
  getGuestSearchHistory
} from "@/hooks/guestStorage";
import { useGetUserHistory, useSaveToHistory, useClearUserHistory } from "@/hooks/queries/userHistoryQueries";
import { useGetProfile } from "@/hooks/queries/userQueries";

export default function SearchPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ campus?: string }>();
  const campus = (params.campus as string) || CampusCode.SGW;
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
  const [detailsPrefetched, setDetailsPrefetched] = useState(false);
  const [recentSearches, setRecentSearches] = useState<
    Array<{ query: string; locations: string; code?: string }>
  >([]);
  const [pendingRecent, setPendingRecent] = useState<
    { query: string; locations: string } | null
  >(null);

  // Prefetch building details for both campuses so we can search by name/code/address
  useEffect(() => {
    const list = [
      ...(sgwBuildingsQuery.data?.buildings ?? []).map((b) => ({ ...b, campus: CampusCode.SGW })),
      ...(loyBuildingsQuery.data?.buildings ?? []).map((b) => ({ ...b, campus: CampusCode.LOY })),
    ];
    if (!detailsPrefetched && list.length > 0) {
      (async () => {
        const client = await api();
        await Promise.all(
          list.map((b) =>
            queryClient.prefetchQuery({
              queryKey: ["buildingDetails", b.code],
              queryFn: async () => client.get(`/buildings/${b.code}`).json<Building>(),
              staleTime: Infinity,
            }),
          ),
        ).catch(() => void 0);
        setDetailsPrefetched(true);
      })();
    }
  }, [detailsPrefetched, sgwBuildingsQuery.data?.buildings, loyBuildingsQuery.data?.buildings, queryClient]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (userId) {
        // For authenticated users, use data from the query
        const entries = userHistoryQuery.data ?? [];
        if (active) {
          setRecentSearches(
            entries.map((item) => ({
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
          setRecentSearches(items.map((item) => ({ query: item.query, locations: item.locations })));
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
    const items: Array<{ query: string; locations: string; code?: string; campus?: CampusCode }> = [];
    for (const item of recentSearches) {
      if (seen.has(item.query)) continue;
      seen.add(item.query);

      const split = item.query.split("-");
      const candidateCode = split[0]?.trim() ?? "";
      const normalizedCode = item.code && lookup.has(item.code)
        ? item.code
        : lookup.has(candidateCode)
          ? candidateCode
          : lookup.has(item.query)
            ? item.query
            : "";
      const campus = normalizedCode ? lookup.get(normalizedCode) : undefined;

      items.push({
        ...item,
        code: normalizedCode || undefined,
        campus
      });
      if (items.length >= 6) break;
    }
    return items;
  }, [recentSearches, sgwBuildingsQuery.data?.buildings, loyBuildingsQuery.data?.buildings]);

  const results = useMemo(() => {
    // Combine buildings from both campuses, then filter by code/name/address
    const list = [
      ...(sgwBuildingsQuery.data?.buildings ?? []).map((b) => ({ ...b, campus: CampusCode.SGW })),
      ...(loyBuildingsQuery.data?.buildings ?? []).map((b) => ({ ...b, campus: CampusCode.LOY })),
    ];
    const qRaw = query.trim();
    if (!qRaw) return [];
    const q = qRaw.toLowerCase();

    return list
      .map((b) => {
        const details = queryClient.getQueryData<Building>(["buildingDetails", b.code]);
        const name = details?.name ?? undefined;
        const longName = details?.long_name ?? undefined;
        const address = details?.address ?? undefined;
        const codeMatch = b.code.toLowerCase().includes(q);
        const nameMatch = name ? name.toLowerCase().includes(q) : false;
        const longMatch = longName ? longName.toLowerCase().includes(q) : false;
        const addressMatch = address ? address.toLowerCase().includes(q) : false;
        // Simple scoring: code matches are most relevant, then name, then address
        const score = (codeMatch ? 3 : 0) + (nameMatch || longMatch ? 2 : 0) + (addressMatch ? 1 : 0);
        return { code: b.code, campus: (b as any).campus as CampusCode, name, longName, address, score, codeMatch, nameMatch, longMatch, addressMatch };
      })
      .filter((item) => item.codeMatch || item.nameMatch || item.longMatch || item.addressMatch)
      .sort((a, b) => b.score - a.score);
  }, [sgwBuildingsQuery.data?.buildings, loyBuildingsQuery.data?.buildings, query, queryClient]);

  const recordRecentSearch = async (code: string, label: string, address: string) => {
    try {
      if (userProfile?.id) {
        // For authenticated users, save to backend
        const buildingDetails = queryClient.getQueryData<Building>(["buildingDetails", code]);
        if (buildingDetails) {
          saveToHistory.mutate({
            name: buildingDetails.long_name,
            address: buildingDetails.address,
            lat: buildingDetails.latitude,
            lng: buildingDetails.longitude,
            building_code: buildingDetails.code,
            destinationType: "building"
          });
        }
      } else {
        // For guests, persist to local storage
        await addGuestSearchHistory({
          query: label,
          locations: address,
          timestamp: new Date()
        });
        setRecentSearches((prev) => [
          { query: label, locations: address },
          ...prev.filter((entry) => entry.query !== label)
        ]);
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
        const name = item.longName ?? item.name ?? "";
        if (!name) return false;
        const label = `${item.code} - ${name}`.toLowerCase();
        return name.toLowerCase() === normalized || label === normalized;
      }) ?? results[0];

    handleSelect(
      match.code,
      match.campus,
      match.longName || match.name ? `${match.code} - ${match.longName ?? match.name}` : match.code,
      match.address,
    );
    setPendingRecent(null);
  }, [pendingRecent, results]);

  const handleSelect = (
    code: string,
    targetCampus?: CampusCode,
    label?: string,
    address?: string,
  ) => {
    const resolvedCampus = targetCampus ?? (campus as CampusCode);
    // Navigate immediately to avoid UI interruptions from state updates
    router.replace({ pathname: "/map", params: { selected: code, campus: resolvedCampus } });
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

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
    <View style={styles.page}>
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => router.back()} testID="back-button">
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
      

      <FlatList
        data={results}
        keyExtractor={(item) => item.code}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={
          showRecent
            ? () => (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent searches</Text>
                    <Pressable onPress={handleClearRecent}>
                      <Text style={styles.clearText}>Clear</Text>
                    </Pressable>
                  </View>
                  {recentItems.map((item) => (
                    <Pressable
                      key={`${item.query}-${item.locations}`}
                      style={styles.resultItem}
                      onPress={() =>
                        item.code
                          ? handleSelect(item.code, item.campus ?? (campus as CampusCode), item.query, item.locations)
                          : (() => {
                              const extracted = extractCodeFromQuery(item.query);
                              if (extracted) {
                                handleSelect(extracted, campus as CampusCode, item.query, item.locations);
                                return;
                              }
                              setPendingRecent({ query: item.query, locations: item.locations });
                              setQuery(item.query);
                            })()
                      }
                    >
                      <Text style={styles.resultTitle}>
                        {item.code
                          ? (() => {
                              const details = queryClient.getQueryData<Building>([
                                "buildingDetails",
                                item.code
                              ]);
                              const name = details?.long_name ?? details?.name;
                              if (name) return `${item.code} - ${name}`;
                              if (item.query.includes(" - ")) return item.query;
                              return item.code;
                            })()
                          : item.query}
                      </Text>
                      {item.locations ? (
                        <Text style={styles.resultSubtitle}>{item.locations}</Text>
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              )
            : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.resultItem}
            onPress={() =>
              handleSelect(
                item.code,
                item.campus,
                item.longName || item.name ? `${item.code} - ${item.longName ?? item.name}` : item.code,
                item.address
              )
            }
          >
            <Text style={styles.resultTitle}>
              {item.longName || item.name
                ? `${item.code} - ${item.longName ?? item.name}`
                : item.code}
            </Text>
            {item.address ? (
              <Text style={styles.resultSubtitle}>{item.address}</Text>
            ) : null}
          </Pressable>
        )}
        ListEmptyComponent={() => {
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
        }}
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
