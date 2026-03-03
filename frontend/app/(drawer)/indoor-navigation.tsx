import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, View, Pressable } from "react-native";
import IndoorMapContainer from "@/components/indoor/IndoorMapContainer";
import { useIndoorNavigationStore } from "@/hooks/useIndoorNavigationStore";
import { COLORS } from "@/app/constants";
import { Ionicons } from "@expo/vector-icons";

export default function IndoorNavigationPage() {
  const router = useRouter();
  const { buildingCode } =
    useLocalSearchParams<{ buildingCode?: string }>();

  const nav = useIndoorNavigationStore();

  const handleBack = () => {
    router.replace({
      pathname: "/(drawer)/indoor-map",
      params: { buildingCode },
    });
  };

  return (
    <View style={styles.container}>
      <IndoorMapContainer
        buildingCode={buildingCode ?? ""}
        routeSegments={nav.routeSegments}
        preferredFloorNumber={nav.start?.floor ?? null}
      />

      {/* arrow button */}
      <Pressable style={styles.backBtn} onPress={handleBack}>
        <Ionicons
          name="arrow-back"
          size={24}
          color={COLORS.maroon}
        />
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 6,
  },
});