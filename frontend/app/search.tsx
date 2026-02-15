import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, SHADOW } from "./styles/theme";
import { CampusCode, useGetBuildings } from "@/hooks/queries/buildingQueries";
import { SafeAreaView } from "react-native-safe-area-context";


export default function SearchPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ campus?: string }>();
  const campus = (params.campus as string) || CampusCode.SGW;

  const [query, setQuery] = useState("");
  const buildingsQuery = useGetBuildings(campus);

  const results = useMemo(() => {
    // Get the building list for the campus, and filter by code based on search query
    const list = buildingsQuery.data?.buildings ?? [];
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return list
      .filter((b) => b.code.toLowerCase().includes(q))
      .map((b) => ({ code: b.code }));
  }, [buildingsQuery.data?.buildings, query]);

  const handleSelect = (code: string) => {
    // Navigate back to map when user taps on a result, to selected building
    router.replace({ pathname: "/map", params: { selected: code } });
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
          <Pressable style={styles.resultItem} onPress={() => handleSelect(item.code)}>
            <Text style={styles.resultText}>{item.code}</Text>
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
  empty: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    color: colors.subText,
  },
});
