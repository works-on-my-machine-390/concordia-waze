import { searchStyles } from "@/app/search";
import type { RecentIndoorSearch } from "@/hooks/useIndoorSearch";
import { Pressable, Text, View } from "react-native";

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
    <View style={searchStyles.section}>
      <View style={searchStyles.sectionHeader}>
        <Text style={searchStyles.sectionTitle}>Recent searches</Text>
        <Pressable onPress={onClearPress}>
          <Text style={searchStyles.clearText}>Clear</Text>
        </Pressable>
      </View>
      {searches.map((search, index) => (
        <Pressable
          key={`${search.displayName}-${search.floor}-${index}`}
          style={searchStyles.resultItem}
          onPress={() => onSearchPress(search)}
        >
          <Text style={searchStyles.resultTitle}>{search.displayName}</Text>
          <Text style={searchStyles.resultSubtitle}>Floor {search.floor}</Text>
        </Pressable>
      ))}
    </View>
  );
}
