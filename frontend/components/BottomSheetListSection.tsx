import { COLORS } from "@/app/constants";
import { StyleSheet, Text, View } from "react-native";
export default function BottomSheetListSection({
  title,
  items,
}: Readonly<{
  title: string;
  items: string[];
}>) {
  const hasItems = items?.length > 0;
  return (
    // Reusable list section
    <View style={ListSectionStyles.listContainer}>
      <Text style={ListSectionStyles.listTitle}>{title}</Text>

      {!hasItems && (
        <Text style={[ListSectionStyles.listItem, { fontStyle: "italic" }]}>
          No information available
        </Text>
      )}
      {hasItems &&
        items.map((item) => (
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
