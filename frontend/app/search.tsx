import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, SHADOW } from "./styles/theme";
import { CampusCode, useGetBuildings } from "@/hooks/queries/buildingQueries";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/hooks/api";
import type { Building } from "@/hooks/queries/buildingQueries";


export default function SearchPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ campus?: string }>();
  const campus = (params.campus as string) || CampusCode.SGW;

  const [query, setQuery] = useState("");
  // Fetch building lists for both campuses to support cross-campus search
  const sgwBuildingsQuery = useGetBuildings(CampusCode.SGW);
  const loyBuildingsQuery = useGetBuildings(CampusCode.LOY);
  const queryClient = useQueryClient();
  const [detailsPrefetched, setDetailsPrefetched] = useState(false);

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

  const handleSelect = (code: string, targetCampus: CampusCode) => {
    // Navigate back to map (to selected building) when user taps on a result
    router.replace({ pathname: "/map", params: { selected: code, campus: targetCampus } });
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
    <View style={styles.page}>
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => router.back()}>
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
        renderItem={({ item }) => (
          <Pressable style={styles.resultItem} onPress={() => handleSelect(item.code, item.campus)}>
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
        ListEmptyComponent={
          query.trim()
            ? () => (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>No matches found</Text>
                </View>
              )
            : () => (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>Start typing to search</Text>
                </View>
              )
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
  resultItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    ...SHADOW,
  },
  resultText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: "600",
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
