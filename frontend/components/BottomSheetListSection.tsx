import { COLORS } from "@/app/constants";
import { StyleSheet, Text, View } from "react-native";

type BottomSheetListSectionProps = {
  title: string;
  items: string[];
};

export default function ListSection(
  props: Readonly<BottomSheetListSectionProps>,
) {
  const hasItems = props.items?.length > 0;

  return (
    <View style={ListSectionStyles.listContainer}>
      <Text style={ListSectionStyles.listTitle}>{props.title}</Text>
      {!hasItems && (
        <Text style={[ListSectionStyles.listItem, { fontStyle: "italic" }]}>
          No information available
        </Text>
      )}

      {hasItems &&
        props.items.map((item) => (
          <Text key={item} style={ListSectionStyles.listItem}>
            {item}
          </Text>
        ))}
    </View>
  );
}

export const ListSectionStyles = StyleSheet.create({
  listContainer: {
    marginBottom: 20,
    backgroundColor: "#f2f2f2",
    padding: 10,
    width: "100%",
    borderRadius: 8,
  },

  listTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
    color: COLORS.textPrimary,
  },

  listItem: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
});
