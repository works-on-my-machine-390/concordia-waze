import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS, TYPES } from "../../app/constants";

type Props = {
  selected: (typeof TYPES)[number] | null;
  onSelect: (type: (typeof TYPES)[number] | null) => void;
};

export default function ClassInfoTypeSelector({
  selected,
  onSelect,
}: Readonly<Props>) {
  return (
    <View style={styles.row}>
      {TYPES.map((t) => (
        <TouchableOpacity
          key={t}
          style={[styles.pill, selected === t && styles.pillActive]}
          onPress={() => onSelect(selected === t ? null : t)}
        >
          <Text
            style={[styles.pillText, selected === t && styles.pillTextActive]}
          >
            {t}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#DDD",
    backgroundColor: "#fff",
  },
  pillActive: {
    backgroundColor: COLORS.maroon,
    borderColor: COLORS.maroon,
  },
  pillText: {
    fontSize: 12,
    color: "#555",
    fontWeight: "500",
  },
  pillTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
});
