import type { Floor } from "@/hooks/queries/indoorMapQueries";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  floors: Floor[];
  selectedFloor: number;
  onSelectFloor: (floorNumber: number) => void;
};

export default function FloorSelector({
  floors,
  selectedFloor,
  onSelectFloor,
}: Readonly<Props>) {
  if (floors.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {floors.map((floor) => (
        <TouchableOpacity
          key={floor.number}
          style={[
            styles.floorButton,
            selectedFloor === floor.number && styles.floorButtonActive,
          ]}
          onPress={() => onSelectFloor(floor.number)}
        >
          <Text
            style={[
              styles.floorButtonText,
              selectedFloor === floor.number && styles.floorButtonTextActive,
            ]}
          >
            {floor.number}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 24,
    left: 16,
    gap: 12,
    zIndex: 10,
  },
  floorButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E5E5E5",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  floorButtonActive: {
    backgroundColor: "#912338",
  },
  floorButtonText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
  },
  floorButtonTextActive: {
    color: "#fff",
  },
});
