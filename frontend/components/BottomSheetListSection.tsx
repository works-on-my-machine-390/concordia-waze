import { COLORS } from "@/app/constants";
import { StyleSheet, Text, View } from "react-native";
export default function BottomSheetListSection({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    // Reusable list section
    <View style={ListSectionStyles.listContainer}>
      <Text style={ListSectionStyles.listTitle}>{title}</Text>
      {items.map((item) => (
        <Text key={item} style={ListSectionStyles.listItem}>
          {item}
        </Text>
      ))}
    </View>
  );
}

export function ExpandableListSection({
    title, items, isExpanded, onToggle
}: {
    title: string;
    items: string[];
    isExpanded: boolean;
    onToggle: () => void;
}) {
    
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
