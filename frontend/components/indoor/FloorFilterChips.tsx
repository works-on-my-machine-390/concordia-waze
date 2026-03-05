import { COLORS } from "@/app/constants";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  availableFloors: number[];
  selectedFloor: number | null;
  onSelectFloor: (floor: number | null) => void;
};

export default function FloorFilterChips({
  availableFloors,
  selectedFloor,
  onSelectFloor,
}: Readonly<Props>) {
  if (availableFloors.length <= 1) return null;

  return (
    <View style={styles.filterContainer}>
      <Text style={styles.filterLabel}>Filter by floor:</Text>
      <View style={styles.floorChips}>
        <Pressable
          style={[
            styles.floorChip,
            selectedFloor === null && styles.floorChipActive,
          ]}
          onPress={() => onSelectFloor(null)}
        >
          <Text
            style={[
              styles.floorChipText,
              selectedFloor === null && styles.floorChipTextActive,
            ]}
          >
            All
          </Text>
        </Pressable>
        {availableFloors.map((floorNum) => (
          <Pressable
            key={floorNum}
            style={[
              styles.floorChip,
              selectedFloor === floorNum && styles.floorChipActive,
            ]}
            onPress={() => onSelectFloor(floorNum)}
          >
            <Text
              style={[
                styles.floorChipText,
                selectedFloor === floorNum && styles.floorChipTextActive,
              ]}
            >
              {floorNum}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  filterContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  floorChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  floorChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#F0F0F0",
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  floorChipActive: {
    backgroundColor: COLORS.maroon,
    borderColor: COLORS.maroon,
  },
  floorChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  floorChipTextActive: {
    color: "white",
  },
});
