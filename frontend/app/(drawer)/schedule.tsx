import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AddIcon } from "../icons";
import { COLORS } from "../constants";

export default function Schedule() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Schedule</Text>
        <TouchableOpacity
          onPress={() => router.push({ pathname: "/add-class", params: { prev: "schedule" } })}
        >
          <AddIcon size={45} color={COLORS.maroon} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
});