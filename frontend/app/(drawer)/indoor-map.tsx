import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { DrawerActions } from "@react-navigation/native";
import IndoorMapContainer from "@/components/indoor/IndoorMapContainer";
import { MenuIcon } from "../icons";
import { COLORS } from "../constants";

export default function IndoorMapPage() {
  const navigation = useNavigation();
  const params = useLocalSearchParams<{
    buildingCode?: string;
  }>();

  const buildingCode = params.buildingCode || "H";

  const handleMenuPress = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <MenuIcon onPress={handleMenuPress} color={COLORS.maroon} />
      </View>

      <IndoorMapContainer buildingCode={buildingCode} />
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
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
});