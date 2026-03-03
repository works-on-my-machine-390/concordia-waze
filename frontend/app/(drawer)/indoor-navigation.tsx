import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, View, Pressable, Text } from "react-native";
import IndoorMapContainer from "@/components/indoor/IndoorMapContainer";
import { useIndoorNavigationStore } from "@/hooks/useIndoorNavigationStore";
import { COLORS } from "@/app/constants";

export default function IndoorNavigationPage() {
  const router = useRouter();
  const { buildingCode } = useLocalSearchParams<{ buildingCode?: string }>();

  const nav = useIndoorNavigationStore();

  return (
    <View style={styles.container}>
      <IndoorMapContainer
        buildingCode={buildingCode ?? ""}
        routeSegments={nav.routeSegments}
        preferredFloorNumber={nav.start?.floor ?? null}
      />

      {/* simple back for now */}
      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: "relative" },

  backBtn: {
    position: "absolute",
    top: 60,
    left: 16,
    backgroundColor: "white",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 6,
  },
  backText: {
    color: COLORS.maroon,
    fontWeight: "800",
  },
});