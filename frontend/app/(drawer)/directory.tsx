import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../constants";
import { DirectoryIcon } from "../icons";
import { useGetAllBuildings, BuildingListItem } from "../../hooks/queries/buildingQueries";

export default function Directory() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // Connected to backend /buildings/list endpoint
  const { data: buildingsData, isLoading, error } = useGetAllBuildings();

  // Filter buildings based on search query
  const filteredBuildings = useMemo(() => {
    if (!buildingsData?.buildings) return { SGW: [], LOY: [] };

    const query = searchQuery.toLowerCase().trim();

    if (!query) {
      return buildingsData.buildings;
    }

    const filterList = (buildings: BuildingListItem[]) =>
      buildings.filter(
        (building) =>
          building.name.toLowerCase().includes(query) ||
          building.long_name.toLowerCase().includes(query) ||
          building.code.toLowerCase().includes(query)
      );

    return {
      SGW: filterList(buildingsData.buildings.SGW || []),
      LOY: filterList(buildingsData.buildings.LOY || []),
    };
  }, [buildingsData, searchQuery]);

  const handleBuildingPress = (buildingCode: string) => {
    router.push(`/map?selectedBuilding=${buildingCode}`);
  };

  const renderBuilding = ({ item }: { item: BuildingListItem }) => (
    <Pressable
      style={({ pressed }) => [
        styles.buildingItem,
        pressed && styles.buildingItemPressed,
      ]}
      onPress={() => handleBuildingPress(item.code)}
    >
      <View style={styles.buildingCodeContainer}>
        <Text style={styles.buildingCode}>{item.code}</Text>
      </View>
      <View style={styles.buildingInfo}>
        <Text style={styles.buildingName}>{item.long_name}</Text>
        <Text style={styles.buildingShortName}>{item.name}</Text>
      </View>
    </Pressable>
  );

  const renderCampusSection = (campus: "SGW" | "LOY") => {
    const buildings = filteredBuildings[campus];

    if (!buildings || buildings.length === 0) return null;

    return (
      <View key={campus} style={styles.campusSection}>
        <Text style={styles.campusHeader}>
          {campus === "SGW" ? "Sir George Williams Campus" : "Loyola Campus"}
        </Text>
        <FlatList
          data={buildings}
          renderItem={renderBuilding}
          keyExtractor={(item) => item.code}
          scrollEnabled={false}
        />
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.maroon} />
          <Text style={styles.loadingText}>Loading buildings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Failed to load buildings. Please try again.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalResults =
    (filteredBuildings.SGW?.length || 0) + (filteredBuildings.LOY?.length || 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <DirectoryIcon size={32} color={COLORS.maroon} />
        <Text style={styles.headerTitle}>Building Directory</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or code (e.g., MB, John Molson)"
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Results count while searching */}
      {searchQuery.length > 0 && (
        <Text style={styles.resultsCount}>
          {totalResults} {totalResults === 1 ? "building" : "buildings"} found
        </Text>
      )}

      {/* Building List grouped by campus */}
      <FlatList
        data={["SGW", "LOY"]}
        renderItem={({ item }) => renderCampusSection(item as "SGW" | "LOY")}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No buildings found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your search</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginLeft: 12,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchInput: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  resultsCount: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: "italic",
  },
  listContent: {
    paddingBottom: 20,
  },
  campusSection: {
    marginTop: 16,
  },
  campusHeader: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.maroon,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.conuRedLight,
  },
  buildingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  buildingItemPressed: {
    backgroundColor: COLORS.background,
  },
  buildingCodeContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: COLORS.maroon,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  buildingCode: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
  },
  buildingInfo: {
    flex: 1,
  },
  buildingName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  buildingShortName: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    textAlign: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
});