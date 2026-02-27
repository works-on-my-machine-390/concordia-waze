import { MaterialIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

export default function MetroAccessibleChip() {
  return (
    <View key="metro" style={styles.container}>
      <MaterialIcons name="subway" size={26} color="#0E4C92" />
      <Text style={styles.text}>Accessible by tunnel</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 1,
    display: "flex",
    flexDirection: "row",
    backgroundColor: "rgba(184, 219, 255, 0.65)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 24,
  },
  text: {
    fontSize: 12,
    color: "#0E4C92",
    marginTop: -4,
    textAlign: "center",
  },
});
