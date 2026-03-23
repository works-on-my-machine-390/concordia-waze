import { colors, SHADOW } from "@/app/styles/theme";
import type { IndoorSearchResult } from "@/hooks/useIndoorSearch";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { formatIndoorPoiName } from "../../app/utils/indoorNameFormattingUtils";
import { PointOfInterest } from "@/hooks/queries/indoorMapQueries";

type Props = {
  results: IndoorSearchResult[];
  buildingCode: string;
  onResultSelect: (
    poi: PointOfInterest,
    displayName: string,
  ) => void;
};

export default function IndoorSearchResults({
  results,
  buildingCode,
  onResultSelect,
}: Readonly<Props>) {
  return (
    <FlatList
      data={results}
      keyExtractor={(item, index) =>
        `${item.poi.name}-${item.floor.number}-${index}`
      }
      contentContainerStyle={styles.listContainer}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      renderItem={({ item }) => {
        const poiBuildingCode = item.poi.building ?? buildingCode;
        const displayName = formatIndoorPoiName(
          item.poi.name,
          item.poi.type,
          poiBuildingCode,
        );

        return (
          <Pressable
            style={styles.resultItem}
            onPress={() =>
              onResultSelect(item.poi, displayName)
            }
          >
            <Text style={styles.resultTitle}>{displayName}</Text>
            <Text style={styles.resultSubtitle}>
              {`${poiBuildingCode} - Floor ${item.floor.number}`}
            </Text>
          </Pressable>
        );
      }}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>No rooms or POIs found</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
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
