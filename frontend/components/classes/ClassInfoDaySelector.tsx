import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../../app/constants";
import { DAYS } from "../../app/utils/dateUtils";

type Props = {
  selected: (typeof DAYS)[number] | null;
  onSelect: (day: (typeof DAYS)[number] | null) => void;
};

export default function ClassInfoDaySelector({
  selected,
  onSelect,
}: Readonly<Props>) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.row}>
        {DAYS.map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.dayPill, selected === d && styles.pillActive]}
            onPress={() => onSelect(selected === d ? null : d)}
          >
            <Text
              style={[styles.pillText, selected === d && styles.pillTextActive]}
            >
              {d}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
  },
  dayPill: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#DDD",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
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
