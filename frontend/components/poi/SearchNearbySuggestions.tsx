import { COLORS } from "@/app/constants";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Pressable, StyleSheet, Text } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

type IconName = React.ComponentProps<typeof FontAwesome>["name"];

interface Suggestion {
  label: string;
  iconName: IconName;
}

type SearchNearbySuggestionsProps = {
  onClick: (label: string) => void;
};
export default function SearchNearbySuggestions({
  onClick,
}: Readonly<SearchNearbySuggestionsProps>) {
  const suggestions: Suggestion[] = [
    {
      label: "Coffee",
      iconName: "coffee",
    },
    {
      label: "Library",
      iconName: "book",
    },
    {
      label: "Food",
      iconName: "cutlery",
    },
    {
      label: "Hotel",
      iconName: "bed",
    },
    {
      label: "Shopping",
      iconName: "shopping-cart",
    },
    {
      label: "Washroom",
      iconName: "bath",
    },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginTop: 12, paddingHorizontal: 12 }}
    >
      {suggestions.map((suggestion) => (
        <Pressable
          key={suggestion.label}
          style={styles.chip}
          onPress={() => onClick(suggestion.label)}
        >
          <FontAwesome
            name={suggestion.iconName}
            size={16}
            color={COLORS.textPrimary}
          />
          <Text style={{ color: COLORS.textPrimary }}>{suggestion.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bgDark,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    marginRight: 8,
    gap: 8,
  },
});
