import { colors, SHADOW } from "@/app/styles/theme";
import type { RecentIndoorSearch } from "@/hooks/useIndoorSearch";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  searches: RecentIndoorSearch[];
  onSearchPress: (search: RecentIndoorSearch) => void;
  onClearPress: () => void;
};

export default function IndoorRecentSearches({
  searches,
  onSearchPress,
  onClearPress,
}: Readonly<Props>) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent searches</Text>
        <Pressable onPress={onClearPress}>
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      </View>
      {searches.map((search, index) => (
        <Pressable
          key={`${search.displayName}-${search.floor}-${index}`}
          style={styles.resultItem}
          onPress={() => onSearchPress(search)}
        >
          <Text style={styles.resultTitle}>{search.displayName}</Text>
          <Text style={styles.resultSubtitle}>Floor {search.floor}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
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
});
